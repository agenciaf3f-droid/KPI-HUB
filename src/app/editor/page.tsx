import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { EditorWorkspace } from "@/components/editor-workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Controle de Edições · KPI F3F" };

export default async function EditorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("editor")) redirect("/");

  // Mesma query do useVideoEdits, só que no servidor: a tela abre pintada e o
  // client refaz a busca apenas quando uma mutation invalida o cache.
  const { data: initialEdits } = await createAdminClient()
    .schema("controle_edicao")
    .from("video_edits")
    .select("*")
    .order("edit_date", { ascending: false });

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="editor" fullName={acesso.fullName ?? acesso.editorName ?? acesso.email} panels={acesso.panels} isAdmin={acesso.isAdmin} avatarUrl={acesso.avatarUrl} />
      <EditorWorkspace currentEditor={acesso.editorName ?? "Admin"} isAdmin={acesso.isAdmin} initialEdits={initialEdits ?? []} />
    </div>
  );
}
