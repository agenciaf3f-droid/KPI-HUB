import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Resolução de sessão entre os três painéis.
 *
 * Os três sistemas identificam a mesma pessoa de jeitos incompatíveis e não há
 * chave que os ligue no banco:
 *
 *   Creator → `creator_profiles.id` = `auth.users.id` (UUID, o único que faz certo)
 *   Editor  → `controle_edicao.video_edits.editor_name` — TEXTO LIVRE ("Lucas", "Damião")
 *   Gestor  → coluna `Gestor` de `public."Controle de Mensagens"` — TEXTO LIVRE
 *
 * Com painéis por função nenhum join entre sistemas é necessário: cada painel
 * agrupa pelo seu próprio identificador. O que o app único exige é só isto —
 * dado o email logado, quais painéis ele abre e qual identidade ele tem em cada um.
 *
 * O mapa abaixo substitui dois lugares onde essa informação vivia hardcoded no
 * cliente: `EDITOR_BY_EMAIL` (Dash-Editores, `src/lib/auth.tsx`) e o roster do
 * `api/config.js` (Dash-Gestores).
 */

export type Panel = "creator" | "editor" | "gestor";

export type PanelAccess = {
  email: string;
  panels: Panel[];
  isAdmin: boolean;
  /** Valor exato de `video_edits.editor_name`. Divergir = o editor vê lista vazia. */
  editorName?: string;
  /** Valor exato da coluna `Gestor` em `Controle de Mensagens`. */
  gestorName?: string;
  /**
   * Setor no `GESTOR_ROSTER` — "TRAFEGO", "ESTRATEGIA" ou "CRIACAO".
   *
   * Existe porque o painel do gestor filtra pela coluna `Gestor`, e essa coluna
   * só tem gestor de tráfego. Quem é de estratégia não aparece nela: o trabalho
   * dele é creditado por telefone, na trilha de estratégia. Sem saber o setor, o
   * painel filtra por um nome que não existe na coluna e abre vazio.
   */
  setor?: string;
  /** `creator_profiles.id` — resolvido no banco, não neste mapa. */
  creatorProfileId?: string;
  /** `hub_members.id` — presente quando o acesso veio da tabela. */
  memberId?: string;
  /** `hub_members.nome` — nome de exibição. */
  fullName?: string;
  avatarUrl?: string;
  /** Ainda está com a senha do convite: o hub exige trocar antes de liberar. */
  senhaProvisoria?: boolean;
};

/** Linha de `public.hub_members` — a fonte de verdade de acesso desde a 0009. */
export type HubMemberRow = {
  id: string;
  email: string;
  nome: string;
  areas: string[];
  is_admin: boolean;
  avatar_url: string | null;
  senha_provisoria?: boolean;
};

type PanelIdentity = {
  editorName?: string;
  gestorName?: string;
  isAdmin?: boolean;
};

/**
 * Fonte: `auth.users` de `ulikfkemdawinetjyhok`, `DISTINCT editor_name` de
 * `controle_edicao.video_edits` e o env `ROSTER` do projeto Vercel `leadtime`.
 *
 * Os nomes precisam bater CARACTERE A CARACTERE com o que está gravado — as duas
 * colunas são texto livre, sem FK. `Gabriel\n` já existe no banco como uma
 * "pessoa" separada por causa de um `\n` no fim.
 */
const IDENTITY_BY_EMAIL: Record<string, PanelIdentity> = {
  // Um membro = uma entrada. Emails alternativos da mesma pessoa (arthurepda@,
  // iloveyouuuudnz@, denzelmmnt.psd@, denzel.martins69@) ficam de fora de
  // propósito — logam, mas sem painel, até decidirmos consolidar as contas.
  "agenciaf3f@gmail.com": { isAdmin: true, editorName: "Admin" },          // Arthur — admin dos 3 painéis
  "iriacridesdamiaopinhas@gmail.com": { editorName: "Damião" },            // editor (560 edições)
  "lucasmaiasct2187@gmail.com": { editorName: "Lucas" },                   // editor (400 edições)
  "diegobrandotheworld472@gmail.com": { gestorName: "Denzel" },            // designer do creator + gestor
  // Gestores do ROSTER ainda SEM login no Supabase — quando criarem conta,
  // preencher o email aqui (o gestorName tem que bater com a coluna "Gestor"):
  // "?": { gestorName: "Raphael" },   "?": { gestorName: "Rafhael" },
  // "?": { gestorName: "Diogo" },     "?": { gestorName: "Gabriel" },
  // "?": { gestorName: "Guilherme" }, "?": { gestorName: "Yuri" },
  // "?": { gestorName: "Paulo" },     (Paulo/Arthur: sem linhas na tabela ainda)
};

/**
 * Equipe do painel do gestor, decodificada do env `ROSTER` (base64 → JSON).
 * Ainda sem email — quem não estiver em `IDENTITY_BY_EMAIL` não abre o painel.
 * Preencher conforme cada gestor ganhar login.
 */
export const GESTOR_ROSTER = [
  { nome: "Raphael", setor: "TRAFEGO" },
  { nome: "Rafhael", setor: "TRAFEGO" },
  { nome: "Diogo", setor: "TRAFEGO" },
  { nome: "Gabriel", setor: "TRAFEGO" },
  { nome: "Guilherme", setor: "TRAFEGO" },
  { nome: "Yuri", setor: "TRAFEGO" },
  { nome: "Paulo", setor: "ESTRATEGIA" },
  { nome: "Arthur", setor: "ESTRATEGIA" },
  { nome: "Denzel", setor: "CRIACAO" },
] as const;

/** Setor da pessoa no roster. `undefined` para quem não está lá. */
export function setorNoRoster(nome: string | undefined): string | undefined {
  if (!nome) return undefined;
  const alvo = nome.trim().toLowerCase();
  return GESTOR_ROSTER.find((m) => m.nome.toLowerCase() === alvo)?.setor;
}

/**
 * Parte pura — testável sem banco. Converte uma linha de `hub_members` no
 * acesso dela: `areas` → painéis na ordem da sidebar (gestor, editor, creator);
 * admin abre os três. `editorName`/`gestorName` saem do `nome` — que precisa
 * bater caractere a caractere com as colunas de texto livre dos painéis.
 */
export function memberToAccess(member: HubMemberRow): PanelAccess {
  const isAdmin = member.is_admin === true;
  const has = (area: string) => isAdmin || member.areas.includes(area);

  const panels: Panel[] = [];
  if (has("gestor")) panels.push("gestor");
  if (has("editor")) panels.push("editor");
  if (has("creator")) panels.push("creator");

  return {
    email: member.email.trim().toLowerCase(),
    panels,
    isAdmin,
    // "Admin" preserva o comportamento do mapa antigo: o painel do Editor
    // mostra "Visão administrativa" e não filtra por editor_name.
    editorName: isAdmin ? "Admin" : member.areas.includes("editor") ? member.nome : undefined,
    gestorName: member.areas.includes("gestor") ? member.nome : undefined,
    setor: setorNoRoster(member.nome),
    memberId: member.id,
    fullName: member.nome,
    avatarUrl: member.avatar_url ?? undefined,
    senhaProvisoria: member.senha_provisoria === true,
  };
}

/** Parte pura — testável sem banco. */
export function resolveIdentity(email: string, creatorProfileId?: string): PanelAccess {
  const key = email.trim().toLowerCase();
  const identity = IDENTITY_BY_EMAIL[key] ?? {};
  const isAdmin = identity.isAdmin === true;

  const panels: Panel[] = [];
  if (creatorProfileId) panels.push("creator");
  if (isAdmin || identity.editorName) panels.push("editor");
  if (isAdmin || identity.gestorName) panels.push("gestor");

  return {
    email: key,
    panels,
    isAdmin,
    editorName: identity.editorName,
    gestorName: identity.gestorName,
    setor: identity.gestorName ? setorNoRoster(identity.gestorName) : undefined,
    creatorProfileId,
  };
}

/**
 * Resolve a sessão atual. Devolve `null` se não houver usuário logado.
 * `cache()`: no mesmo request, páginas que chamam getCurrentProfile E
 * getPanelAccess pagam UMA ida ao Supabase, não duas de cada.
 */
export const getPanelAccess = cache(async (): Promise<PanelAccess | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // Fonte de verdade: hub_members (sem policies — só o service role lê).
  if (isSupabaseAdminConfigured()) {
    const { data: member } = await createAdminClient()
      .from("hub_members")
      .select("id, email, nome, areas, is_admin, avatar_url, senha_provisoria")
      .eq("email", user.email.trim().toLowerCase())
      .maybeSingle();
    if (member) return memberToAccess(member as HubMemberRow);
  }

  // Fallback: mapa hardcoded + creator_profiles (contas anteriores à 0009).
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return resolveIdentity(user.email, profile?.id);
});
