import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FormatBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Hourglass, Film, Link2, RotateCcw } from "lucide-react";
import { useAddEditedLink, useReopenEditing } from "@/hooks/useVideoEdits";
import { formatDuration, brTime } from "@/lib/time";
import { jsonStringList } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type VideoEdit = Tables<"video_edits">;

interface AwaitingLinkProps {
  edits: VideoEdit[];
}

export function AwaitingLink({ edits }: AwaitingLinkProps) {
  if (edits.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-heading font-semibold">
        <Hourglass className="h-5 w-5 text-primary" />
        Aguardando Link
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {edits.map((edit) => (
          <AwaitingLinkCard key={edit.id} edit={edit} />
        ))}
      </div>
    </section>
  );
}

function AwaitingLinkCard({ edit }: { edit: VideoEdit }) {
  const addLink = useAddEditedLink();
  const reopen = useReopenEditing();

  // Um link editado por vídeo do lote.
  const quantity = Math.max(1, edit.quantity ?? 1);
  const shownRawLinks = jsonStringList(edit.raw_links, edit.raw_link);
  // Um nome por vídeo; lotes antigos podem ter menos nomes que `quantity`.
  const videoNames = jsonStringList(edit.video_names, edit.video_name);
  const [open, setOpen] = useState(false);
  const [editedLinks, setEditedLinks] = useState<string[]>(() => Array(quantity).fill(""));

  const allFilled = editedLinks.every((l) => l.trim());

  const setEditedLinkAt = (i: number, value: string) =>
    setEditedLinks((prev) => prev.map((l, idx) => (idx === i ? value : l)));

  // Safety net: if this card unmounts mid-dialog-close (adding the link removes
  // it from the queue), ensure Radix's body pointer-events lock is never stranded.
  useEffect(
    () => () => {
      document.body.style.pointerEvents = "";
    },
    [],
  );

  const handleConfirmLink = () => {
    if (!allFilled) return;
    // Close synchronously first: adding the link moves this edit to `done`,
    // unmounting this card. Closing before the refetch avoids the pointer-events bug.
    setOpen(false);
    addLink.mutate({ id: edit.id, editedLinks: editedLinks.map((l) => l.trim()) });
    setEditedLinks(Array(quantity).fill(""));
  };

  const handleReopen = () => {
    reopen.mutate({ id: edit.id });
  };

  return (
    <Card data-testid="awaiting-link-card" className="border-l-2 border-l-muted-foreground/25">
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
            {quantity > 1 && (
              <span className="text-sm font-medium text-muted-foreground">×{quantity}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tempo
            </p>
            <span className="font-heading text-2xl font-bold tabular-nums tracking-tight">
              {formatDuration(edit.elapsed_seconds ?? 0)}
            </span>
          </div>
          {edit.finished_at && (
            <p className="text-xs text-muted-foreground">
              Concluído às {brTime(edit.finished_at)}
            </p>
          )}
        </div>

        {shownRawLinks.length > 0 && (
          <div className="space-y-1">
            {shownRawLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Film className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{link}</span>
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)} disabled={addLink.isPending}>
            <Link2 className="mr-1.5 h-4 w-4" />
            Adicionar Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReopen}
            disabled={reopen.isPending}
            title="Reabrir a edição e retomar o cronômetro"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Voltar ao timer
          </Button>
        </div>
      </CardContent>

      {/* Add-link dialog — normal button trigger (not nested in Select/Popover) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {quantity > 1
                ? `Adicionar links dos ${quantity} vídeos editados`
                : "Adicionar link do vídeo editado"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {editedLinks.map((link, i) => (
              <div key={i} className="space-y-2">
                <Label htmlFor={`edited-link-${edit.id}-${i}`}>
                  Link editado — {videoNames[i] || `Vídeo ${i + 1}`}
                </Label>
                <Input
                  id={`edited-link-${edit.id}-${i}`}
                  value={link}
                  onChange={(e) => setEditedLinkAt(i, e.target.value)}
                  placeholder="https://..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmLink();
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmLink} disabled={!allFilled || addLink.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
