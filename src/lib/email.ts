import "server-only";

/**
 * E-mails transacionais do hub, via Resend.
 *
 * Os templates do Supabase saem em inglês e com a marca deles; como o convite
 * é a primeira coisa que a pessoa recebe da agência, mandamos o nosso.
 * Sem a chave configurada a função devolve `false` — quem chama decide se isso
 * é um erro (o convite em si não depende do e-mail).
 */
const REMETENTE = "KPI F3F <kpi@agenciaf3f.com.br>";
const HUB_URL = "https://kpis.agenciaf3f.com.br";

async function enviar(para: string, assunto: string, html: string): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return false;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: REMETENTE, to: [para], subject: assunto, html }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function moldura(titulo: string, corpo: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b5cf6;font-weight:700;">Agência F3F</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827;">${titulo}</h1>
          ${corpo}
          <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;">Se você não esperava este e-mail, pode ignorá-lo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const BOTAO = (href: string, texto: string) =>
  `<a href="${href}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px;">${texto}</a>`;

/** Convite com senha definida pelo admin: a pessoa já pode entrar. */
export function emailConviteComSenha(para: string, nome: string, senha: string) {
  return enviar(
    para,
    "Seu acesso ao KPI F3F",
    moldura(`Bem-vindo(a), ${nome}!`, `
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">Sua conta no painel de KPIs da agência está pronta. Entre com os dados abaixo:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
        <tr><td style="font-size:14px;color:#374151;line-height:1.9;">
          <strong>E-mail:</strong> ${para}<br>
          <strong>Senha:</strong> <code style="background:#ede9fe;padding:2px 8px;border-radius:6px;font-size:14px;">${senha}</code>
        </td></tr>
      </table>
      <p style="margin:0 0 24px;">${BOTAO(HUB_URL, "Acessar o painel")}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Depois de entrar, troque a senha em <strong>Minha conta</strong> (é o seu avatar, no canto da barra lateral).</p>
    `),
  );
}

/** Convite sem senha: a pessoa cria a própria pelo link. */
export function emailConviteComLink(para: string, nome: string, link: string) {
  return enviar(
    para,
    "Seu convite para o KPI F3F",
    moldura(`Bem-vindo(a), ${nome}!`, `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">Você foi convidado(a) para o painel de KPIs da agência. Crie sua senha para entrar:</p>
      <p style="margin:0 0 24px;">${BOTAO(link, "Criar minha senha")}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all;color:#8b5cf6;">${link}</span></p>
    `),
  );
}
