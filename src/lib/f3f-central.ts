import { createClient } from "@/lib/supabase/client";

// Login central F3F: este app JÁ autentica no Supabase central (Agenciaf3f) —
// a credencial daqui é a senha única F3F. Estes helpers cobrem o que falta:
// checar se o acesso continua ativo (f3f_logins) e propagar troca de senha
// pro espelho do Console.Ads (projeto csfpq, sincronizado pela edge central).

// Consulta a edge f3f-auth-check (mesmo projeto) com o JWT do próprio usuário.
// Retorna "desativado" | "ok". Fail-open: erro de infra ou usuário legado sem
// linha em f3f_logins não bloqueia (só desativação explícita derruba).
export async function checkHubAccess(): Promise<"ok" | "desativado"> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("f3f-auth-check", {
      body: { system: "hub" },
    });
    if (error || !data) return "ok";
    if (data.allowed === false && data.reason === "desativado") return "desativado";
    return "ok";
  } catch {
    return "ok";
  }
}

// Propaga a senha recém-definida pro espelho do Console.Ads via edge
// f3f-auth-set-password (ela regrava no central — idempotente — e sincroniza
// o espelho). Best-effort: a troca local já aconteceu; falha aqui só loga.
export async function syncPasswordMirror(password: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.functions.invoke("f3f-auth-set-password", {
      body: { password },
    });
    if (error) console.error("[f3f-central] sync espelho falhou:", error.message);
  } catch (err) {
    console.error("[f3f-central] sync espelho falhou:", err);
  }
}
