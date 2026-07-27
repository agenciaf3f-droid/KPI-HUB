import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Ponte de sessão hub → dashboard do gestor.
 *
 * O dashboard.html (vanilla, portado do Dash-Gestores) guarda sessão própria em
 * localStorage via supabase-js; o hub guarda em cookies via @supabase/ssr. Os
 * formatos não se enxergam, então sem esta ponte o dashboard pedia um segundo
 * login. Aqui o navegador troca o cookie do hub pelos tokens da MESMA sessão e
 * o dashboard chama `auth.setSession()` — um login só.
 *
 * Só devolve os tokens do próprio dono da sessão (cookie same-origin); sem
 * sessão, 401. Nenhum privilégio novo é concedido.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session) {
    return NextResponse.json({ error: "sem sessão" }, { status: 401 });
  }
  return NextResponse.json(
    { access_token: session.access_token, refresh_token: session.refresh_token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
