"use client";

import { LiveTimer } from "@/components/live-timer";
import type { ActiveDeliveryTimer } from "@/lib/types";

export function ActiveTimersPanel({ activeTimers }: { activeTimers: ActiveDeliveryTimer[]; realtimeTopic?: string }) {
  return (
    <section className="mt-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em]">Demandas em andamento</p>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe as entregas que estão sendo produzidas agora.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{activeTimers.length} ativos</span>
      </div>
      {activeTimers.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeTimers.map((timer) => <article key={timer.deliveryId} className="rounded-2xl bg-muted p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{timer.clientName}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{timer.title}</p>
            </div>
            <span className="size-2 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: timer.designerColor }} aria-label={`Timer ativo de ${timer.assigneeName}`} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><strong className="font-medium text-foreground">{timer.deliveryType}</strong> · <span className="size-2 rounded-full" style={{ backgroundColor: timer.designerColor }} /> {timer.assigneeName}</p>
          <LiveTimer startedAtIso={timer.startedAt} baseSeconds={timer.baseSeconds} className="mt-3 block font-mono text-2xl font-bold tracking-[-0.04em]" />
        </article>)}
      </div> : <div className="mt-5 rounded-2xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">Nenhum timer ativo neste momento.</div>}
    </section>
  );
}
