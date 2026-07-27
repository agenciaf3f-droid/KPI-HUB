import { Clock, Play, Eye, Wrench, Lock, CheckCircle2, Circle } from "lucide-react";
import { STATUS_LABEL, type Delivery, type DeliveryStatus } from "@/lib/types";
import { DeliveryCard, type DeliveryAction } from "@/components/delivery-card";

const ICON: Record<DeliveryStatus, React.ComponentType<{ className?: string }>> = {
  criada: Circle,
  em_producao: Play,
  pausada: Clock,
  aguardando_revisao: Eye,
  em_ajuste: Wrench,
  bloqueada: Lock,
  entregue: CheckCircle2,
  cancelada: Circle,
};

const ICON_COLOR: Record<DeliveryStatus, string> = {
  criada: "text-muted-foreground",
  em_producao: "text-primary",
  pausada: "text-amber-400",
  aguardando_revisao: "text-sky-400",
  em_ajuste: "text-amber-400",
  bloqueada: "text-destructive",
  entregue: "text-emerald-400",
  cancelada: "text-muted-foreground",
};

export function StatusSection({
  status,
  deliveries,
  onTransition,
  onDelete,
}: {
  status: DeliveryStatus;
  deliveries: Delivery[];
  onTransition: (id: string, action: DeliveryAction, driveUrl?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const Icon = ICON[status];
  const headingId = `status-${status}`;

  return (
    <section className="flex flex-col gap-3" aria-labelledby={headingId}>
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted"><Icon className={`size-3.5 ${ICON_COLOR[status]}`} /></span>
        <h2 id={headingId} className="text-base font-semibold tracking-[-0.02em] text-foreground">{STATUS_LABEL[status]}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{deliveries.length}</span>
      </div>

      {deliveries.length === 0 ? (
          <p className="rounded-2xl bg-muted px-4 py-5 text-sm text-muted-foreground">
          Nada por aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {deliveries.map((d) => (
            <DeliveryCard key={d.id} delivery={d} onTransition={onTransition} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
