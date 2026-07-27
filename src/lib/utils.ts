import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"

import { CHART_COLORS } from "@/lib/chart-theme"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cor estável por formato de vídeo — mesma semântica do Dash-Editores original
 * (a cor segue o formato, nunca a posição no dado), trocada a paleta: agora são
 * os tokens de gráfico do Creator (`@/lib/chart-theme`), não os HSL antigos.
 */
const FORMAT_COLOR: Record<string, string> = {
  VSL: CHART_COLORS[0],
  Criativo: CHART_COLORS[1],
  Ajuste: CHART_COLORS[2],
  IA: CHART_COLORS[3],
  CTAs: CHART_COLORS[4],
  Frank: CHART_COLORS[5],
  Hook: CHART_COLORS[6],
}

const colorOf = (name: string) => FORMAT_COLOR[name] ?? CHART_COLORS[0]

/** Cor sólida do formato — células de donut, swatches. */
export function formatColor(name: string): string {
  return colorOf(name)
}

/** Badge tintada e legível do formato (bg + borda + texto na cor). */
export function formatBadgeStyle(name: string): CSSProperties {
  const c = colorOf(name)
  return {
    color: c,
    backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${c} 32%, transparent)`,
  }
}

/**
 * Lista JSON com fallback legado — portada do Dash-Editores. Lotes gravam
 * `video_names`/`raw_links` como jsonb; linhas antigas só têm a coluna singular.
 */
export function jsonStringList(arr: unknown, legacy: string | null | undefined): string[] {
  const items = Array.isArray(arr)
    ? arr.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : []
  if (items.length > 0) return items
  return legacy && legacy.trim() ? [legacy] : []
}
