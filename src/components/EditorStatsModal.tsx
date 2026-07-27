import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";
import { formatDuration } from "@/lib/time";

type VideoEdit = Tables<"video_edits">;

interface EditorStatsModalProps {
  editor: string | null;
  edits: VideoEdit[];
  color: string;
  onClose: () => void;
}

// pauses is Json — normalize to an array of pause-shaped objects defensively.
const asPauses = (p: VideoEdit["pauses"]): { reason?: unknown }[] =>
  Array.isArray(p) ? (p as { reason?: unknown }[]) : [];

export function EditorStatsModal({ editor, edits, color, onClose }: EditorStatsModalProps) {
  // Modal-local date range narrowing (independent of the dashboard period).
  // Empty = fall back to the incoming (dashboard-filtered) edits.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Reset the local range whenever the modal opens for a different editor.
  useEffect(() => {
    setFrom("");
    setTo("");
  }, [editor]);

  const rangeActive = !!from || !!to;

  const stats = useMemo(() => {
    let rows = editor ? edits.filter((e) => e.editor_name === editor) : [];
    // Narrow to the modal range on top of the incoming period (ISO string compare).
    if (from) rows = rows.filter((e) => e.edit_date >= from);
    if (to) rows = rows.filter((e) => e.edit_date <= to);
    // Legacy rows carry elapsed_seconds 0 / pauses [] — exclude from time & pause averages.
    const timed = rows.filter((e) => e.elapsed_seconds > 0);

    const videos = rows.reduce((s, e) => s + e.quantity, 0);

    const avgTime = timed.length
      ? formatDuration(Math.round(timed.reduce((s, e) => s + e.elapsed_seconds, 0) / timed.length))
      : "—";

    const avgPauses = timed.length
      ? timed.reduce((s, e) => s + asPauses(e.pauses).length, 0) / timed.length
      : null;

    // Formatos: sum of quantity per video_format (matches the app's "Por Formato" pie
    // and totals to "Vídeos editados").
    const formatCounts: Record<string, number> = {};
    rows.forEach((e) => {
      formatCounts[e.video_format] = (formatCounts[e.video_format] || 0) + e.quantity;
    });
    const formats = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);

    return { videos, avgTime, avgPauses, formats };
  }, [editor, edits, from, to]);

  const avgPausesLabel =
    stats.avgPauses === null
      ? "—"
      : stats.avgPauses.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <Dialog open={!!editor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
            <DialogTitle>{editor ?? ""}</DialogTitle>
          </div>
          <DialogDescription>
            {rangeActive ? "Estatísticas do período personalizado" : "Estatísticas do período selecionado"}
          </DialogDescription>
        </DialogHeader>

        {/* Filtro de período (De / Até) — independente do filtro do dashboard */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Período
            </span>
            {rangeActive && (
              <button
                type="button"
                onClick={() => {
                  // eslint-disable-next-line react-hooks/set-state-in-effect -- comportamento do original: reset do range ao trocar de editor
                  setFrom("");
                  setTo("");
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">De</span>
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 min-w-0 text-xs"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Até</span>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 min-w-0 text-xs"
              />
            </label>
          </div>
        </div>

        {/* Hero — vídeos editados */}
        <div
          className="relative overflow-hidden rounded-lg border px-4 py-3"
          style={{
            borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 14%, transparent), transparent 70%)`,
          }}
        >
          <div
            className="font-heading text-4xl font-bold leading-none tabular-nums"
            style={{ color }}
          >
            {stats.videos}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">Vídeos editados</div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="font-heading text-xl font-semibold tabular-nums">{stats.avgTime}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tempo médio</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="font-heading text-xl font-semibold tabular-nums">{avgPausesLabel}</div>
            <div className="mt-1 text-xs text-muted-foreground">Pausas / vídeo</div>
          </div>
        </div>

        {/* Formatos */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Formatos
          </h4>
          {stats.formats.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.formats.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs"
                >
                  <span className="text-foreground">{name}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sem dados</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
