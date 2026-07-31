import "server-only";

import type { MetricsData } from "@/components/metrics-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Indicadores da aba Creator, sobre os últimos 30 dias de entregas concluídas.
 *
 * Portado do Creator de origem (commit "fix: show exact delivery formats in
 * metrics"): os formatos saem dos tipos reais das entregas, não de uma lista
 * fixa com "Outros" genérico. Quando o tipo é "Outro", o rótulo leva o título
 * da demanda para não virar um balde sem significado.
 */
export async function loadMetrics(organizationId: string, assigneeId?: string): Promise<MetricsData> {
  const admin = createAdminClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 29);

  let query = admin
    .from("creator_deliveries")
    .select("id, delivered_at, delivery_type_id, assignee_id, title, quantity")
    .eq("organization_id", organizationId)
    .eq("status", "entregue")
    .gte("delivered_at", since.toISOString());
  if (assigneeId) query = query.eq("assignee_id", assigneeId);

  const { data: rows, error } = await query;
  if (error) throw error;
  const deliveryRows = rows ?? [];

  const deliveryIds = deliveryRows.map((row) => row.id);
  const { data: sessions, error: sessionsError } = await admin
    .from("creator_time_sessions")
    .select("delivery_id, user_id, duration_seconds")
    .in("delivery_id", deliveryIds.length ? deliveryIds : ["00000000-0000-0000-0000-000000000000"]);
  if (sessionsError) throw sessionsError;
  const timeSeconds = (sessions ?? [])
    .filter((session) => !assigneeId || session.user_id === assigneeId)
    .reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0);

  const typeIds = [...new Set(deliveryRows.map((row) => row.delivery_type_id))];
  const { data: types, error: typesError } = await admin
    .from("creator_delivery_types")
    .select("id, name")
    .in("id", typeIds.length ? typeIds : ["00000000-0000-0000-0000-000000000000"]);
  if (typesError) throw typesError;
  const typeNames = new Map((types ?? []).map((type) => [type.id, type.name]));

  const daily = Array.from({ length: 30 }, () => 0);
  let thisMonth = 0;
  const agora = new Date();
  const formatValues = new Map<string, number>();
  const colors = ["#6E37C4", "#3B82F6", "#14B8A6", "#F97316", "#EAB308", "#EC4899", "#64748B"];

  for (const row of deliveryRows) {
    const date = new Date(row.delivered_at!);
    const index = Math.floor((date.getTime() - since.getTime()) / 86400000);
    if (index >= 0 && index < 30) daily[index] += 1;
    if (date.getMonth() === agora.getMonth() && date.getFullYear() === agora.getFullYear()) thisMonth += 1;

    const typeName = typeNames.get(row.delivery_type_id) ?? "Formato não identificado";
    const label =
      typeName.toLocaleLowerCase("pt-BR") === "outro"
        ? `Outro — ${String(row.title ?? "sem especificação").replace(/^outro\s+—\s*/i, "")}`
        : typeName;
    formatValues.set(label, (formatValues.get(label) ?? 0) + (Number(row.quantity) || 1));
  }

  const formats = [...formatValues.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }));

  return { total: deliveryRows.length, thisMonth, daily, formats, timeSeconds };
}
