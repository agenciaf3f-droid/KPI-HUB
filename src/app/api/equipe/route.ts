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
    const isAdmin = body.isAdmin === true;
    let areas = Array.isArray(body.areas)
      ? body.areas.filter((a: unknown): a is string => typeof a === "string" && AREAS_VALIDAS.includes(a))
      : [];
    // Admin vê tudo — se nenhuma área veio marcada, ganha as três.
    if (isAdmin && !areas.length) areas = [...AREAS_VALIDAS];

    if (!nome || !email.includes("@") || !areas.length) {
      return NextResponse.json({ error: "Preencha nome, e-mail e ao menos uma área (ou marque Admin)." }, { status: 400 });
    }
    // Senha em branco = convite por e-mail do próprio Supabase.
    if (senha && senha.length < 6) {
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
    let linkConvite: string | null = null;

    if (!user) {
      if (senha) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { full_name: nome },
        });
        if (createError || !created.user) throw createError ?? new Error("Não foi possível criar a conta.");
        user = created.user;
      } else {
        // Sem senha: link de convite do próprio Supabase (generateLink cria a
        // conta e devolve a URL — o admin manda por WhatsApp). E-mail automático
        // não rola: sem SMTP próprio o Supabase só entrega para o time do projeto.
        const { data: invited, error: inviteError } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: { full_name: nome },
            redirectTo: `${new URL(request.url).origin}/definir-senha`,
          },
        });
        if (inviteError || !invited.user) throw inviteError ?? new Error("Não foi possível gerar o convite.");
        user = invited.user;
        linkConvite = invited.properties?.action_link ?? null;
      }
      contaNova = true;
    }

    const { error: memberError } = await admin
      .from("hub_members")
      .insert({ user_id: user.id, email, nome, areas, is_admin: isAdmin });
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

    return NextResponse.json({ ok: true, contaNova, linkConvite });
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
      .select("id, email, is_admin")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!membro) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    // Com vários admins, admin remove admin — menos a conta raiz da agência
    // e a si mesmo (para nunca zerar o acesso à aba Equipe).
    if (membro.email === "agenciaf3f@gmail.com") {
      return NextResponse.json({ error: "A conta da agência não pode ser removida." }, { status: 400 });
    }
    if (membro.id === acesso.memberId) {
      return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
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
