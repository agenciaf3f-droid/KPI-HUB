// GET /api/transcrever  (header: Authorization: Bearer <TRANSCRICAO_SECRET>)
//
// Devolve a transcrição de áudio e vídeo que o n8n fazia e o webhook próprio não
// herdou: até 13/07 as mídias chegavam com texto na coluna `Mensagem`; depois do
// corte, zero. Este worker recompõe isso, sem tocar no webhook.
//
// Por que um worker separado, e não dentro do uazapi-hook: transcrever leva
// segundos e a UAZAPI faz retry em webhook lento — repetir demais derruba a
// assinatura. Aqui a mensagem já está gravada; o texto entra depois.
//
// Quem chama é o pg_cron do Supabase (mesmo padrão dos jobs `publicar-posts` e
// `limpar-midia-publicada`), porque a conta Vercel é Hobby e o cron de lá roda
// uma vez por dia.
//
// A mídia do WhatsApp vem criptografada (.enc + mediaKey). Decifra-se com
// HKDF-SHA256 + AES-256-CBC — não precisa de token da UAZAPI. A URL vale ~30
// dias, então processar minutos depois é seguro.
import crypto from "node:crypto";

import { sendJson } from "./_lib.js";

const LOTE_PADRAO = 6;          // cabe nos 60s de função do plano Hobby
const MAX_TENTATIVAS = 3;
const MAX_BYTES = 20 * 1024 * 1024;  // a API aceita 25 MB; folga para o multipart
const MODELO = "gpt-4o-mini-transcribe";  // mais barato: US$ 0,003/min

/** Info string do HKDF muda por tipo de mídia — errar aqui gera lixo, não erro. */
const INFO_POR_TIPO = {
  ptt: "WhatsApp Audio Keys",
  audio: "WhatsApp Audio Keys",
  video: "WhatsApp Video Keys",
};

function rest(url, key, caminho, init = {}) {
  return fetch(`${url}/rest/v1/${caminho}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/** Decifra a mídia do WhatsApp. Devolve o arquivo pronto para a API. */
async function baixarEDecifrar(conteudo, mediaType) {
  const info = INFO_POR_TIPO[mediaType];
  if (!info) throw new Error(`tipo de mídia sem chave conhecida: ${mediaType}`);
  if (!conteudo?.URL || !conteudo?.mediaKey) throw new Error("payload sem URL ou mediaKey");

  const resposta = await fetch(conteudo.URL, { signal: AbortSignal.timeout(20000) });
  if (!resposta.ok) throw new Error(`download ${resposta.status}`);
  const cifrado = Buffer.from(await resposta.arrayBuffer());
  if (cifrado.length > MAX_BYTES) throw new Error(`mídia grande demais: ${cifrado.length} bytes`);
  if (cifrado.length <= 10) throw new Error("mídia vazia");

  const expandido = Buffer.from(
    crypto.hkdfSync("sha256", Buffer.from(conteudo.mediaKey, "base64"), Buffer.alloc(32), Buffer.from(info), 112),
  );
  const iv = expandido.subarray(0, 16);
  const chave = expandido.subarray(16, 48);
  // Os 10 bytes finais são o MAC, não fazem parte do arquivo.
  const decifrador = crypto.createDecipheriv("aes-256-cbc", chave, iv);
  return Buffer.concat([decifrador.update(cifrado.subarray(0, cifrado.length - 10)), decifrador.final()]);
}

async function transcrever(arquivo, mimetype, mediaType) {
  const ehVideo = mediaType === "video";
  const nome = ehVideo ? "midia.mp4" : "midia.ogg";
  const tipo = ehVideo ? "video/mp4" : (mimetype || "audio/ogg").split(";")[0];

  const form = new FormData();
  form.append("file", new Blob([arquivo], { type: tipo }), nome);
  form.append("model", MODELO);
  form.append("language", "pt");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`openai ${r.status}: ${JSON.stringify(corpo)?.slice(0, 160)}`);
  const texto = String(corpo?.text ?? "").trim();
  if (!texto) throw new Error("openai devolveu texto vazio");
  return texto;
}

async function registrarFalha(url, key, messageId, erro) {
  const atual = await rest(url, key, `transcricao_falhas?select=tentativas&message_id=eq.${encodeURIComponent(messageId)}`)
    .then((r) => r.json())
    .catch(() => []);
  const tentativas = (atual?.[0]?.tentativas ?? 0) + 1;
  await rest(url, key, "transcricao_falhas", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ message_id: messageId, tentativas, ultimo_erro: String(erro).slice(0, 400), atualizado_em: new Date().toISOString() }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  const esperado = process.env.TRANSCRICAO_SECRET;
  const recebido = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  // 404 e não 401: não confirma que a rota existe (igual ao uazapi-hook).
  if (!esperado || recebido !== esperado) return sendJson(res, 404, { error: "not found" });

  const url = process.env.SUPABASE_DATA_URL;
  const key = process.env.SUPABASE_DATA_SERVICE_KEY;
  const tabela = process.env.SUPABASE_DATA_TABLE || "Controle de Mensagens";
  if (!url || !key || !process.env.OPENAI_API_KEY) return sendJson(res, 500, { error: "env não configurada" });

  const lote = Math.min(Number(new URL(req.url, "http://x").searchParams.get("lote")) || LOTE_PADRAO, 25);
  // "Só daqui pra frente": recuar esta data é o botão de backfill.
  //
  // A coluna `Horário` é `timestamp without time zone` gravada em horário de
  // Brasília, e a env vem em UTC. Comparar direto abriria uma janela cega de
  // 3 horas — nada seria transcrito nesse intervalo. `sv-SE` devolve no
  // formato "YYYY-MM-DD HH:mm:ss", que é o que o PostgREST espera.
  const desdeUtc = process.env.TRANSCRICAO_DESDE || new Date().toISOString();
  const desde = new Date(desdeUtc).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" });

  // Fila: mídia sem texto (vazio ou só o 🔊 que a origem grava como placeholder).
  const alvo =
    `${encodeURIComponent(tabela)}?select=message_id,"Tipo","Horário"` +
    `&Tipo=in.(%22%C3%81udio%22,%22V%C3%ADdeo%22)` +
    `&or=(Mensagem.is.null,Mensagem.eq.,Mensagem.eq.%F0%9F%94%8A%20%F0%9F%94%8A%20%F0%9F%94%8A)` +
    `&Hor%C3%A1rio=gte.${encodeURIComponent(desde)}` +
    `&message_id=not.is.null&order=Hor%C3%A1rio.desc&limit=${lote * 3}`;

  const pendentes = await rest(url, key, alvo).then((r) => r.json()).catch(() => []);
  if (!Array.isArray(pendentes) || !pendentes.length) return sendJson(res, 200, { ok: true, fila: 0 });

  // Tira quem já estourou as tentativas.
  const ids = pendentes.map((p) => p.message_id);
  const falhas = await rest(url, key, `transcricao_falhas?select=message_id,tentativas&message_id=in.(${ids.map((i) => `"${i}"`).join(",")})`)
    .then((r) => r.json())
    .catch(() => []);
  const desistidos = new Set((falhas ?? []).filter((f) => f.tentativas >= MAX_TENTATIVAS).map((f) => f.message_id));
  const fila = pendentes.filter((p) => !desistidos.has(p.message_id)).slice(0, lote);

  let feitas = 0;
  const erros = [];
  for (const item of fila) {
    const id = item.message_id;
    try {
      const cru = await rest(url, key, `uazapi_raw?select=payload&payload->message->>messageid=eq.${encodeURIComponent(id)}&limit=1`)
        .then((r) => r.json());
      const msg = cru?.[0]?.payload?.message;
      if (!msg) throw new Error("payload não encontrado em uazapi_raw");

      const arquivo = await baixarEDecifrar(msg.content, msg.mediaType);
      const texto = await transcrever(arquivo, msg.content?.mimetype, msg.mediaType);

      const gravou = await rest(url, key, `${encodeURIComponent(tabela)}?message_id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ Mensagem: texto }),
      });
      if (!gravou.ok) throw new Error(`patch ${gravou.status}: ${(await gravou.text()).slice(0, 120)}`);
      feitas++;
    } catch (e) {
      const erro = String(e?.message ?? e);
      erros.push({ id, erro: erro.slice(0, 120) });
      await registrarFalha(url, key, id, erro);
    }
  }

  return sendJson(res, 200, { ok: true, fila: fila.length, transcritas: feitas, erros });
}
