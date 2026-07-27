import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!token || !fullName || !email || password.length < 8) {
      return NextResponse.json({ error: "Preencha todos os campos. A senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from("creator_team_invites")
      .select("id, organization_id, role, expires_at, claimed_at")
      .eq("token", token)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite || invite.claimed_at || new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Este convite não está mais disponível." }, { status: 410 });
    }

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError || !userData.user) throw userError ?? new Error("Não foi possível criar a conta.");

    const { error: profileError } = await admin.from("creator_profiles").insert({
      id: userData.user.id,
      organization_id: invite.organization_id,
      full_name: fullName,
      role: "designer",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userData.user.id);
      throw profileError;
    }

    const { data: claimed, error: claimError } = await admin
      .from("creator_team_invites")
      .update({ claimed_at: new Date().toISOString(), claimed_by: userData.user.id })
      .eq("id", invite.id)
      .is("claimed_at", null)
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) {
      await admin.from("creator_profiles").delete().eq("id", userData.user.id);
      await admin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: "Este convite acabou de ser utilizado." }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível concluir seu cadastro." },
      { status: 500 },
    );
  }
}
