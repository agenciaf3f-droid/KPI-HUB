import {
  ArrowUpRight,
  CalendarDays,
  Film,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { type GamificationData } from "@/lib/gamification";
import { ActiveTimersPanel } from "@/components/active-timers-panel";
import { GamificationPanel } from "@/components/gamification-panel";
import { FormatDistributionCard } from "@/components/format-distribution-card";
import type { ActiveDeliveryTimer } from "@/lib/types";

export type FormatPeriod = "today" | "yesterday" | "7days" | "month";

export type MetricsData = {
  total: number;
  thisMonth: number;
  daily: number[];
  formats: Array<{ label: string; value: number; color: string }>;
  formatsByPeriod: Record<FormatPeriod, Array<{ label: string; value: number; color: string }>>;
  timeSeconds: number;
};

export function emptyMetrics(): MetricsData {
  return { total: 0, thisMonth: 0, daily: Array.from({ length: 30 }, () => 0), formats: [], formatsByPeriod: { today: [], yesterday: [], "7days": [], month: [] }, timeSeconds: 0 };
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours) return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  return `${minutes}min`;
}

// KPI do Creator — embutido na aba Creator, abaixo da fila de producao
// (mesma logica do painel do Editor: primeira dobra opera, o resto mede).
// Os números vêm de `loadMetrics` (src/lib/metrics.ts); antes eram fixos em 0
// e a lista de formatos era um chute com "Outros" genérico.
export function MetricsSection({ role, metrics, activeTimers = [], gamification, realtimeTopic }: { role: "admin" | "designer"; metrics?: MetricsData; activeTimers?: ActiveDeliveryTimer[]; gamification?: GamificationData; realtimeTopic?: string }) {
  const isAdmin = role === "admin";
  const data = metrics ?? emptyMetrics();

  return (
    <section className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Film />}
            iconClassName="bg-primary/15 text-primary shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_28%,transparent)]"
            label={isAdmin ? "Total de entregas" : "Minhas entregas"}
            value={String(data.total)}
          />
          <MetricCard
            icon={<UsersRound />}
            iconClassName="bg-[#6E37C4]/15 text-[#6E37C4] shadow-[0_0_24px_rgba(110,55,196,0.24)]"
            label={isAdmin ? "Média por designer" : "Meu tempo ativo"}
            value={isAdmin ? String(data.total) : formatDuration(data.timeSeconds)}
          />
          <MetricCard
            icon={<TrendingUp />}
            iconClassName="bg-[#f6c952]/15 text-[#d49808] shadow-[0_0_24px_rgba(246,201,82,0.22)]"
            label={isAdmin ? "Designers ativos" : "Meus clientes"}
            value={String(data.formats.filter((format) => format.value > 0).length)}
          />
          <MetricCard
            icon={<CalendarDays />}
            iconClassName="bg-[#e980a7]/15 text-[#e15388] shadow-[0_0_24px_rgba(233,128,167,0.22)]"
            label="Este mês"
            value={String(data.thisMonth)}
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.95fr)]">
          <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]">Entregas nos últimos 30 dias</p>
                <p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Comparativo da equipe no período." : "Seu volume produzido no período."}</p>
              </div>
              <div className="flex w-fit rounded-xl bg-muted p-1 text-xs" aria-label="Agrupamento do gráfico">
                <button type="button" className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground shadow-sm" aria-pressed="true">Dia</button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-pressed="false">Semana</button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-pressed="false">Mês</button>
              </div>
            </header>

            <EditionsChart values={data.daily} />

            <footer className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />{data.total} entregas concluídas</span>
            </footer>
          </article>

          <FormatDistributionCard formatsByPeriod={data.formatsByPeriod} />
        </section>

        <ActiveTimersPanel activeTimers={activeTimers} realtimeTopic={realtimeTopic} />

        {gamification ? <GamificationPanel data={gamification} role={role} /> : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]">Ritmo da operação</p>
                <p className="mt-1 text-sm text-muted-foreground">Os indicadores serão comparados assim que houver entregas registradas.</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowUpRight className="size-4" />—</span>
            </div>
            <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl bg-muted p-4">
              <DataPoint label="No prazo" value="—" />
              <DataPoint label="Tempo médio" value="—" />
              <DataPoint label="Em ajuste" value="—" />
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground shadow-sm sm:p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary-foreground/70 uppercase">Leitura rápida</p>
            <p className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em]">A operação está pronta para registrar os primeiros dados.</p>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">{isAdmin ? "Convide designers e acompanhe o KPI consolidado conforme a equipe trabalhar." : "Suas métricas serão preenchidas conforme você registrar entregas e timers."}</p>
          </article>
        </section>
    </section>
  );
}

function MetricCard({ icon, iconClassName, label, value }: { icon: React.ReactNode; iconClassName: string; label: string; value: string }) {
  return (
    <article className="flex min-h-28 items-center gap-4 rounded-[1.25rem] border border-border bg-card px-5 py-4 shadow-sm">
      <span className={"grid size-11 shrink-0 place-items-center rounded-xl " + iconClassName}>{icon}</span>
      <div>
        <p className="text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-[2.65rem]">{value}</p>
        <p className="mt-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      </div>
    </article>
  );
}

function EditionsChart({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1);

  return (
    <div className="mt-7 grid grid-cols-[2rem_minmax(0,1fr)] gap-2" role="img" aria-label="Gráfico de entregas por dia nos últimos 30 dias">
      <div className="flex h-56 flex-col justify-between pb-5 text-right text-[10px] text-muted-foreground">
        <span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
      </div>
      <div>
        <div className="relative flex h-56 items-end gap-px overflow-hidden border-b border-l border-border px-2 pb-px pt-2 [background-image:linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_26%,transparent_49%,var(--border)_50%,transparent_51%,transparent_74%,var(--border)_75%,transparent_76%)]">
          {values.map((value, index) => (
            <div key={index} className="group flex h-full flex-1 items-end">
              <span
                className="w-full rounded-t-full bg-primary/55 transition-colors group-hover:bg-primary"
                style={{ height: Math.max((value / maxValue) * 100, value ? 2 : 0) + "%" }}
                title={value + " entregas"}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>25 Jun</span><span>01 Jul</span><span>07 Jul</span><span>13 Jul</span><span>19 Jul</span><span>24 Jul</span>
        </div>
      </div>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}
