import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Painel do Gestor — lê as views `kpi_gestor_resumo` e `kpi_gestor_diario`
 * (migration `0008_kpi_gestor_views.sql`), não a tabela crua.
 *
 * A tabela `public."Controle de Mensagens"` tem ~109 mil linhas e carrega
 * mensagem de cliente. Duas razões para não tocá-la daqui:
 *   1. Puxar 109k linhas por request é o que trava a tela.
 *   2. É dado sensível — só sai por `service_role`, no servidor. As views não
 *      têm grant para `anon` nem `authenticated`.
 *
 * ESCOPO: o que está aqui é volume de atendimento (mensagens, grupos, respostas).
 * O **lead time de trilha** descrito em `KPI-GESTOR/TRILHAS.md` — abrir trilha por
 * `@`/reply, repasse, fechamento, cronômetro por dono — é uma máquina de estados
 * sobre a sequência de mensagens e ainda NÃO está implementada aqui.
 */

export type GestorResumo = {
  gestor: string;
  mensagens: number;
  grupos: number;
  respostas: number;
  primeiroDia: string;
  ultimoDia: string;
};

export type GestorDia = { gestor: string; dia: string; mensagens: number };

export type GestorMetrics = {
  resumo: GestorResumo[];
  diario: GestorDia[];
};

/** `gestorName` nulo = visão de admin (todos os gestores). */
export async function loadGestorMetrics(gestorName?: string): Promise<GestorMetrics> {
  const admin = createAdminClient();

  let resumoQuery = admin
    .from("kpi_gestor_resumo")
    .select("gestor, mensagens, grupos, respostas, primeiro_dia, ultimo_dia")
    .order("mensagens", { ascending: false });
  let diarioQuery = admin
    .from("kpi_gestor_diario")
    .select("gestor, dia, mensagens")
    .order("dia", { ascending: true });

  if (gestorName) {
    resumoQuery = resumoQuery.eq("gestor", gestorName);
    diarioQuery = diarioQuery.eq("gestor", gestorName);
  }

  const [resumoRes, diarioRes] = await Promise.all([resumoQuery, diarioQuery]);
  if (resumoRes.error) throw resumoRes.error;
  if (diarioRes.error) throw diarioRes.error;

  return {
    resumo: (resumoRes.data ?? []).map((r) => ({
      gestor: r.gestor as string,
      mensagens: Number(r.mensagens),
      grupos: Number(r.grupos),
      respostas: Number(r.respostas),
      primeiroDia: r.primeiro_dia as string,
      ultimoDia: r.ultimo_dia as string,
    })),
    diario: (diarioRes.data ?? []).map((d) => ({
      gestor: d.gestor as string,
      dia: d.dia as string,
      mensagens: Number(d.mensagens),
    })),
  };
}

/** Setor de cada pessoa, do env `ROSTER` do projeto Vercel `leadtime`. */
export const SETOR_POR_GESTOR: Record<string, string> = {
  Raphael: "Tráfego",
  Rafhael: "Tráfego",
  Diogo: "Tráfego",
  Gabriel: "Tráfego",
  Guilherme: "Tráfego",
  Yuri: "Tráfego",
  Paulo: "Estratégia",
  Arthur: "Estratégia",
  Denzel: "Criação",
};
