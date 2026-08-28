import { NextResponse } from "next/server";

import { getPanelAccess } from "@/lib/panels";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marcação manual do relatório semanal (aba Relatórios do painel do gestor).
 *
 * A cobrança é derivada das mensagens, e duas situações não aparecem lá: o
 * relatório entregue por outro canal ('enviado') e a semana em que aquele grupo
 * não precisava de relatório ('nao_precisa'). Esta rota guarda essas marcações.
 *
 * Permissão de escrita: só o gestor do próprio grupo, ou admin. O gestor do
 * grupo não vem do cliente — é lido de `Controle de Mensagens` aqui, senão
 * bastaria forjar o corpo do POST para marcar o grupo dos outros.
 */

const STATUS_VALIDOS = ["enviado", "nao_precisa"];
// Por que conta como enviado. Não são status: para a cobrança e para o gráfico
// as três significam a mesma coisa, muda só o porquê.
const MOTIVOS_VALIDOS = ["manual", "dashboard", "reuniao"];

/**
 * Mesmo formato de `normalizeGroupId()` no motor: só a parte numérica.
 *
 * Na tabela o MESMO grupo aparece com dois valores — "1203634...-group" e
 * "1203634...@g.us" —, por isso o motor guarda só os dígitos e a busca aqui é
 * por prefixo. Devolve "" se não sobrar um id plausível, o que também impede
 * que "%" ou "_" vindos do corpo do POST virem curinga no LIKE.
 */
function normalizaGrupoId(raw: string) {
  const so = String(raw ?? "").split("@")[0].replace(/\D/g, "");
  return so.length >= 10 ? so : "";
}

export async function GET() {
  try {
    const acesso = await getPanelAccess();
    if (!acesso?.panels.includes("gestor")) {
      return NextResponse.json({ error: "Sem acesso ao painel do gestor." }, { status: 403 });
    }

    const { data, error } = await createAdminClient()
      .from("gestor_relatorio_marcacoes")
      .select("grupo_id, semana, status, motivo, marcado_nome, atualizado_em");
    if (error) throw error;

    return NextResponse.json({ marcacoes: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const acesso = await getPanelAccess();
    if (!acesso?.panels.includes("gestor")) {
      return NextResponse.json({ error: "Sem acesso ao painel do gestor." }, { status: 403 });
    }

    const body = await request.json();
    const grupoId = normalizaGrupoId(body.grupoId);
    const semana = String(body.semana ?? "").trim();
    // status vazio/null = desfazer a marcação.
    const status = body.status == null || body.status === "" ? null : String(body.status);
    const motivo = body.motivo == null || body.motivo === "" ? null : String(body.motivo);

    if (!grupoId || !/^\d{4}-W\d{2}$/.test(semana)) {
      return NextResponse.json({ error: "Informe grupoId e semana (formato 2026-W35)." }, { status: 400 });
    }
    if (status !== null && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    if (motivo !== null && !MOTIVOS_VALIDOS.includes(motivo)) {
      return NextResponse.json({ error: "Motivo inválido." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Quem é o gestor deste grupo? Vale a linha mais recente: cliente trocado de
    // gestor passa a ser do novo, e é ele quem responde pelo relatório da semana.
    if (!acesso.isAdmin) {
      const { data: linha, error: erroGrupo } = await admin
        .from("Controle de Mensagens")
        .select("Gestor")
        .like("Grupo", `${grupoId}%`)
        .order("Horário", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (erroGrupo) throw erroGrupo;

      const gestorDoGrupo = String(linha?.Gestor ?? "").trim();
      const eu = String(acesso.gestorName ?? "").trim();
      if (!eu || !gestorDoGrupo || eu.toLowerCase() !== gestorDoGrupo.toLowerCase()) {
        return NextResponse.json(
          { error: "Só o gestor deste grupo (ou um admin) pode marcar o relatório." },
          { status: 403 },
        );
      }
    }

    if (status === null) {
      const { error } = await admin
        .from("gestor_relatorio_marcacoes")
        .delete()
        .eq("grupo_id", grupoId)
        .eq("semana", semana);
      if (error) throw error;
      return NextResponse.json({ ok: true, removido: true });
    }

    // upsert na chave (grupo_id, semana): marcar de novo troca o status em vez
    // de duplicar, e dois gestores clicando junto não geram linha dupla.
    const { error } = await admin
      .from("gestor_relatorio_marcacoes")
      .upsert(
        {
          grupo_id: grupoId,
          semana,
          status,
          // Motivo só faz sentido em 'enviado'; em 'nao_precisa' fica nulo.
          motivo: status === "enviado" ? motivo : null,
          marcado_por: acesso.memberId ?? null,
          marcado_nome: acesso.fullName ?? acesso.gestorName ?? acesso.email,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "grupo_id,semana" },
      );
    if (error) throw error;

    return NextResponse.json({ ok: true, status, motivo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
