import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormatBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, List, Film, ExternalLink } from "lucide-react";
import { useDeleteVideoEdit, type Pause } from "@/hooks/useVideoEdits";
import type { Tables } from "@/integrations/supabase/types";
import { formatDuration, brTime } from "@/lib/time";
import { jsonStringList } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type VideoEdit = Tables<"video_edits">;

interface RecentEditsTableProps {
  edits: VideoEdit[];
}

// Nome de cada vídeo do lote (`video_names`); linhas antigas caem na coluna
// singular `video_name`. Mostra o primeiro + "+N" com a lista completa no title.
function VideoNames({ edit }: { edit: VideoEdit }) {
  const names = jsonStringList(edit.video_names, edit.video_name);
  if (names.length === 0) return <>—</>;
  return (
    <span title={names.length > 1 ? names.join(" · ") : undefined}>
      {names[0]}
      {names.length > 1 && (
        <span className="ml-1.5 text-xs text-muted-foreground/70">+{names.length - 1}</span>
      )}
    </span>
  );
}

function EditLinks({ edit }: { edit: VideoEdit }) {
  const rawLinks = jsonStringList(edit.raw_links, edit.raw_link);
  const editedLinks = jsonStringList(edit.edited_links, edit.edited_link);
  if (rawLinks.length === 0 && editedLinks.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rawLinks.map((link, i) => (
        <a
          key={`raw-${i}`}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={`Bruto ${i + 1}`}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Film className="h-4 w-4" />
        </a>
      ))}
      {editedLinks.map((link, i) => (
        <a
          key={`edited-${i}`}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={`Editado ${i + 1}`}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

export function RecentEditsTable({ edits }: RecentEditsTableProps) {
  const deleteEdit = useDeleteVideoEdit();

  const fmtTime = (e: VideoEdit) => (e.elapsed_seconds ? formatDuration(e.elapsed_seconds) : "—");

  // Intervalos de pausa (horário de Brasília) + tempo pausado total.
  const pauseInfo = (e: VideoEdit) => {
    const raw = e.pauses as unknown as Pause[];
    const pauses = Array.isArray(raw) ? raw : [];
    const intervals = pauses.map(
      (p) => `${brTime(p.paused_at)} – ${p.resumed_at ? brTime(p.resumed_at) : "…"}`
    );
    const totalSec = pauses.reduce(
      (s, p) => s + (p.resumed_at ? (Date.parse(p.resumed_at) - Date.parse(p.paused_at)) / 1000 : 0),
      0
    );
    return { intervals, totalSec };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <List className="h-5 w-5 text-primary" />
          Edições Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {edits.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhuma edição registrada ainda.
          </p>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider">
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nome do Vídeo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Editor</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Pausas</TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {edits.slice(0, 20).map((edit) => (
                    <TableRow key={edit.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                        <span className="block">
                          {format(new Date(edit.edit_date + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        <span className="block text-[11px] text-muted-foreground/70">
                          {brTime(edit.finished_at ?? edit.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{edit.client_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        <VideoNames edit={edit} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FormatBadge format={edit.video_format} />
                          {edit.quantity > 1 && (
                            <span className="text-sm font-medium text-muted-foreground">
                              ×{edit.quantity}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{edit.editor_name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {fmtTime(edit)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(() => {
                          const info = pauseInfo(edit);
                          if (info.intervals.length === 0) return "—";
                          return (
                            <div className="space-y-0.5">
                              {info.intervals.map((iv, i) => (
                                <div key={i} className="whitespace-nowrap tabular-nums">
                                  {iv}
                                </div>
                              ))}
                              {info.totalSec > 0 && (
                                <div className="text-[11px] text-muted-foreground/70">
                                  total {formatDuration(info.totalSec)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <EditLinks edit={edit} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEdit.mutate(edit.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="space-y-2.5 sm:hidden">
              {edits.slice(0, 20).map((edit) => (
                <div
                  key={edit.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{edit.client_name}</p>
                    {jsonStringList(edit.video_names, edit.video_name).length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        <VideoNames edit={edit} />
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
                      {format(new Date(edit.edit_date + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })} {brTime(edit.finished_at ?? edit.created_at)} · {edit.editor_name}
                      {edit.elapsed_seconds ? ` · ${formatDuration(edit.elapsed_seconds)}` : ""}
                    </p>
                    {pauseInfo(edit).intervals.length > 0 && (
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/80">
                        Pausas: {pauseInfo(edit).intervals.join(", ")}
                      </p>
                    )}
                    <div className="mt-1">
                      <EditLinks edit={edit} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <FormatBadge format={edit.video_format} />
                    {edit.quantity > 1 && (
                      <span className="text-xs font-medium text-muted-foreground">×{edit.quantity}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEdit.mutate(edit.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
