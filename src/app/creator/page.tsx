import { AppHeader } from "@/components/app-header";
import { MetricsSection } from "@/components/metrics-dashboard";
import { ProductionWorkspace } from "@/components/production-workspace";
import { getCurrentProfile } from "@/lib/auth";
import { deliveriesToTimers, loadDeliveries } from "@/lib/deliveries";
import { loadGamification } from "@/lib/gamification";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export const metadata = { title: "Creator · KPI F3F" };

// Mesma lógica do painel do Editor: primeira dobra opera (nova entrega + fila),
// o resto da página é o KPI do Creator (timers, gamificação, indicadores).
export default async function CreatorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const [deliveries, acesso, gamification] = await Promise.all([
    loadDeliveries(profile),
    getPanelAccess(),
    loadGamification(profile),
  ]);
  // Timers derivados das deliveries já carregadas — antes era uma SEGUNDA carga
  // completa da organização só para filtrar quem tem cronômetro ativo.
  const activeTimers = deliveriesToTimers(deliveries);

  const timersVisiveis =
    profile.role === "admin"
      ? activeTimers
      : activeTimers.filter((timer) => timer.assigneeName === profile.full_name);

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="creator" fullName={profile.full_name} panels={acesso?.panels ?? []} isAdmin={acesso?.isAdmin ?? false} avatarUrl={acesso?.avatarUrl} />
      <ProductionWorkspace initialCapacity={[]} initialDeliveries={deliveries} role={profile.role} fullName={profile.full_name} realtimeTopic={`creator-monitor:${profile.organization_id}`} />
      <MetricsSection role={profile.role} activeTimers={timersVisiveis} gamification={gamification} realtimeTopic={`creator-monitor:${profile.organization_id}`} />
    </div>
  );
}
