import { AppHeader } from "@/components/app-header";
import { ProductionWorkspace } from "@/components/production-workspace";
import { getCurrentProfile } from "@/lib/auth";
import { loadDeliveries } from "@/lib/deliveries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export default async function Home() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const deliveries = await loadDeliveries(profile);

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader fullName={profile.full_name} />
      <ProductionWorkspace initialCapacity={[]} initialDeliveries={deliveries} role={profile.role} fullName={profile.full_name} realtimeTopic={`creator-monitor:${profile.organization_id}`} />
    </div>
  );
}
