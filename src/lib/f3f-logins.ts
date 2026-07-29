import type { SupabaseClient } from "@supabase/supabase-js";

// Registro na tabela central de acessos (public.f3f_logins, este mesmo banco).
// Toda rota que cria membro (equipe, convite, setup) chama isto logo após o
// createUser — é o que torna a pessoa visível/desativável no painel central.
// Best-effort: falha aqui não desfaz o provisionamento (a linha pode ser
// recriada depois), mas fica logada.
export async function registerF3fLogin(
  admin: SupabaseClient,
  { userId, email }: { userId: string; email: string },
): Promise<void> {
  const { error } = await admin.from("f3f_logins").upsert(
    {
      auth_user_id: userId,
      email: email.toLowerCase(),
      system: "hub",
      external_user_id: userId,
      active: true,
    },
    { onConflict: "email,system" },
  );
  if (error) console.error("[f3f-logins] upsert falhou:", email, error.message);
}
