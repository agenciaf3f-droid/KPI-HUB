import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Painel do Editor — lê `controle_edicao.video_edits` (schema isolado no mesmo
 * projeto Supabase). Portado do Dash-Editores.
 *
 * `editor_name` é TEXTO LIVRE, sem FK: o valor precisa bater caractere a
 * caractere com o que está gravado, senão o editor loga e vê lista vazia.
 * O mapa email→nome vive em `@/lib/panels`.
 */

export type VideoEditStatus = "done" | "running" | "paused" | "awaiting_link";

export type EditorMetrics = {
  editorName: string;
  totalVideos: number;
  totalLotes: number;
  segundosTrabalhados: number;
  /** Média de segundos por vídeo entregue. `null` quando não há tempo cronometrado. */
  mediaSegundosPorVideo: number | null;
  porFormato: { formato: string; videos: number }[];
  porDia: { dia: string; videos: number }[];
  emAndamento: number;
};

type EditRow = {
  editor_name: string;
  quantity: number | null;
  video_format: string | null;
  elapsed_seconds: number | null;
  status: string | null;
  edit_date: string;
};

/** Somatório por editor. `editorName` nulo = visão de admin (todos). */
export async function loadEditorMetrics(editorName?: string): Promise<EditorMetrics[]> {
  const admin = createAdminClient();
  let query = admin
    .schema("controle_edicao")
    .from("video_edits")
    .select("editor_name, quantity, video_format, elapsed_seconds, status, edit_date")
    .order("edit_date", { ascending: false });

  if (editorName) query = query.eq("editor_name", editorName);

  const { data, error } = await query;
  if (error) throw error;

  return aggregate((data ?? []) as EditRow[]);
}

/**
 * Agregação pura — sem I/O, testável isoladamente.
 *
 * `quantity` é o tamanho do lote: uma linha com `quantity: 5` é 5 vídeos, não 1.
 * Contar linhas em vez de somar `quantity` subestima a entrega do editor.
 */
export function aggregate(rows: EditRow[]): EditorMetrics[] {
  const porEditor = new Map<string, EditorMetrics & { _formato: Map<string, number>; _dia: Map<string, number> }>();

  for (const row of rows) {
    const nome = row.editor_name;
    if (!nome) continue;

    let m = porEditor.get(nome);
    if (!m) {
      m = {
        editorName: nome,
        totalVideos: 0,
        totalLotes: 0,
        segundosTrabalhados: 0,
        mediaSegundosPorVideo: null,
        porFormato: [],
        porDia: [],
        emAndamento: 0,
        _formato: new Map(),
        _dia: new Map(),
      };
      porEditor.set(nome, m);
    }

    const videos = row.quantity ?? 1;
    m.totalVideos += videos;
    m.totalLotes += 1;
    m.segundosTrabalhados += row.elapsed_seconds ?? 0;
    if (row.status && row.status !== "done") m.emAndamento += 1;

    const formato = row.video_format ?? "sem formato";
    m._formato.set(formato, (m._formato.get(formato) ?? 0) + videos);
    m._dia.set(row.edit_date, (m._dia.get(row.edit_date) ?? 0) + videos);
  }

  return [...porEditor.values()]
    .map(({ _formato, _dia, ...m }) => ({
      ...m,
      mediaSegundosPorVideo: m.segundosTrabalhados > 0 ? Math.round(m.segundosTrabalhados / m.totalVideos) : null,
      porFormato: [..._formato.entries()]
        .map(([formato, videos]) => ({ formato, videos }))
        .sort((a, b) => b.videos - a.videos),
      porDia: [..._dia.entries()]
        .map(([dia, videos]) => ({ dia, videos }))
        .sort((a, b) => a.dia.localeCompare(b.dia))
        .slice(-30),
    }))
    .sort((a, b) => b.totalVideos - a.totalVideos);
}
