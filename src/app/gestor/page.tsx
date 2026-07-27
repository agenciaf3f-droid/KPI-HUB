import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { GestorNativo } from "@/components/gestor-nativo";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Dashboard F3F · KPI F3F" };

/**
 * Painel do Gestor — o `dashboard.html` ORIGINAL do Dash-Gestores (5.697 linhas
 * de vanilla + Chart.js), servido de `public/` injetado direto na pagina da aba
 * (sem iframe). Ele fala com /api/leadtime e /api/config desta mesma
 * origem, então funciona idêntico ao app antigo.
 *
 * A cópia em public/ foi retintada: Inter → Poppins e o azul #0866ff → violeta
 * #8b5cf6 do Creator. Estrutura, gráficos e dados intactos.
 *
 * Portar as 5.697 linhas para React nativamente é o passo seguinte se você
 * quiser — este formato mantém tudo dentro do hub sem reescrever o monólito.
 */
export default async function GestorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("gestor")) redirect("/");

  return (
    <div className="flex min-h-svh flex-col bg-background md:pl-28">
      <AppHeader activeItem="gestor" fullName={acesso.gestorName ?? acesso.email} panels={acesso.panels} />
      <GestorNativo />
    </div>
  );
}
