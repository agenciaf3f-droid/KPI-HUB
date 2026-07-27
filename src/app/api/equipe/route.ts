import { NextResponse } from "next/server";

import { getPanelAccess } from "@/lib/panels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const AREAS_VALIDAS = ["gestor", "editor", "creator"];

/**
 * Gestão de membros do hub (aba Equipe, admin-only).
 *
 * Convite sem e-mail de propósito: não há SMTP configurado no projeto. O admin
 * define a senha inicial no form e repassa; o membro troca depois em /conta.
 */
export async function POST(request: Request) {
  try {
    const acesso = await getPanelAccess();
    if (!acesso?.isAdmin) {
      return NextResponse.json({ error: "Apenas o admin pode gerenciar a equipe." }, { status: 403 });
    }

    const body = await request.json();
    const nome = String(body.nome ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const senha = String(body.senha ?? "");
    const areas = Array.isArray(body.areas)
      ? body.areas.filter((a: unknown): a is string => typeof a === "string" && AREAS_VALIDAS.includes(a))
      : [];

    if (!nome || !email.includes("@") || !areas.length) {
      return NextResponse.json({ error: "Preencha nome, e-mail e ao menos uma área." }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "A senha inicial precisa de ao menos 6 caracteres." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: jaMembro, error: dupError } = await admin
      .from("hub_members")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (dupError) throw dupError;
    if (jaMembro) {
      return NextResponse.json({ error: "Este e-mail já é membro da equipe." }, { status: 409 });
    }

    // Conta pode já existir (ex.: e-mails antigos do Supabase) — nesse caso só
    // concede o acesso, sem tocar na senha atual da pessoa.
    const { data: lista, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    let user = lista.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
    let contaNova = false;

    if (!user) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome },
      });
      if (createError || !created.user) throw createError ?? new Error("Não foi possível criar a conta.");
      user = created.user;
      contaNova = true;
    }

    const { error: memberError } = await admin
      .from("hub_members")
      .insert({ user_id: user.id, email, nome, areas });
    if (memberError) {
      if (contaNova) await admin.auth.admin.deleteUser(user.id);
      throw memberError;
    }

    // Área creator: o painel exige linha em creator_profiles (getCurrentProfile
    // redireciona sem ela). Mesmo padrão do /api/invites/accept.
    if (areas.includes("creator")) {
      const { data: perfil } = await admin
        .from("creator_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!perfil) {
        const supabase = await createClient();
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        const { data: adminProfile } = await admin
          .from("creator_profiles")
          .select("organization_id")
          .eq("id", adminUser?.id ?? "")
          .maybeSingle();
        if (!adminProfile) {
          await admin.from("hub_members").delete().eq("email", email);
          if (contaNova) await admin.auth.admin.deleteUser(user.id);
          return NextResponse.json({ error: "Não achei a organização do Creator para vincular o membro." }, { status: 500 });
        }
        const { error: profileError } = await admin.from("creator_profiles").insert({
          id: user.id,
          organization_id: adminProfile.organization_id,
          full_name: nome,
          role: "designer",
        });
        if (profileError) {
          await admin.from("hub_members").delete().eq("email", email);
          if (contaNova) await admin.auth.admin.deleteUser(user.id);
          throw profileError;
        }
      }
    }

    return NextResponse.json({ ok: true, contaNova });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível adicionar o membro." },
      { status: 500 },
    );
  }
}

/** Revoga o acesso: apaga só a linha de hub_members. Conta e perfis ficam. */
export async function DELETE(request: Request) {
  try {
    const acesso = await getPanelAccess();
    if (!acesso?.isAdmin) {
      return NextResponse.json({ error: "Apenas o admin pode gerenciar a equipe." }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "Informe o membro." }, { status: 400 });

    const admin = createAdminClient();
    const { data: membro, error: findError } = await admin
      .from("hub_members")
      .select("id, is_admin")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!membro) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    if (membro.is_admin) {
      return NextResponse.json({ error: "A conta admin da agência não pode ser removida." }, { status: 400 });
    }

    const { error: deleteError } = await admin.from("hub_members").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível remover o membro." },
      { status: 500 },
    );
  }
}
