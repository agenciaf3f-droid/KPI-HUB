import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
  /** `creator_profiles.id` — resolvido no banco, não neste mapa. */
  creatorProfileId?: string;
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
  "agenciaf3f@gmail.com": { isAdmin: true, editorName: "Admin" },
  "iriacridesdamiaopinhas@gmail.com": { editorName: "Damião" },
  "lucasmaiasct2187@gmail.com": { editorName: "Lucas" },
  "diegobrandotheworld472@gmail.com": { gestorName: "Denzel" },
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

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return resolveIdentity(user.email, profile?.id);
});
