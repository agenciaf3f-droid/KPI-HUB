import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Tira a marca de senha provisória. Chamada logo depois de a pessoa definir a
 * senha nova — é o que libera os painéis (ver a guarda em `exigirSenhaPropria`).
 * Não recebe nada do cliente além da própria sessão.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sem sessão." }, { status: 401 });

  const { error } = await createAdminClient()
    .from("hub_members")
    .update({ senha_provisoria: false })
    .eq("email", user.email.trim().toLowerCase());
  if (error) return NextResponse.json({ error: "Não foi possível concluir." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
