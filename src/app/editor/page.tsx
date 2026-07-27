import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BarraComparativa, EstadoVazio, PainelHeader, PainelSecao, StatCard } from "@/components/painel-shell";
import { loadEditorMetrics } from "@/lib/editor";
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
  const metricas = await loadEditorMetrics(acesso.isAdmin ? undefined : acesso.editorName);

  const totalVideos = metricas.reduce((s, m) => s + m.totalVideos, 0);
  const totalSegundos = metricas.reduce((s, m) => s + m.segundosTrabalhados, 0);
  const emAndamento = metricas.reduce((s, m) => s + m.emAndamento, 0);
  const formatos = new Map<string, number>();
  for (const m of metricas) for (const f of m.porFormato) formatos.set(f.formato, (formatos.get(f.formato) ?? 0) + f.videos);

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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard rotulo="Vídeos entregues" valor={totalVideos.toLocaleString("pt-BR")} destaque />
          <StatCard rotulo="Tempo cronometrado" valor={horas(totalSegundos)} detalhe="Soma dos cronômetros dos lotes" />
          <StatCard
            rotulo="Média por vídeo"
            valor={totalVideos && totalSegundos ? horas(Math.round(totalSegundos / totalVideos)) : "—"}
            detalhe="Só conta lote com cronômetro"
          />
          <StatCard rotulo="Em andamento" valor={String(emAndamento)} detalhe="Lotes ainda não concluídos" />
        </div>

        {acesso.isAdmin ? (
          <PainelSecao titulo="Por editor" descricao="Vídeos entregues, somando a quantidade de cada lote.">
            {metricas.length ? (
              <BarraComparativa
                itens={metricas.map((m) => ({
                  rotulo: m.editorName,
                  valor: m.totalVideos,
                  nota: m.segundosTrabalhados ? horas(m.segundosTrabalhados) : undefined,
                }))}
              />
            ) : (
              <EstadoVazio>Nenhuma edição registrada ainda.</EstadoVazio>
            )}
          </PainelSecao>
        ) : null}

        <PainelSecao titulo="Por formato" descricao="Distribuição das entregas entre os tipos de vídeo.">
          {formatos.size ? (
            <BarraComparativa
              itens={[...formatos.entries()]
                .map(([formato, videos]) => ({ rotulo: formato, valor: videos }))
                .sort((a, b) => b.valor - a.valor)}
            />
          ) : (
            <EstadoVazio>Nenhum formato registrado ainda.</EstadoVazio>
          )}
        </PainelSecao>
      </main>
    </div>
  );
}
