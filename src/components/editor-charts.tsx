"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, chartColor } from "@/lib/chart-theme";

/**
 * Portado do `DashboardCharts` do Dash-Editores. Mesma composição: timeline em
 * área com alternância dia/semana/mês, pizza por formato e barra por editor.
 * A agregação continua no cliente, a partir das linhas cruas, como no original.
 *
 * Diferença: a paleta vem de `@/lib/chart-theme` (tokens do Creator) e os eixos
 * usam variáveis CSS do tema, então os gráficos acompanham claro e escuro.
 */

export type EditRow = {
  editor_name: string;
  quantity: number;
  video_format: string;
  edit_date: string;
};

type Period = "day" | "week" | "month";

export function EditorCharts({ edits, isAdmin = false }: { edits: EditRow[]; isAdmin?: boolean }) {
  const [period, setPeriod] = useState<Period>("day");

  const byEditor = useMemo(
    () =>
      Object.entries(
        edits.reduce<Record<string, number>>((acc, e) => {
          acc[e.editor_name] = (acc[e.editor_name] || 0) + e.quantity;
          return acc;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [edits],
  );

  const byFormat = useMemo(
    () =>
      Object.entries(
        edits.reduce<Record<string, number>>((acc, e) => {
          acc[e.video_format] = (acc[e.video_format] || 0) + e.quantity;
          return acc;
        }, {}),
      )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [edits],
  );

  const timeline = useMemo(() => {
    const hoje = new Date();
    const buckets =
      period === "day"
        ? eachDayOfInterval({ start: subDays(hoje, 29), end: hoje }).map((d) => ({
            key: format(d, "yyyy-MM-dd"),
            label: format(d, "dd/MM"),
          }))
        : period === "week"
          ? eachWeekOfInterval({ start: subWeeks(hoje, 11), end: hoje }).map((d) => ({
              key: format(startOfWeek(d), "yyyy-MM-dd"),
              label: format(d, "dd/MM"),
            }))
          : eachMonthOfInterval({ start: subMonths(hoje, 11), end: hoje }).map((d) => ({
              key: format(startOfMonth(d), "yyyy-MM"),
              label: format(d, "MM/yy"),
            }));

    const soma = new Map(buckets.map((b) => [b.key, 0]));
    for (const e of edits) {
      const d = parseISO(e.edit_date);
      const key =
        period === "day"
          ? format(d, "yyyy-MM-dd")
          : period === "week"
            ? format(startOfWeek(d), "yyyy-MM-dd")
            : format(startOfMonth(d), "yyyy-MM");
      if (soma.has(key)) soma.set(key, (soma.get(key) ?? 0) + e.quantity);
    }
    return buckets.map((b) => ({ label: b.label, videos: soma.get(b.key) ?? 0 }));
  }, [edits, period]);

  const periodLabel = period === "day" ? "30 dias" : period === "week" ? "12 semanas" : "12 meses";

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Vídeos nos últimos {periodLabel}</CardTitle>
          <div className="flex gap-1.5">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={period === p ? "default" : "outline"}
                className="rounded-full"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p === "day" ? "Dia" : p === "week" ? "Semana" : "Mês"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip content={<ChartTooltip sufixo="vídeos" />} />
              <Area
                type="monotone"
                dataKey="videos"
                name="Vídeos"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#areaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={isAdmin ? "lg:col-span-1" : "lg:col-span-3"}>
        <CardHeader>
          <CardTitle className="text-base">Por formato</CardTitle>
        </CardHeader>
        <CardContent>
          {byFormat.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byFormat} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2}>
                  {byFormat.map((_, i) => (
                    <Cell key={i} fill={chartColor(i)} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <Tooltip content={<ChartTooltip sufixo="vídeos" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          )}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vídeos por editor</CardTitle>
          </CardHeader>
          <CardContent>
            {byEditor.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byEditor}>
                  <defs>
                    {byEditor.map((_, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor(i)} stopOpacity={1} />
                        <stop offset="100%" stopColor={chartColor(i)} stopOpacity={0.45} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip sufixo="vídeos" />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" name="Vídeos" radius={[6, 6, 0, 0]}>
                    {byEditor.map((_, i) => (
                      <Cell key={i} fill={`url(#barGrad${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type TooltipPayload = { name?: string; value?: number; payload?: { label?: string } };

export function ChartTooltip({
  active,
  payload,
  label,
  sufixo,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  sufixo: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
      {label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-sm font-semibold tabular-nums">
          {(p.value ?? 0).toLocaleString("pt-BR")} {sufixo}
          {p.name && !label ? <span className="ml-1.5 font-sans font-normal text-muted-foreground">{p.name}</span> : null}
        </p>
      ))}
    </div>
  );
}
