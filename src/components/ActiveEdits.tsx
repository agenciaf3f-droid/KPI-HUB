import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, FormatBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause as PauseIcon, Play, CheckCircle2, Timer } from "lucide-react";
import { usePauseEdit, useResumeEdit, useFinishEditing, type Pause } from "@/hooks/useVideoEdits";
import { formatDuration, brTime } from "@/lib/time";
import { cn, jsonStringList } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type VideoEdit = Tables<"video_edits">;

interface ActiveEditsProps {
  edits: VideoEdit[];
}

export function ActiveEdits({ edits }: ActiveEditsProps) {
  if (edits.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-heading font-semibold">
        <Timer className="h-5 w-5 text-primary" />
        Em Andamento
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {edits.map((edit) => (
          <ActiveEditCard key={edit.id} edit={edit} />
        ))}
      </div>
    </section>
  );
}

function ActiveEditCard({ edit }: { edit: VideoEdit }) {
  const pauseEdit = usePauseEdit();
  const resumeEdit = useResumeEdit();
  const finishEditing = useFinishEditing();

  const isEditing = edit.status === "editing";
  // Um nome por vídeo do lote; linhas antigas só têm a coluna singular.
  const videoNames = jsonStringList(edit.video_names, edit.video_name);
  const pauses = (edit.pauses as unknown as Pause[]) ?? [];
  // Lote criado mas nunca iniciado: cronômetro parado em 0 e nenhuma pausa registrada.
  // (Uma edição pausada de verdade tem tempo acumulado e/ou intervalos de pausa.)
  const neverStarted =
    edit.status === "paused" && (edit.elapsed_seconds ?? 0) === 0 && pauses.length === 0;
  const lastPausedAt =
    edit.status === "paused" && pauses.length > 0 ? pauses[pauses.length - 1].paused_at : null;

  // Live ticking clock: re-render every second while running.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isEditing) return;
    setNow(Date.now()); // sync immediately so resuming doesn't briefly dip
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isEditing]);

  // Safety net: if this card unmounts mid-dialog-close, ensure Radix's body
  // pointer-events lock can never be stranded (black-screen guard).
  useEffect(() => () => {
    document.body.style.pointerEvents = "";
  }, []);

  const elapsed =
    (edit.elapsed_seconds ?? 0) +
    (isEditing && edit.timer_started_at ? (now - Date.parse(edit.timer_started_at)) / 1000 : 0);

  // Pausing is immediate — no reason dialog.
  const handlePause = () => {
    pauseEdit.mutate({ id: edit.id, elapsedSeconds: Math.round(elapsed), pauses });
  };

  const handleResume = () => {
    resumeEdit.mutate({ id: edit.id, pauses });
  };

  // "Feito": trava o timer no valor atual e move para "Aguardando Link" (sem dialog).
  const handleFinishEditing = () => {
    finishEditing.mutate({ id: edit.id, elapsedSeconds: Math.round(elapsed) });
  };

  return (
    <Card
      data-testid="active-edit-card"
      className={cn(
        "border-l-2",
        isEditing
          ? "border-l-primary ring-1 ring-primary/15 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05),0_0_44px_-22px_color-mix(in_srgb,var(--primary)_85%,transparent)]"
          : "border-l-muted-foreground/25",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="truncate font-medium"
              title={videoNames.length > 1 ? videoNames.join(" · ") : undefined}
            >
              {videoNames[0] || "Sem nome"}
              {videoNames.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  +{videoNames.length - 1}
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {edit.client_name} · {edit.editor_name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FormatBadge format={edit.video_format} />
            {edit.quantity > 1 && (
              <span className="text-sm font-medium text-muted-foreground">×{edit.quantity}</span>
            )}
            <Badge
              variant="outline"
              className={
                isEditing
                  ? "gap-1.5 border-primary/40 bg-gradient-to-r from-primary/25 to-primary/10 text-primary shadow-[0_0_16px_-6px_color-mix(in_srgb,var(--primary)_85%,transparent)]"
                  : "text-muted-foreground"
              }
            >
              {isEditing && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
              )}
              {isEditing ? "Editando" : neverStarted ? "Não iniciado" : "Pausado"}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tempo
          </p>
          <span
            data-testid="active-timer"
            className={cn(
              "font-heading text-3xl font-bold tabular-nums tracking-tight",
              isEditing && "text-primary",
            )}
            style={isEditing ? { textShadow: "0 0 24px color-mix(in srgb, var(--primary) 40%, transparent)" } : undefined}
          >
            {formatDuration(elapsed)}
          </span>
        </div>

        {lastPausedAt && (
          <div className="flex items-center gap-2 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs">
            <PauseIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              Pausado às {brTime(lastPausedAt)}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={handlePause} disabled={pauseEdit.isPending}>
              <PauseIcon className="mr-1.5 h-4 w-4" />
              Pausar
            </Button>
          ) : (
            <Button
              variant={neverStarted ? "default" : "outline"}
              size="sm"
              onClick={handleResume}
              disabled={resumeEdit.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {neverStarted ? "Começar" : "Retomar"}
            </Button>
          )}
          <Button
            variant={neverStarted ? "outline" : "default"}
            size="sm"
            onClick={handleFinishEditing}
            disabled={!isEditing || finishEditing.isPending}
            title={
              !isEditing
                ? neverStarted
                  ? "Clique em Começar para iniciar o cronômetro"
                  : "Retome a edição para concluir"
                : undefined
            }
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Feito
          </Button>
          {!isEditing && (
            <span className="w-full text-[11px] text-muted-foreground">
              {neverStarted
                ? "Clique em Começar para iniciar o cronômetro."
                : "Retome a edição para concluir."}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
