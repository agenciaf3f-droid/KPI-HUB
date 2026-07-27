import { notFound } from "next/navigation";
import { MetricsDashboard } from "@/app/metricas/page";
import { hasAdminLinkAccess } from "@/lib/admin-access";
import { getMonitoringOrganizationId, loadActiveTimers } from "@/lib/deliveries";
import { loadOrganizationGamification } from "@/lib/gamification";

export default async function AdminAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasAdminLinkAccess(token)) notFound();

  const basePath = `/a/${token}`;
  const organizationId = await getMonitoringOrganizationId();
  const activeTimers = organizationId ? await loadActiveTimers(organizationId) : [];
  const gamification = organizationId ? await loadOrganizationGamification(organizationId) : undefined;
  return <MetricsDashboard fullName="Agência F3F" role="admin" metricsHref={basePath} accountHref={null} showQueue={false} activeTimers={activeTimers} gamification={gamification} realtimeTopic={organizationId ? `creator-monitor:${organizationId}` : undefined} adminAccessToken={token} />;
}
