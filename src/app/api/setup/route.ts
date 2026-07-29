import { NextResponse } from "next/server";
import { registerF3fLogin } from "@/lib/f3f-logins";
import { createAdminClient } from "@/lib/supabase/admin";

function validPassword(password: string) {
  return password.length >= 8;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim();
    const organizationName = "Agência F3F";
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!fullName || !email || !validPassword(password)) {
      return NextResponse.json({ error: "Preencha todos os campos. A senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError || !createdUser.user) {
      return NextResponse.json({ error: "Este e-mail já possui uma conta. Use outro e-mail para criar um acesso separado." }, { status: 409 });
    }
    const user = createdUser.user;

    const { data: existingOrganization, error: organizationLookupError } = await admin
      .from("creator_organizations")
      .select("id")
      .eq("name", organizationName)
      .maybeSingle();
    if (organizationLookupError) {
      await admin.auth.admin.deleteUser(user.id);
      throw organizationLookupError;
    }

    let organization = existingOrganization;
    let createdOrganization = false;
    if (!organization) {
      const { data, error: organizationError } = await admin
        .from("creator_organizations")
        .insert({ name: organizationName })
      .select("id")
      .single();
      if (organizationError || !data) {
        await admin.auth.admin.deleteUser(user.id);
        throw organizationError ?? new Error("Não foi possível criar a organização.");
      }
      organization = data;
      createdOrganization = true;
    }

    const { error: profileError } = await admin.from("creator_profiles").insert({
      id: user.id,
      organization_id: organization.id,
      full_name: fullName,
      role: "designer",
    });
    if (profileError) {
      if (createdOrganization) await admin.from("creator_organizations").delete().eq("id", organization.id);
      await admin.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    // Registra no login central F3F (f3f_logins, este mesmo banco).
    await registerF3fLogin(admin, { userId: user.id, email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível concluir a configuração." },
      { status: 500 },
    );
  }
}
