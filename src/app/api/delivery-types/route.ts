import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Faça login para consultar os tipos." }, { status: 401 });
  const { data, error } = await createAdminClient().from("creator_delivery_types").select("id, name").eq("organization_id", profile.organization_id).eq("active", true).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ types: data ?? [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Faça login para cadastrar um tipo." }, { status: 401 });
  const name = String((await request.json()).name ?? "").trim();
  if (!name || name.length > 80) return NextResponse.json({ error: "Informe um nome entre 1 e 80 caracteres." }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("creator_delivery_types").upsert({ organization_id: profile.organization_id, name, active: true }, { onConflict: "organization_id,name" }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ type: data });
}
