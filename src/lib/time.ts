/**
 * Format a duration in seconds as a compact string, e.g.
 * 5025 -> "1h 23m 45s", 303 -> "5m 3s", 12 -> "12s", 0 -> "0s".
 * Leading zero units are omitted; seconds are always shown when nothing else is.
 */
export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

// Todas as timestamps são exibidas no horário de Brasília (America/Sao_Paulo),
// independente do fuso do navegador/PC de quem está olhando.
const BR_TZ = "America/Sao_Paulo";

/** ISO UTC → "HH:mm" no horário de Brasília. */
export function brTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: BR_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO UTC → "dd/MM/yyyy HH:mm" no horário de Brasília. */
export function brDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: BR_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
