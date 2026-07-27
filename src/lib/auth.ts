import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AppRole = "admin" | "designer";

export type AppProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  role: AppRole;
  designer_color: string;
};

// cache() do React: dentro do MESMO request, chamadas repetidas reusam o
// resultado — o middleware ja validou a sessao; aqui nao repetimos rede.
export const getCurrentProfile = cache(async (): Promise<AppProfile | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("id, organization_id, full_name, role, designer_color")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    role: data.role === "admin" ? "admin" : "designer",
    designer_color: data.designer_color ?? "#8B5CF6",
  };
})
