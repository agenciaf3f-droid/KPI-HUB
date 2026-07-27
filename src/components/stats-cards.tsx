import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Portado do `StatsCards` do Dash-Editores — estrutura idêntica: aresta superior
 * acesa pelo acento, ícone em caixa com anel e glow, número em `tabular-nums`,
 * rótulo em versalete.
 *
 * Mudou só a cor: os acentos vêm dos tokens `--chart-*` do design system do
 * Creator, e a superfície usa `bg-card`/`border-border` em vez do gradiente
 * fixo escuro do original — assim funciona nos dois temas.
 */

export type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Hex do token de gráfico. Ver `@/lib/chart-theme`. */
  accent: string;
};

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{ "--a": stat.accent } as CSSProperties}
          className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:border-[color-mix(in_srgb,var(--a)_45%,transparent)] hover:shadow-[0_14px_40px_-18px_color-mix(in_srgb,var(--a)_55%,transparent)] sm:p-5"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, var(--a), transparent)" }}
          />
          <div className="flex items-center gap-3.5">
            <div
              className="shrink-0 rounded-2xl p-3 ring-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--a) 12%, transparent)",
                color: "var(--a)",
                boxShadow: "0 0 22px -8px color-mix(in srgb, var(--a) 60%, transparent)",
                // @ts-expect-error -- custom property aceita string
                "--tw-ring-color": "color-mix(in srgb, var(--a) 30%, transparent)",
              }}
            >
              <stat.icon className="size-5" />
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
