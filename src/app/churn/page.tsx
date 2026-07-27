import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { GestorApp } from "@/components/gestor/gestor-app";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Churn · KPI F3F" };

/**
 * Aba Churn — a seção Churn do dashboard do gestor como aba própria da sidebar.
 * Mesmo código, mesma base de mensagens (o gráfico de risco e o churn mensal
 * dependem dela); só a navegação muda: entra direto na seção, sem o seletor
 * interno. Acesso: mesmo painel do gestor.
 */
export default async function ChurnPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("gestor")) redirect("/");

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="churn" fullName={acesso.gestorName ?? acesso.email} panels={acesso.panels} />
      <GestorApp churnOnly />
    </div>
  );
}
