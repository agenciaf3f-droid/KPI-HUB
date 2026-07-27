import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfile } from "@/lib/auth";
import type { ActiveDeliveryTimer, Delivery, DeliveryStatus } from "@/lib/types";

type DeliveryRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  delivery_type_id: string;
  quantity: number;
  title: string;
  assignee_id: string;
  status: DeliveryStatus;
  priority: Delivery["priority"];
  due_at: string | null;
  reference_url: string | null;
  delivery_url: string | null;
  notes: string | null;
  estimate_minutes: number | null;
  effort_points: number | null;
  adjustment_count: number;
};

type SessionRow = { delivery_id: string; started_at: string; ended_at: string | null; duration_seconds: number | null };

export async function loadDeliveries(profile: AppProfile): Promise<Delivery[]> {
  const admin = createAdminClient();
  let query = admin
    .from("creator_deliveries")
    .select("id, client_id, project_id, delivery_type_id, quantity, title, assignee_id, status, priority, due_at, reference_url, delivery_url, notes, estimate_minutes, effort_points, adjustment_count")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });
  if (profile.role === "designer") query = query.eq("assignee_id", profile.id);
  const { data, error } = await query;
  if (error) throw error;
  return mapDeliveries((data ?? []) as DeliveryRow[]);
}

export async function loadActiveTimers(organizationId: string): Promise<ActiveDeliveryTimer[]> {
  const deliveries = await loadOrganizationDeliveries(organizationId);
  return deliveries
    .filter((delivery) => delivery.activeSessionStartedAt)
    .map((delivery) => ({
      deliveryId: delivery.id,
      startedAt: delivery.activeSessionStartedAt!,
      baseSeconds: delivery.activeSecondsAccumulated,
      clientName: delivery.clientName,
      deliveryType: delivery.deliveryType,
      title: delivery.title,
      assigneeName: delivery.assigneeName,
      designerColor: delivery.assigneeColor ?? "#8B5CF6",
    }));
}

export async function getMonitoringOrganizationId() {
  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("creator_organizations")
    .select("id")
    .eq("name", "Agência F3F")
    .limit(1)
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (organization?.id) return organization.id;

  const { data, error } = await admin
    .from("creator_profiles")
    .select("organization_id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.organization_id) return data.organization_id;
  return null;
}

export async function loadOrganizationDeliveries(organizationId: string): Promise<Delivery[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("creator_deliveries")
    .select("id, client_id, project_id, delivery_type_id, quantity, title, assignee_id, status, priority, due_at, reference_url, delivery_url, notes, estimate_minutes, effort_points, adjustment_count")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapDeliveries((data ?? []) as DeliveryRow[]);
}

async function mapDeliveries(rows: DeliveryRow[]): Promise<Delivery[]> {
  if (!rows.length) return [];
  const admin = createAdminClient();
  const deliveryIds = rows.map((row) => row.id);
  const clientIds = [...new Set(rows.map((row) => row.client_id))];
  const typeIds = [...new Set(rows.map((row) => row.delivery_type_id))];
  const assigneeIds = [...new Set(rows.map((row) => row.assignee_id))];
  const [clients, types, profiles, sessions] = await Promise.all([
    admin.from("creator_clients").select("id, name").in("id", clientIds),
    admin.from("creator_delivery_types").select("id, name").in("id", typeIds),
    admin.from("creator_profiles").select("id, full_name, designer_color").in("id", assigneeIds),
    admin.from("creator_time_sessions").select("delivery_id, started_at, ended_at, duration_seconds").in("delivery_id", deliveryIds),
  ]);
  for (const response of [clients, types, profiles, sessions]) if (response.error) throw response.error;
  const clientNames = new Map((clients.data ?? []).map((item) => [item.id, item.name]));
  const typeNames = new Map((types.data ?? []).map((item) => [item.id, item.name]));
  const assigneeProfiles = new Map((profiles.data ?? []).map((item) => [item.id, item]));
  const sessionsByDelivery = new Map<string, SessionRow[]>();
  for (const session of (sessions.data ?? []) as SessionRow[]) {
    sessionsByDelivery.set(session.delivery_id, [...(sessionsByDelivery.get(session.delivery_id) ?? []), session]);
  }

  return rows.map((row) => {
    const rowSessions = sessionsByDelivery.get(row.id) ?? [];
    const active = rowSessions.find((session) => session.ended_at === null);
    const activeSecondsAccumulated = rowSessions.reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0);
    return {
      id: row.id,
      clientName: clientNames.get(row.client_id) ?? "Cliente",
      deliveryType: typeNames.get(row.delivery_type_id) ?? "Entrega",
      quantity: row.quantity,
      title: row.title,
      assigneeName: assigneeProfiles.get(row.assignee_id)?.full_name ?? "Designer",
      assigneeColor: assigneeProfiles.get(row.assignee_id)?.designer_color ?? "#8B5CF6",
      status: row.status,
      priority: row.priority,
      dueAt: row.due_at ?? undefined,
      referenceUrl: row.reference_url ?? undefined,
      deliveryUrl: row.delivery_url ?? undefined,
      notes: row.notes ?? undefined,
      estimateMinutes: row.estimate_minutes ?? undefined,
      effortPoints: row.effort_points ?? undefined,
      adjustmentCount: row.adjustment_count,
      activeSessionStartedAt: active?.started_at,
      activeSecondsAccumulated,
    };
  });
}
