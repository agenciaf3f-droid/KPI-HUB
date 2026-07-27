export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatEstimate(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}

export function formatDueLabel(iso?: string): { label: string; late: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const diffMs = due.getTime() - Date.now();
  const diffH = diffMs / 3_600_000;
  const late = diffMs < 0;

  if (late) {
    const overdueMinutes = Math.round(Math.abs(diffMs) / 60_000);
    if (overdueMinutes < 60) return { label: `Atrasado ${Math.max(1, overdueMinutes)}min`, late: true };
    const overdueH = Math.abs(diffH);
    return {
      label: overdueH < 24 ? `Atrasado ${Math.round(overdueH)}h` : `Atrasado ${Math.round(overdueH / 24)}d`,
      late: true,
    };
  }
  const remainingMinutes = Math.ceil(diffMs / 60_000);
  if (remainingMinutes < 60) return { label: `Vence em ${Math.max(1, remainingMinutes)}min`, late: false };
  if (diffH < 24) return { label: `Vence em ${Math.round(diffH)}h`, late: false };
  return { label: `Vence em ${Math.round(diffH / 24)}d`, late: false };
}
