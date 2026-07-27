/**
 * Paleta dos gráficos.
 *
 * A estrutura dos gráficos veio dos projetos Dash-Editores e Dash-Gestores; só
 * as cores mudaram. Os cinco primeiros valores são exatamente os tokens
 * `--chart-1..5` de `globals.css` (o design system do Creator). Os dois últimos
 * completam a série para os casos com mais de cinco categorias, girando o matiz
 * dentro da mesma família violeta/âmbar em vez de importar cores de fora.
 *
 * Mudar o tema em `globals.css` deve mudar aqui junto — por isso os cinco
 * primeiros são cópia literal, não aproximação.
 */
export const CHART_COLORS = [
  "#8b5cf6", // --chart-1 · violeta (mesma da primária)
  "#c4b5fd", // --chart-2 · violeta claro
  "#ffbd75", // --chart-3 · âmbar
  "#b6ef77", // --chart-4 · lima
  "#cbbcf7", // --chart-5 · lavanda
  "#f4a6c7", // extensão · rosa
  "#7dd3e8", // extensão · ciano
] as const;

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Cor estável por nome — o mesmo editor mantém a mesma cor entre gráficos. */
export function colorByName(nome: string, ordem: string[]) {
  const i = ordem.indexOf(nome);
  return chartColor(i >= 0 ? i : 0);
}

/**
 * Eixos e grade leem os tokens do tema via `currentColor`/CSS vars, para
 * acompanhar claro e escuro sem duas paletas.
 */
export const AXIS_STYLE = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
} as const;

export const GRID_STROKE = "var(--border)";
