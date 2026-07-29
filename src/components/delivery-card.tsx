"use client";

import { Play, Pause, Check, Lock, Link as LinkIcon, ArrowRight, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveTimer } from "@/components/live-timer";
import { formatDueLabel, formatEstimate } from "@/lib/format";
import { STATUS_LABEL, type Delivery } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusDot: Record<Delivery["status"], string> = {
  criada: "bg-muted-foreground",
  em_producao: "bg-primary",
  pausada: "bg-[#f6c952]",
  aguardando_revisao: "bg-accent",
  em_ajuste: "bg-[#f6c952]",
  bloqueada: "bg-destructive",
  entregue: "bg-emerald-500",
  cancelada: "bg-muted-foreground",
};

export type DeliveryAction = "start" | "pause" | "review" | "complete" | "link" | "request_adjustment";

export function DeliveryCard({ delivery, onTransition, onDelete }: { delivery: Delivery; onTransition: (id: string, action: DeliveryAction, driveUrl?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const due = formatDueLabel(delivery.dueAt);
  const isActive = Boolean(delivery.activeSessionStartedAt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const ehLandingPage = delivery.deliveryType.toLocaleLowerCase("pt-BR") === "landing page";

  async function act(label: string, action: DeliveryAction, url?: string) {
    setIsSubmitting(true);
    try {
      await onTransition(delivery.id, action, url);
      toast.success(`${label}: "${delivery.title}"`);
      if (action === "complete") setFinishOpen(false);
    } catch {
      // A mensagem de erro é apresentada pelo workspace.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove() {
    setIsSubmitting(true);
    try {
      await onDelete(delivery.id);
      setDeleteOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className={cn(
        "gap-4 rounded-[1.5rem] border-0 py-5 transition-transform duration-200 hover:-translate-y-0.5",
        isActive
          ? "bg-primary/15 shadow-none"
          : "bg-muted shadow-none",
      )}
    >
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", statusDot[delivery.status])}
                aria-hidden="true"
              />
              {STATUS_LABEL[delivery.status]}
            </p>
            <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              {delivery.clientName}
              {delivery.projectName ? (
                <span className="font-normal text-muted-foreground"> — {delivery.projectName}</span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{delivery.title}</p>
          </div>
          {delivery.referenceUrl ? (
            <Button size="icon" variant="ghost" className="size-8 shrink-0 rounded-full bg-card" onClick={() => window.open(delivery.referenceUrl, "_blank", "noopener,noreferrer")} aria-label={`Abrir referência de ${delivery.title}`}>
              <LinkIcon />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: delivery.assigneeColor ?? "var(--primary)" }} />
            {delivery.deliveryType}
          </span>
          {delivery.quantity > 1 ? (
            <span>Quantidade {delivery.quantity}</span>
          ) : null}
          <span>Responsável: <strong className="font-medium text-foreground">{delivery.assigneeName}</strong></span>
          {delivery.adjustmentCount > 0 ? (
            <span className="text-[#b7791f] dark:text-[#f6c952]">{delivery.adjustmentCount} {delivery.adjustmentCount === 1 ? "ajuste" : "ajustes"}</span>
          ) : null}
          {due ? (
            <span className={due.late ? "font-medium text-destructive" : undefined}>{due.label}</span>
          ) : null}
        </div>

        {delivery.notes ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            {delivery.notes}
          </p>
        ) : null}

        {isActive ? (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Tempo</p>
            <LiveTimer
              startedAtIso={delivery.activeSessionStartedAt!}
              baseSeconds={delivery.activeSecondsAccumulated}
              className="font-mono text-2xl font-bold tabular-nums text-foreground"
            />
          </div>
        ) : delivery.estimateMinutes ? (
          <p className="text-xs text-muted-foreground">
            estimativa {formatEstimate(delivery.estimateMinutes)}
          </p>
        ) : null}

        {delivery.deliveryUrl ? <a href={delivery.deliveryUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Abrir entrega no Drive</a> : null}

        <div className="flex items-center gap-2 pt-1">
          <DeliveryActions status={delivery.status} onAction={act} onComplete={() => setFinishOpen(true)} onAdjustment={() => setAdjustmentOpen(true)} disabled={isSubmitting} />
          {delivery.status === "entregue" && delivery.adjustments?.length ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setHistoryOpen(true)}><History /> Histórico</Button> : null}
          {/* Landing page publica depois: o link entra sem mexer no timer nem no XP. */}
          {ehLandingPage && delivery.status === "entregue" ? (
            <Button size="sm" variant="outline" className="rounded-full" disabled={isSubmitting} onClick={() => { setDriveUrl(delivery.deliveryUrl ?? ""); setLinkOpen(true); }}>
              <LinkIcon /> {delivery.deliveryUrl ? "Atualizar link" : "Adicionar link"}
            </Button>
          ) : null}
          <Button type="button" size="icon" variant="ghost" className="ml-auto size-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Excluir ${delivery.title}`} onClick={() => setDeleteOpen(true)} disabled={isSubmitting}><Trash2 className="size-4" /></Button>
        </div>
      </CardContent>
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="rounded-[1.5rem] p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir entrega</DialogTitle>
            <DialogDescription>
              {ehLandingPage
                ? "A URL publicada é opcional aqui — você pode concluir agora e adicionar o link quando a página estiver no ar."
                : "Para registrar a conclusão, cole o link da pasta ou do arquivo final no Google Drive."}
            </DialogDescription>
          </DialogHeader>
          <Input value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder={ehLandingPage ? "https://... (opcional)" : "https://drive.google.com/..."} inputMode="url" />
          <DialogFooter>
            <Button type="button" className="rounded-full" disabled={isSubmitting || (!ehLandingPage && !driveUrl.trim())} onClick={() => act("Entrega concluída", "complete", driveUrl)}><Check /> {isSubmitting ? "Salvando..." : "Concluir entrega"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar ajuste</DialogTitle><DialogDescription>Descreva o que precisa ser alterado.</DialogDescription></DialogHeader><Textarea value={adjustmentDescription} onChange={(event) => setAdjustmentDescription(event.target.value)} placeholder="Ex.: Trocar a chamada principal..." /><DialogFooter><Button className="rounded-full" disabled={isSubmitting || !adjustmentDescription.trim()} onClick={async () => { await onTransition(delivery.id, "request_adjustment", adjustmentDescription); setAdjustmentDescription(""); setAdjustmentOpen(false); }}>Iniciar ajuste</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent><DialogHeader><DialogTitle>Histórico de alterações</DialogTitle></DialogHeader><div className="space-y-3 text-sm"><p>Tempo original: {formatSeconds(delivery.originalSeconds ?? delivery.activeSecondsAccumulated)}</p>{(delivery.adjustments ?? []).map((item) => <div key={item.id} className="rounded-xl bg-muted p-3"><p className="font-medium">{item.description}</p><p className="text-muted-foreground">{formatSeconds(item.seconds)}</p></div>)}<p className="font-semibold">Tempo total: {formatSeconds(delivery.activeSecondsAccumulated)}</p></div></DialogContent></Dialog>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="rounded-[1.5rem] p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{delivery.deliveryUrl ? "Atualizar link" : "Adicionar link"}</DialogTitle>
            <DialogDescription>Cole a URL pública da landing page. A demanda continua concluída — nada de timer ou XP muda.</DialogDescription>
          </DialogHeader>
          <Input value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://..." inputMode="url" />
          <DialogFooter>
            <Button type="button" className="rounded-full" disabled={isSubmitting || !driveUrl.trim()} onClick={async () => { await act("Link salvo", "link", driveUrl); setLinkOpen(false); }}><LinkIcon /> {isSubmitting ? "Salvando..." : "Salvar link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[1.5rem] p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir demanda?</DialogTitle>
            <DialogDescription>Esta ação remove a demanda, seus registros de tempo e o XP que ela concedeu. Não poderá ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setDeleteOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="button" variant="destructive" className="rounded-full" onClick={remove} disabled={isSubmitting}><Trash2 /> {isSubmitting ? "Excluindo..." : "Excluir demanda"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DeliveryActions({
  status,
  onAction,
  onComplete,
  onAdjustment,
  disabled,
}: {
  status: Delivery["status"];
  onAction: (label: string, action: DeliveryAction) => void;
  onComplete: () => void;
  onAdjustment: () => void;
  disabled: boolean;
}) {
  switch (status) {
    case "criada":
      return (
        <Button size="sm" className="rounded-full" disabled={disabled} onClick={() => onAction("Iniciar produção", "start")}>
          <Play /> Iniciar
        </Button>
      );
    case "em_producao":
      return (
        <>
          <Button size="sm" variant="outline" className="rounded-full" disabled={disabled} onClick={() => onAction("Timer pausado", "pause")}>
            <Pause /> Pausar
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" disabled={disabled} onClick={() => onAction("Enviado para revisão", "review")}>
            <ArrowRight /> Revisão
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={disabled}
            onClick={onComplete}
          >
            <Check /> Feito
          </Button>
        </>
      );
    case "pausada":
      return (
        <Button size="sm" className="rounded-full" disabled={disabled} onClick={() => onAction("Retomar produção", "start")}>
          <Play /> Retomar
        </Button>
      );
    // Em revisão a demanda ficava sem botão nenhum — entrava e não saía mais.
    // O tempo é a soma das sessões, então retomar continua de onde parou.
    case "aguardando_revisao":
      return (
        <>
          <Button size="sm" className="rounded-full" disabled={disabled} onClick={() => onAction("Retomada para produção", "start")}>
            <Play /> Retomar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={disabled}
            onClick={onComplete}
          >
            <Check /> Feito
          </Button>
        </>
      );
    case "em_ajuste":
      return (
        <Button size="sm" className="rounded-full" disabled={disabled} onClick={() => onAction("Iniciar ajuste", "start")}>
          <Play /> Ajustar
        </Button>
      );
    case "bloqueada":
      return (
        <Button size="sm" variant="outline" className="rounded-full" disabled={disabled} onClick={() => onAction("Desbloquear", "start")}>
          Desbloquear
        </Button>
      );
    case "entregue":
      return <Button size="sm" variant="outline" className="rounded-full" disabled={disabled} onClick={onAdjustment}>Solicitar ajuste</Button>;
    default:
      return null;
  }
}

function formatSeconds(seconds: number) { const minutes = Math.floor(seconds / 60); const hours = Math.floor(minutes / 60); return hours ? `${hours}h ${minutes % 60}min` : `${minutes}min`; }
