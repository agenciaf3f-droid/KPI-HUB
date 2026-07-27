import { AppHeader } from "@/components/app-header";
import { ProductionWorkspace } from "@/components/production-workspace";
import { getCurrentProfile } from "@/lib/auth";
import { loadDeliveries } from "@/lib/deliveries";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export const metadata = { title: "Creator · KPI F3F" };

export default async function CreatorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const [deliveries, acesso] = await Promise.all([loadDeliveries(profile), getPanelAccess()]);

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="creator" fullName={profile.full_name} panels={acesso?.panels ?? []} />
      <ProductionWorkspace initialCapacity={[]} initialDeliveries={deliveries} role={profile.role} fullName={profile.full_name} realtimeTopic={`creator-monitor:${profile.organization_id}`} />
    </div>
  );
}
