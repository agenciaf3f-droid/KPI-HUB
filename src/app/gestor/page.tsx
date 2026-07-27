import { CalendarDays, MessageSquare, Reply, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { GestorCharts } from "@/components/gestor-charts";
import { PainelHeader } from "@/components/painel-shell";
import { StatsCards } from "@/components/stats-cards";
import { CHART_COLORS } from "@/lib/chart-theme";
import { loadGestorMetrics } from "@/lib/gestor";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Atendimento · KPI F3F" };

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default async function GestorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("gestor")) redirect("/");

  const { resumo, diario } = await loadGestorMetrics(acesso.isAdmin ? undefined : acesso.gestorName);

  const mensagens = resumo.reduce((s, r) => s + r.mensagens, 0);
  const grupos = resumo.reduce((s, r) => s + r.grupos, 0);
  const respostas = resumo.reduce((s, r) => s + r.respostas, 0);

  const porDia = new Map<string, number>();
  for (const d of diario) porDia.set(d.dia, (porDia.get(d.dia) ?? 0) + d.mensagens);
  const ultimos30 = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  const mediaDiaria = ultimos30.length
    ? Math.round(ultimos30.reduce((s, [, v]) => s + v, 0) / ultimos30.length)
    : 0;

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="gestor" fullName={acesso.gestorName ?? acesso.email} panels={acesso.panels} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <PainelHeader
          titulo="Atendimento"
          descricao={
            acesso.isAdmin
              ? "Volume de atendimento por gestor nos grupos de WhatsApp."
              : `Seu atendimento registrado como ${acesso.gestorName}.`
          }
        />

        <div className="mt-6">
          <StatsCards
            stats={[
              { label: "Mensagens", value: fmt(mensagens), icon: MessageSquare, accent: CHART_COLORS[0] },
              { label: "Grupos atendidos", value: fmt(grupos), icon: Users, accent: CHART_COLORS[1] },
              { label: "Respostas", value: fmt(respostas), icon: Reply, accent: CHART_COLORS[2] },
              { label: "Média por dia", value: fmt(mediaDiaria), icon: CalendarDays, accent: CHART_COLORS[3] },
            ]}
          />
        </div>

        <GestorCharts resumo={resumo} diario={diario} isAdmin={acesso.isAdmin} />

        <p className="mt-6 text-xs text-muted-foreground">
          Este painel mostra <strong className="font-medium text-foreground">volume de atendimento</strong>. O lead time
          de trilha — abertura por menção, repasse e fechamento, descrito em <code>TRILHAS.md</code> — ainda não está
          implementado aqui.
        </p>
      </main>
    </div>
  );
}
