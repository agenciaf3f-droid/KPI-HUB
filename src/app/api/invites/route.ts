import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Apenas Administradores podem convidar designers." }, { status: 403 });
    }

    const admin = createAdminClient();
    const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const { data, error } = await admin
      .from("creator_team_invites")
      .insert({
        organization_id: profile.organization_id,
        created_by: profile.id,
        token,
        role: "designer",
      })
      .select("expires_at")
      .single();
    if (error) throw error;

    return NextResponse.json({
      url: new URL(`/convite/${token}`, request.url).toString(),
      expiresAt: data.expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o convite." },
      { status: 500 },
    );
  }
}
