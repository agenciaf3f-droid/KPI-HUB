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

  if (acesso.panels.includes("gestor")) redirect("/gestor");
  if (acesso.panels.includes("editor")) redirect("/editor");
  if (acesso.panels.includes("creator")) redirect("/creator");
  redirect("/login");
}
