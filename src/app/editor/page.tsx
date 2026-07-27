import { Calendar, Clapperboard, Film, Timer } from "lucide-react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { EditorCharts } from "@/components/editor-charts";
import { PainelHeader } from "@/components/painel-shell";
import { StatsCards } from "@/components/stats-cards";
import { loadEditorMetrics, loadEditorRows } from "@/lib/editor";
import { CHART_COLORS } from "@/lib/chart-theme";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Edição · KPI F3F" };

function horas(segundos: number) {
  if (!segundos) return "—";
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

export default async function EditorPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.panels.includes("editor")) redirect("/");

  // Admin vê todos os editores; editor vê só as próprias edições.
  const escopo = acesso.isAdmin ? undefined : acesso.editorName;
  const [metricas, rows] = await Promise.all([loadEditorMetrics(escopo), loadEditorRows(escopo)]);

  const totalVideos = metricas.reduce((s, m) => s + m.totalVideos, 0);
  const totalSegundos = metricas.reduce((s, m) => s + m.segundosTrabalhados, 0);
  const emAndamento = metricas.reduce((s, m) => s + m.emAndamento, 0);
  const mediaPorEditor = metricas.length ? Math.round(totalVideos / metricas.length) : 0;

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader activeItem="editor" fullName={acesso.editorName ?? acesso.email} panels={acesso.panels} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <PainelHeader
          titulo="Edição de vídeo"
          descricao={
            acesso.isAdmin
              ? "Entregas de todos os editores, com tempo cronometrado por lote."
              : `Suas entregas registradas como ${acesso.editorName}.`
          }
        />

        <div className="mt-6">
          <StatsCards
            stats={[
              { label: "Vídeos entregues", value: totalVideos.toLocaleString("pt-BR"), icon: Film, accent: CHART_COLORS[0] },
              acesso.isAdmin
                ? { label: "Média por editor", value: mediaPorEditor.toLocaleString("pt-BR"), icon: Clapperboard, accent: CHART_COLORS[1] }
                : { label: "Lotes", value: String(metricas[0]?.totalLotes ?? 0), icon: Clapperboard, accent: CHART_COLORS[1] },
              { label: "Tempo cronometrado", value: horas(totalSegundos), icon: Timer, accent: CHART_COLORS[2] },
              { label: "Em andamento", value: String(emAndamento), icon: Calendar, accent: CHART_COLORS[3] },
            ]}
          />
        </div>

        <EditorCharts edits={rows} isAdmin={acesso.isAdmin} />
      </main>
    </div>
  );
}
