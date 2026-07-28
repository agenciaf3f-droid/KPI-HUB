import { redirect } from "next/navigation";

import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Raiz do hub: manda cada pessoa para a primeira aba a que tem acesso,
 * na MESMA ordem da sidebar — Gestor, Vídeo (editor), Creator.
 * O login (visual do Creator, mantido) faz `router.replace("/")` e cai aqui.
 */
export default async function Home() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  // Convite ainda com a senha provisória: troca obrigatória antes de qualquer painel.
  if (acesso.senhaProvisoria) redirect("/definir-senha");

  if (acesso.panels.includes("gestor")) redirect("/gestor");
  if (acesso.panels.includes("editor")) redirect("/editor");
  if (acesso.panels.includes("creator")) redirect("/creator");
  // Sessão válida sem área nenhuma (removido da equipe, ou ainda sem área).
  // Mandar para /login criava um vai-e-volta: o login devolvia para cá.
  redirect("/sem-acesso");
}
