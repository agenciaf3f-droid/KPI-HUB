"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** Mantém a visão de monitoramento atualizada mesmo se o broadcast falhar. */
export function CreatorRealtimeSync({ topic }: { topic?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!topic || !isSupabaseConfigured()) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => { refreshTimer = undefined; router.refresh(); }, 150);
    };
    const supabase = createClient();
    const channel = supabase.channel(topic, { config: { private: false } }).on("broadcast", { event: "refresh" }, refresh).subscribe();
    // Fallback: o painel nunca fica desatualizado caso Realtime esteja
    // indisponível ou algum trigger ainda não tenha sido aplicado.
    const interval = window.setInterval(refresh, 3_000);
    return () => {
      window.clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router, topic]);

  return null;
}
