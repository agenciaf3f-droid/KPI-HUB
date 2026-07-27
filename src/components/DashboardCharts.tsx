import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import type { TooltipProps } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { formatColor } from "@/lib/utils";
import { EditorStatsModal } from "@/components/EditorStatsModal";
import {
  startOfWeek,
  startOfMonth,
  format,
  subDays,
  subWeeks,
  subMonths,
  isAfter,
  parseISO,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type VideoEdit = Tables<"video_edits">;

interface DashboardChartsProps {
  edits: VideoEdit[];
  from?: string;
  to?: string;
  isAdmin?: boolean;
}

const COLORS = [
  "#8b5cf6",
  "#c4b5fd",
  "#ffbd75",
  "#b6ef77",
  "#cbbcf7",
  "#f4a6c7",
  "#7dd3e8",
];

const EDITORS = ["Lucas", "Damião", "Teste"];

const EDITOR_COLORS: Record<string, string> = Object.fromEntries(
  EDITORS.map((ed, i) => [ed, COLORS[i % COLORS.length]])
);

type Period = "day" | "week" | "month";

export function DashboardCharts({ edits, from, to, isAdmin = false }: DashboardChartsProps) {
  const [period, setPeriod] = useState<Period>("day");
  const [byEditorMode, setByEditorMode] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);

  const rangeActive = !!from && !!to && from <= to;

  // Edits by editor
  const byEditor = Object.entries(
    edits.reduce<Record<string, number>>((acc, e) => {
      acc[e.editor_name] = (acc[e.editor_name] || 0) + e.quantity;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  // Edits by format
  const byFormat = Object.entries(
    edits.reduce<Record<string, number>>((acc, e) => {
      acc[e.video_format] = (acc[e.video_format] || 0) + e.quantity;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const formatTotal = byFormat.reduce((s, f) => s + f.value, 0);

  const PieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;
    const { name, value } = payload[0].payload as { name: string; value: number };
    const pct = formatTotal > 0 ? Math.round((value / formatTotal) * 100) : 0;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: formatColor(name) }} />
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <p className="mt-1 tabular-nums text-muted-foreground">
          {value} {value === 1 ? "edição" : "edições"} · {pct}%
        </p>
      </div>
    );
  };

  // Bar color mirrors the Cell fills (same order as byEditor).
  const barColor = (name: string) =>
    COLORS[byEditor.findIndex((e) => e.name === name) % COLORS.length];

  const BarTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;
    const { name, count } = payload[0].payload as { name: string; count: number };
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: barColor(name) }} />
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <p className="mt-1 tabular-nums text-muted-foreground">
          {count} {count === 1 ? "edição" : "edições"}
        </p>
      </div>
    );
  };

  const AreaTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;
    // In per-editor mode, hide zero-value series so a hover doesn't list idle editors.
    const rows = payload.filter((p) => !byEditorMode || Number(p.value) > 0);
    if (!rows.length) return null;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
        <p className="mb-1.5 font-medium text-foreground">{label}</p>
        <div className="space-y-1">
          {rows.map((p) => (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: EDITOR_COLORS[String(p.name)] ?? "#8b5cf6" }}
                />
                {p.name}
              </span>
              <span className="font-medium tabular-nums text-foreground">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Timeline data based on period and editor grouping
  const timelineData = useMemo(() => {
    const now = new Date();

    // Build one chart row from a label and the edits falling in that bucket.
    const makeRow = (label: string, bucketEdits: VideoEdit[]) => {
      if (byEditorMode) {
        const row: Record<string, string | number> = { date: label };
        EDITORS.forEach((ed) => {
          row[ed] = bucketEdits
            .filter((e) => e.editor_name === ed)
            .reduce((s, e) => s + e.quantity, 0);
        });
        return row;
      }
      return { date: label, count: bucketEdits.reduce((s, e) => s + e.quantity, 0) };
    };

    // Bucket edits whose date falls in [start, end) (half-open).
    const inBucket = (start: Date, end: Date) =>
      edits.filter((e) => {
        const d = parseISO(e.edit_date);
        return !isAfter(start, d) && isAfter(end, d);
      });

    if (period === "day") {
      const days = rangeActive
        ? eachDayOfInterval({ start: parseISO(from!), end: parseISO(to!) }).map((d) =>
            format(d, "yyyy-MM-dd")
          )
        : Array.from({ length: 30 }, (_, i) => format(subDays(now, 29 - i), "yyyy-MM-dd"));

      return days.map((date) =>
        makeRow(date.slice(5), edits.filter((e) => e.edit_date === date))
      );
    }

    if (period === "week") {
      const starts = rangeActive
        ? eachWeekOfInterval({ start: parseISO(from!), end: parseISO(to!) }, { weekStartsOn: 1 })
        : Array.from({ length: 12 }, (_, i) => startOfWeek(subWeeks(now, 11 - i), { weekStartsOn: 1 }));

      return starts.map((ws, idx) => {
        const end = rangeActive
          ? addDays(ws, 7)
          : idx < starts.length - 1
            ? starts[idx + 1]
            : now;
        return makeRow(format(ws, "dd/MM", { locale: ptBR }), inBucket(ws, end));
      });
    }

    // month
    const starts = rangeActive
      ? eachMonthOfInterval({ start: parseISO(from!), end: parseISO(to!) })
      : Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(now, 11 - i)));

    return starts.map((ms, idx) => {
      const end = rangeActive
        ? addMonths(ms, 1)
        : idx < starts.length - 1
          ? starts[idx + 1]
          : now;
      return makeRow(format(ms, "MMM", { locale: ptBR }), inBucket(ms, end));
    });
  }, [edits, period, byEditorMode, rangeActive, from, to]);

  const periodLabel = period === "day" ? "30 dias" : period === "week" ? "12 semanas" : "12 meses";
  const timelineTitle = rangeActive
    ? `De ${format(parseISO(from!), "dd/MM")} até ${format(parseISO(to!), "dd/MM")}`
    : `Edições nos últimos ${periodLabel}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Area chart - timeline */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{timelineTitle}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["day", "week", "month"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--primary)_70%,transparent)]"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {p === "day" ? "Dia" : p === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={() => setByEditorMode(!byEditorMode)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border border-border transition-colors ${
                  byEditorMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                Por Editor
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timelineData}>
              <defs>
                {byEditorMode ? (
                  EDITORS.map((ed, i) => (
                    <linearGradient key={ed} id={`gradEditor${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EDITOR_COLORS[ed]} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={EDITOR_COLORS[ed]} stopOpacity={0.02} />
                    </linearGradient>
                  ))
                ) : (
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                    <stop offset="55%" stopColor="#8b5cf6" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip content={<AreaTooltip />} />
              {byEditorMode ? (
                <>
                  {EDITORS.map((ed, i) => (
                    <Area
                      key={ed}
                      type="monotone"
                      dataKey={ed}
                      stroke={EDITOR_COLORS[ed]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#gradEditor${i})`}
                    />
                  ))}
                  <Legend wrapperStyle={{ color: "var(--foreground)" }} />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="Edições"
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#a78bfa" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie chart - format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por Formato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center">
          {byFormat.length > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={byFormat}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={byFormat.length > 1 ? 2 : 0}
                      dataKey="value"
                      nameKey="name"
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {byFormat.map((f, i) => (
                        <Cell key={i} fill={formatColor(f.name)} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading text-3xl font-bold leading-none tabular-nums">
                    {formatTotal}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">edições</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {byFormat.map((f) => (
                  <div key={f.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: formatColor(f.name) }} />
                    <span className="text-muted-foreground">{f.name}</span>
                    <span className="font-medium tabular-nums">{f.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground text-sm">Sem dados</p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
      {/* Bar chart - by editor (admin only) */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Edições por Editor</CardTitle>
          {byEditor.length > 0 && (
            <p className="text-xs text-muted-foreground">Clique em um editor para ver os detalhes</p>
          )}
        </CardHeader>
        <CardContent>
          {byEditor.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byEditor}>
                <defs>
                  {byEditor.map((_, i) => {
                    const c = COLORS[i % COLORS.length];
                    return (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.45} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--muted)" }} />
                <Bar
                  dataKey="count"
                  name="Edições"
                  radius={[6, 6, 0, 0]}
                  onClick={(_, index) => {
                    const e = byEditor[index];
                    if (e) setSelectedEditor(e.name);
                  }}
                >
                  {byEditor.map((_, i) => (
                    <Cell key={i} fill={`url(#barGrad${i})`} className="cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">Sem dados</p>
          )}
        </CardContent>
      </Card>

      <EditorStatsModal
        editor={selectedEditor}
        edits={edits}
        color={
          selectedEditor
            ? COLORS[byEditor.findIndex((e) => e.name === selectedEditor) % COLORS.length]
            : COLORS[0]
        }
        onClose={() => setSelectedEditor(null)}
      />
        </>
      )}
    </div>
  );
}
