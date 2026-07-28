import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const DESIGNER_COLORS = ["#6E37C4", "#EC4899", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#64748B"];

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Faça login para personalizar sua conta." }, { status: 401 });
    const { color } = await request.json();
    if (typeof color !== "string" || !DESIGNER_COLORS.includes(color)) {
      return NextResponse.json({ error: "Escolha uma cor disponível." }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error } = await admin.from("creator_profiles").update({ designer_color: color }).eq("id", profile.id);
    if (error) throw error;
    return NextResponse.json({ color });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a cor." }, { status: 500 });
  }
}
