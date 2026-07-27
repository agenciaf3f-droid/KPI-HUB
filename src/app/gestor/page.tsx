import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BarraComparativa, EstadoVazio, PainelHeader, PainelSecao, StatCard } from "@/components/painel-shell";
import { SETOR_POR_GESTOR, loadGestorMetrics } from "@/lib/gestor";
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

  // Últimos 30 dias, somando todos os gestores da visão atual.
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard rotulo="Mensagens" valor={fmt(mensagens)} destaque />
          <StatCard rotulo="Grupos atendidos" valor={fmt(grupos)} />
          <StatCard rotulo="Respostas" valor={fmt(respostas)} detalhe="Mensagens que citam outra" />
          <StatCard rotulo="Média por dia" valor={fmt(mediaDiaria)} detalhe="Últimos 30 dias com registro" />
        </div>

        {acesso.isAdmin ? (
          <PainelSecao titulo="Por gestor" descricao="Volume de mensagens no período completo.">
            {resumo.length ? (
              <BarraComparativa
                itens={resumo.map((r) => ({
                  rotulo: SETOR_POR_GESTOR[r.gestor] ? `${r.gestor} · ${SETOR_POR_GESTOR[r.gestor]}` : r.gestor,
                  valor: r.mensagens,
                  nota: `${fmt(r.grupos)} grupos`,
                }))}
              />
            ) : (
              <EstadoVazio>Nenhum atendimento registrado.</EstadoVazio>
            )}
          </PainelSecao>
        ) : null}

        <PainelSecao titulo="Últimos 30 dias" descricao="Mensagens por dia.">
          {ultimos30.length ? (
            <BarraComparativa
              itens={ultimos30.map(([dia, valor]) => ({
                rotulo: new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                valor,
              }))}
            />
          ) : (
            <EstadoVazio>Sem registro nos últimos 90 dias.</EstadoVazio>
          )}
        </PainelSecao>

        <p className="mt-6 text-xs text-muted-foreground">
          Este painel mostra <strong className="font-medium text-foreground">volume de atendimento</strong>. O lead time
          de trilha — abertura por menção, repasse e fechamento, descrito em <code>TRILHAS.md</code> — ainda não está
          implementado aqui.
        </p>
      </main>
    </div>
  );
}
