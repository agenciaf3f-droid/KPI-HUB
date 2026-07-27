import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { GestorApp } from "@/components/gestor/gestor-app";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Gestor · KPI F3F" };

/**
 * Aba Gestor — código do Dash-Gestores integrado como módulo do app
 * (src/components/gestor/): mesmo motor de trilhas, mesmos gráficos, mesmas
 * 3 sub-abas (Relatórios/NPS/Churn). Sem tela de login própria: o login é um
 * só, o do hub — este RSC garante a sessão antes de renderizar.
 */
export default async function GestorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("gestor")) redirect("/");

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="gestor" fullName={acesso.gestorName ?? acesso.email} panels={acesso.panels} />
      <GestorApp />
    </div>
  );
}
