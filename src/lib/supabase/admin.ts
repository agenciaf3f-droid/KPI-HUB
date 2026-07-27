import { createClient } from "@supabase/supabase-js";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY para gerenciar a equipe.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
