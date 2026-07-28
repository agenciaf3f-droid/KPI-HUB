import { NextResponse } from "next/server";
import { hasAdminLinkAccess } from "@/lib/admin-access";
import { getCurrentProfile } from "@/lib/auth";
import { getMonitoringOrganizationId } from "@/lib/deliveries";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrganizationId(request: Request) {
  if (hasAdminLinkAccess(request.headers.get("x-admin-access-token"))) return getMonitoringOrganizationId();
  const profile = await getCurrentProfile();
  return profile?.organization_id ?? null;
}

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId(request);
    if (!organizationId) return NextResponse.json({ error: "Faça login para acessar os clientes." }, { status: 401 });
    const { data, error } = await createAdminClient()
      .from("creator_clients")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name");
    if (error) throw error;
    return NextResponse.json({ clients: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os clientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId(request);
    if (!organizationId) return NextResponse.json({ error: "Faça login para cadastrar clientes." }, { status: 401 });
    const name = String((await request.json()).name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
    const admin = createAdminClient();
    const { data: existing, error: findError } = await admin.from("creator_clients").select("id, name").eq("organization_id", organizationId).eq("name", name).maybeSingle();
    if (findError) throw findError;
    if (existing) return NextResponse.json({ client: existing });
    const { data, error } = await admin.from("creator_clients").insert({ organization_id: organizationId, name }).select("id, name").single();
    if (error || !data) throw error ?? new Error("Não foi possível cadastrar o cliente.");
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar o cliente." }, { status: 500 });
  }
}
