import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { loadDeliveries } from "@/lib/deliveries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Faça login para criar uma entrega." }, { status: 401 });
    const body = await request.json();
    const clientName = String(body.clientName ?? "").trim();
    const deliveryType = String(body.deliveryType ?? "").trim();
    const quantity = Number(body.quantity ?? 1);
    if (!clientName || !deliveryType) return NextResponse.json({ error: "Informe o cliente e o tipo de entrega." }, { status: 400 });

    const admin = createAdminClient();
    const { data: activeSession, error: activeSessionError } = await admin
      .from("creator_time_sessions")
      .select("id")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle();
    if (activeSessionError) throw activeSessionError;
    if (activeSession) return NextResponse.json({ error: "Pause ou conclua o timer atual antes de iniciar outra entrega." }, { status: 409 });
    const clientId = await findOrCreate(admin, "creator_clients", clientName, profile.organization_id);
    const typeId = await findOrCreate(admin, "creator_delivery_types", deliveryType, profile.organization_id);
    const { data: delivery, error } = await admin.from("creator_deliveries").insert({
      organization_id: profile.organization_id,
      client_id: clientId,
      delivery_type_id: typeId,
      title: `${deliveryType} — nova entrega`,
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
      assignee_id: profile.id,
      created_by: profile.id,
      status: "em_producao",
    }).select("id").single();
    if (error || !delivery) throw error ?? new Error("Não foi possível criar a entrega.");
    const { error: sessionError } = await admin.from("creator_time_sessions").insert({ delivery_id: delivery.id, user_id: profile.id });
    if (sessionError) throw sessionError;
    const deliveries = await loadDeliveries(profile);
    return NextResponse.json({ delivery: deliveries.find((item) => item.id === delivery.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar a entrega." }, { status: 500 });
  }
}

async function findOrCreate(admin: ReturnType<typeof createAdminClient>, table: "creator_clients" | "creator_delivery_types", name: string, organizationId: string) {
  const { data: existing, error: findError } = await admin.from(table).select("id").eq("organization_id", organizationId).eq("name", name).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;
  const { data, error } = await admin.from(table).insert({ organization_id: organizationId, name }).select("id").single();
  if (error || !data) throw error ?? new Error("Não foi possível preparar a entrega.");
  return data.id;
}
