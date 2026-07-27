"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true; avatarUrl?: string | null } | { ok: false; error: string };

const TIPOS_DE_FOTO: Record<string, true> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};
const FOTO_MAX_BYTES = 3 * 1024 * 1024;

/** Sessão atual — identidade nunca vem do client. */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
}

export async function salvarPerfil(nomeNovo: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada — faça login de novo." };

  const nome = nomeNovo.trim();
  if (nome.length < 2) return { ok: false, error: "O nome precisa de ao menos 2 caracteres." };

  const admin = createAdminClient();
  const { data: membro } = await admin
    .from("hub_members")
    .select("id, nome, areas")
    .eq("email", user.email)
    .maybeSingle();

  const nomeAntigo = membro?.nome ?? null;

  await admin.auth.admin.updateUserById(user.id, { user_metadata: { full_name: nome } });

  if (membro) {
    const { error } = await admin.from("hub_members").update({ nome }).eq("id", membro.id);
    if (error) return { ok: false, error: "Não foi possível salvar o nome." };
  }

  const { data: perfil } = await admin
    .from("creator_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil) {
    await admin.from("creator_profiles").update({ full_name: nome }).eq("id", user.id);
  }

  // As edições do painel de Vídeo são ligadas por TEXTO (video_edits.editor_name,
  // sem FK): renomear sem propagar órfã tudo que a pessoa já entregou.
  if (membro?.areas?.includes("editor") && nomeAntigo && nomeAntigo !== nome) {
    const { error } = await admin
      .schema("controle_edicao")
      .from("video_edits")
      .update({ editor_name: nome })
      .eq("editor_name", nomeAntigo);
    if (error) return { ok: false, error: "Nome salvo, mas falhou ao renomear as edições antigas. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function trocarFoto(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada — faça login de novo." };

  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { ok: false, error: "Escolha uma imagem." };
  if (!TIPOS_DE_FOTO[foto.type]) return { ok: false, error: "Use JPG, PNG ou WebP." };
  if (foto.size > FOTO_MAX_BYTES) return { ok: false, error: "A foto pode ter no máximo 3MB." };

  const admin = createAdminClient();
  const { data: membro } = await admin
    .from("hub_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!membro) return { ok: false, error: "Sua conta ainda não está na equipe do hub." };

  const corpo = Buffer.from(await foto.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(user.id, corpo, { upsert: true, contentType: foto.type });
  if (uploadError) return { ok: false, error: "Não foi possível enviar a foto." };

  // ?v= fura o cache do navegador quando a foto troca (o caminho é fixo).
  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(user.id);
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error } = await admin.from("hub_members").update({ avatar_url: avatarUrl }).eq("id", membro.id);
  if (error) return { ok: false, error: "Foto enviada, mas falhou ao salvar no perfil." };

  revalidatePath("/", "layout");
  return { ok: true, avatarUrl };
}

export async function removerFoto(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Sessão expirada — faça login de novo." };

  const admin = createAdminClient();
  const { data: membro } = await admin
    .from("hub_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!membro) return { ok: false, error: "Sua conta ainda não está na equipe do hub." };

  await admin.storage.from("avatars").remove([user.id]);
  const { error } = await admin.from("hub_members").update({ avatar_url: null }).eq("id", membro.id);
  if (error) return { ok: false, error: "Não foi possível remover a foto." };

  revalidatePath("/", "layout");
  return { ok: true, avatarUrl: null };
}
