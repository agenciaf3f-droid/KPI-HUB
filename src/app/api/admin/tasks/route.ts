import { NextResponse } from "next/server";
import { hasAdminLinkAccess } from "@/lib/admin-access";
import { getMonitoringOrganizationId } from "@/lib/deliveries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    if (!hasAdminLinkAccess(request.headers.get("x-admin-access-token"))) return NextResponse.json({ error: "Acesso administrativo inválido." }, { status: 403 });
    const organizationId = await getMonitoringOrganizationId();
    if (!organizationId) return NextResponse.json({ designers: [] });
    const admin = createAdminClient();
    const { data, error } = await admin.from("creator_profiles").select("id, full_name, designer_color").eq("organization_id", organizationId).eq("role", "designer").order("full_name");
    if (error) throw error;
    return NextResponse.json({ designers: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os Designers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!hasAdminLinkAccess(request.headers.get("x-admin-access-token"))) return NextResponse.json({ error: "Acesso administrativo inválido." }, { status: 403 });
    const { clientName, deliveryType, title, quantity, assigneeId } = await request.json();
    const client = String(clientName ?? "").trim();
    const type = String(deliveryType ?? "").trim();
    const taskTitle = String(title ?? "").trim();
    if (!client || !type || !taskTitle || !assigneeId) return NextResponse.json({ error: "Preencha cliente, tipo, título e Designer." }, { status: 400 });
    const organizationId = await getMonitoringOrganizationId();
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });
    const admin = createAdminClient();
    const { data: designer, error: designerError } = await admin.from("creator_profiles").select("id").eq("id", assigneeId).eq("organization_id", organizationId).eq("role", "designer").maybeSingle();
    if (designerError) throw designerError;
    if (!designer) return NextResponse.json({ error: "Designer inválido." }, { status: 400 });
    const clientId = await findOrCreate(admin, "creator_clients", client, organizationId);
    const typeId = await findOrCreate(admin, "creator_delivery_types", type, organizationId);
    const { data: creator } = await admin.from("creator_profiles").select("id").eq("organization_id", organizationId).eq("role", "admin").maybeSingle();
    const { error } = await admin.from("creator_deliveries").insert({
      organization_id: organizationId,
      client_id: clientId,
      delivery_type_id: typeId,
      title: taskTitle,
      quantity: Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Math.floor(Number(quantity)) : 1,
      assignee_id: designer.id,
      created_by: creator?.id ?? designer.id,
      status: "criada",
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar a tarefa." }, { status: 500 });
  }
}

async function findOrCreate(admin: ReturnType<typeof createAdminClient>, table: "creator_clients" | "creator_delivery_types", name: string, organizationId: string) {
  const { data: existing, error: findError } = await admin.from(table).select("id").eq("organization_id", organizationId).eq("name", name).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;
  const { data, error } = await admin.from(table).insert({ organization_id: organizationId, name }).select("id").single();
  if (error || !data) throw error ?? new Error("Não foi possível preparar a tarefa.");
  return data.id;
}
