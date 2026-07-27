import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { EditorWorkspace } from "@/components/editor-workspace";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Controle de Edições · KPI F3F" };

export default async function EditorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("editor")) redirect("/");

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="editor" fullName={acesso.editorName ?? acesso.email} panels={acesso.panels} />
      <EditorWorkspace currentEditor={acesso.editorName ?? "Admin"} isAdmin={acesso.isAdmin} />
    </div>
  );
}
