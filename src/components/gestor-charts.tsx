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
import { format, parseISO } from "date-fns";

import { ChartTooltip } from "@/components/editor-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, chartColor } from "@/lib/chart-theme";

/**
 * Mesma composição visual do painel do Editor — timeline em área com seletor de
 * período, pizza de distribuição e barra comparativa. Os dois painéis lêem como
 * a mesma ferramenta, que é o ponto de unificar os sistemas.
 *
 * Origem dos dados: views `kpi_gestor_resumo` e `kpi_gestor_diario`, agregadas
 * no Postgres. O componente recebe dezenas de linhas, não as 109 mil da tabela.
 */

export type ResumoRow = { gestor: string; mensagens: number; grupos: number; respostas: number };
export type DiaRow = { gestor: string; dia: string; mensagens: number };

type Janela = 7 | 30 | 90;

export function GestorCharts({
  resumo,
  diario,
  isAdmin = false,
}: {
  resumo: ResumoRow[];
  diario: DiaRow[];
  isAdmin?: boolean;
}) {
  const [janela, setJanela] = useState<Janela>(30);

  const timeline = useMemo(() => {
    const porDia = new Map<string, number>();
    for (const d of diario) porDia.set(d.dia, (porDia.get(d.dia) ?? 0) + d.mensagens);
    return [...porDia.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-janela)
      .map(([dia, mensagens]) => ({ label: format(parseISO(dia), "dd/MM"), mensagens }));
  }, [diario, janela]);

  const porGrupos = useMemo(
    () => resumo.map((r) => ({ name: r.gestor, value: r.grupos })).filter((r) => r.value > 0),
    [resumo],
  );

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Mensagens nos últimos {janela} dias</CardTitle>
          <div className="flex gap-1.5">
            {([7, 30, 90] as Janela[]).map((j) => (
              <Button
                key={j}
                type="button"
                size="sm"
                variant={janela === j ? "default" : "outline"}
                className="rounded-full"
                aria-pressed={janela === j}
                onClick={() => setJanela(j)}
              >
                {j}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="gestorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip content={<ChartTooltip sufixo="mensagens" />} />
              <Area
                type="monotone"
                dataKey="mensagens"
                name="Mensagens"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#gestorArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Mensagens por gestor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={resumo.map((r) => ({ name: r.gestor, mensagens: r.mensagens }))}>
                  <defs>
                    {resumo.map((_, i) => (
                      <linearGradient key={i} id={`gestorBar${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor(i)} stopOpacity={1} />
                        <stop offset="100%" stopColor={chartColor(i)} stopOpacity={0.45} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip sufixo="mensagens" />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="mensagens" name="Mensagens" radius={[6, 6, 0, 0]}>
                    {resumo.map((_, i) => (
                      <Cell key={i} fill={`url(#gestorBar${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Grupos por gestor</CardTitle>
            </CardHeader>
            <CardContent>
              {porGrupos.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={porGrupos} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2}>
                      {porGrupos.map((_, i) => (
                        <Cell key={i} fill={chartColor(i)} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <Tooltip content={<ChartTooltip sufixo="grupos" />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
