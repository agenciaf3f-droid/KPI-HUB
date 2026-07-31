"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { FormatPeriod, MetricsData } from "@/components/metrics-dashboard";

const options: Array<{ value: FormatPeriod; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

export function FormatDistributionCard({ formatsByPeriod }: { formatsByPeriod: MetricsData["formatsByPeriod"] }) {
  const [period, setPeriod] = useState<FormatPeriod>("month");
  const [open, setOpen] = useState(false);
  const formats = formatsByPeriod[period];
  const total = formats.reduce((sum, format) => sum + format.value, 0);
  let start = 0;
  const gradient = total ? formats.map((format) => { const end = start + (format.value / total) * 100; const part = `${format.color} ${start}% ${end}%`; start = end; return part; }).join(", ") : "var(--muted) 0 100%";

  return (
    <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div><p className="text-lg font-semibold tracking-[-0.02em]">Por formato</p><p className="mt-1 text-sm text-muted-foreground">Distribuição das entregas.</p></div>
        <div className="relative">
          <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl border border-border bg-muted/70 px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted" aria-expanded={open}>
            {options.find((option) => option.value === period)?.label}<ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open ? <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-black/5">
            {options.map((option) => <button key={option.value} type="button" onClick={() => { setPeriod(option.value); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-foreground transition hover:bg-muted"><span>{option.label}</span>{period === option.value ? <Check className="size-3.5 text-primary" /> : null}</button>)}
          </div> : null}
        </div>
      </header>
      <div className="mt-6 grid place-items-center"><div className="grid size-52 place-items-center rounded-full p-6" role="img" aria-label={`${total} entregas distribuídas por formato`} style={{ background: `conic-gradient(${gradient})` }}><div className="grid size-full place-items-center rounded-full bg-card text-center"><div><p className="text-4xl font-semibold tracking-[-0.05em]">{total}</p><p className="mt-1 text-xs text-muted-foreground">entregas</p></div></div></div></div>
      <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 text-xs">{formats.length ? formats.map((format) => <div key={format.label} className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: format.color }} /><span className="truncate text-muted-foreground">{format.label}</span><strong className="ml-auto font-semibold text-foreground">{format.value}</strong></div>) : <p className="col-span-2 text-muted-foreground">Nenhuma entrega concluída no período.</p>}</div>
    </article>
  );
}
