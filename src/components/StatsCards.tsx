import type { CSSProperties } from "react";
import { Film, Users, Calendar, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type VideoEdit = Tables<"video_edits">;

interface StatsCardsProps {
  edits: VideoEdit[];
  rangeActive: boolean;
  rangeDays?: number;
}

export function StatsCards({ edits, rangeActive, rangeDays = 0 }: StatsCardsProps) {
  const totalEdits = edits.reduce((sum, e) => sum + e.quantity, 0);
  const uniqueEditors = new Set(edits.map((e) => e.editor_name)).size;
  const avgPerEditor = uniqueEditors > 0 ? Math.round(totalEdits / uniqueEditors) : 0;
  const uniqueClients = new Set(edits.map((e) => e.client_name)).size;

  const now = new Date();
  const thisMonth = edits
    .filter((e) => {
      const d = new Date(e.edit_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.quantity, 0);

  // Each metric carries its own brand accent (H S L channels) so the row reads as a
  // vibrant instrument panel rather than four identical gray slabs.
  const stats = [
    { label: "Total de Edições", value: totalEdits, icon: Film, accent: "#8b5cf6" },
    { label: "Média por Editor", value: avgPerEditor, icon: Users, accent: "#c4b5fd" },
    { label: "Clientes", value: uniqueClients, icon: TrendingUp, accent: "#ffbd75" },
    rangeActive
      ? { label: "Dias no período", value: rangeDays, icon: Calendar, accent: "#b6ef77" }
      : { label: "Este Mês", value: thisMonth, icon: Calendar, accent: "#b6ef77" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{ "--a": stat.accent } as CSSProperties}
          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05),0_10px_30px_-16px_hsl(0_0%_0%/0.6)] transition-all duration-300 hover:border-[color-mix(in_srgb,var(--a)_45%,transparent)] hover:shadow-[0_14px_40px_-18px_color-mix(in_srgb,var(--a)_55%,transparent)] sm:p-5"
        >
          {/* Accent-lit top edge */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--a) 75%, transparent), transparent)" }}
          />
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="shrink-0 rounded-xl p-3 ring-1 ring-[color-mix(in_srgb,var(--a)_30%,transparent)]"
              style={{
                backgroundColor: "color-mix(in srgb, var(--a) 12%, transparent)",
                color: "var(--a)",
                boxShadow: "0 0 22px -8px color-mix(in srgb, var(--a) 60%, transparent)",
              }}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-3xl font-bold leading-none tabular-nums tracking-tight sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
