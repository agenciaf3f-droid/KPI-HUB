"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CapacityWidget } from "@/components/capacity-widget";
import { DeliveryCard } from "@/components/delivery-card";
import { NewDeliveryBar } from "@/components/new-delivery-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteDesignerButton } from "@/components/invite-designer-button";
import { STATUS_LABEL, type CreateDeliveryInput, type Delivery, type DeliveryStatus, type TeamMemberCapacity } from "@/lib/types";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SECTION_ORDER: DeliveryStatus[] = ["em_producao", "aguardando_revisao", "em_ajuste", "bloqueada", "criada", "pausada", "entregue"];
type StatusFilter = "todas" | DeliveryStatus;

export function ProductionWorkspace(props: { initialCapacity: TeamMemberCapacity[]; initialDeliveries: Delivery[]; role: AppRole; fullName: string; realtimeTopic?: string }) {
  const deliveryKey = props.initialDeliveries.map((delivery) => `${delivery.id}:${delivery.status}:${delivery.activeSessionStartedAt ?? ""}`).join("|");
  return <ProductionWorkspaceContent key={deliveryKey} {...props} />;
}

function ProductionWorkspaceContent({ initialCapacity, initialDeliveries, role, fullName, realtimeTopic }: { initialCapacity: TeamMemberCapacity[]; initialDeliveries: Delivery[]; role: AppRole; fullName: string; realtimeTopic?: string }) {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const router = useRouter();

  useEffect(() => {
    if (!realtimeTopic || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase.channel(realtimeTopic, { config: { private: false } }).on("broadcast", { event: "refresh" }, () => router.refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [realtimeTopic, router]);

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredDeliveries = useMemo(() => deliveries.filter((delivery) => {
    const matchesStatus = statusFilter === "todas" || delivery.status === statusFilter;
    const haystack = [delivery.clientName, delivery.projectName, delivery.title, delivery.deliveryType, delivery.assigneeName]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [deliveries, normalizedQuery, statusFilter]);

  async function createDelivery(input: CreateDeliveryInput) {
    const response = await fetch("/api/deliveries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const body = await response.json();
    if (!response.ok || !body.delivery) {
      toast.error(body.error ?? "Não foi possível iniciar a entrega.");
      throw new Error(body.error ?? "Não foi possível iniciar a entrega.");
    }
    setDeliveries((current) => [body.delivery, ...current]);
    setStatusFilter("em_producao");
    setQuery("");
  }

  async function transitionDelivery(id: string, action: "start" | "pause" | "review" | "complete", driveUrl?: string) {
    const response = await fetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, driveUrl }),
    });
    const body = await response.json();
    if (!response.ok || !body.delivery) {
      toast.error(body.error ?? "Não foi possível atualizar a entrega.");
      throw new Error(body.error ?? "Não foi possível atualizar a entrega.");
    }
    setDeliveries((current) => current.map((delivery) => delivery.id === id ? body.delivery : delivery));
  }

  async function deleteDelivery(id: string) {
    const response = await fetch(`/api/deliveries/${id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível excluir a entrega.");
      throw new Error(body.error ?? "Não foi possível excluir a entrega.");
    }
    setDeliveries((current) => current.filter((delivery) => delivery.id !== id));
    toast.success("Demanda excluída.");
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("todas");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-5 rounded-[2rem] bg-card px-6 py-7 sm:px-8 lg:flex-row lg:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{role === "admin" ? "Visão Administradora" : "Seu espaço de produção"}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Olá, {fullName.split(" ")[0]}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{role === "admin" ? "Acompanhe a equipe, distribua entregas e mantenha a operação no ritmo." : "Registre e acompanhe somente as suas entregas."}</p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2 lg:w-auto lg:items-end">
          {role === "admin" ? <InviteDesignerButton /> : null}
          <label className="relative flex h-12 w-full items-center gap-3 rounded-full bg-muted px-4 text-muted-foreground transition-shadow focus-within:ring-3 focus-within:ring-ring/25 lg:w-80">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Buscar entrega ou cliente</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0" placeholder="Buscar entrega ou cliente" />
            {query ? <Button type="button" variant="ghost" size="icon" aria-label="Limpar busca" className="size-7 shrink-0 rounded-full" onClick={() => setQuery("")}><X className="size-4" /></Button> : null}
          </label>
        </div>
      </header>

      <section className="rounded-[2rem] bg-card p-4 sm:p-6">
        <NewDeliveryBar onCreate={createDelivery} ownerName={fullName} />
      </section>

      {role === "admin" ? <section className="rounded-[2rem] bg-card p-4 sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Visão da semana</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Capacidade da equipe</h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">Planejado x disponível</p>
        </div>
        <CapacityWidget members={initialCapacity} />
      </section> : null}

      <section className="rounded-[2rem] bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Fila ativa</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Entregas em andamento</h2>
          </div>
          <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground" aria-live="polite">{filteredDeliveries.length} {filteredDeliveries.length === 1 ? "item encontrado" : "itens encontrados"}</span>
        </div>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filtrar entregas por status">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <FilterButton active={statusFilter === "todas"} onClick={() => setStatusFilter("todas")}>Todas</FilterButton>
          {SECTION_ORDER.map((status) => <FilterButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>{STATUS_LABEL[status]}</FilterButton>)}
        </div>

        {filteredDeliveries.length ? (
          <div className="mt-8 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onTransition={transitionDelivery}
                onDelete={deleteDelivery}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid place-items-center rounded-[1.5rem] bg-muted px-6 py-14 text-center">
            <div className="max-w-sm">
              <p className="text-lg font-semibold tracking-[-0.02em]">Nenhuma entrega encontrada</p>
              <p className="mt-2 text-sm text-muted-foreground">Tente outro termo ou limpe os filtros para voltar à fila completa.</p>
              <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={resetFilters}>Limpar filtros</Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <Button type="button" variant={active ? "default" : "outline"} size="sm" className="shrink-0 rounded-full" aria-pressed={active} onClick={onClick}>{children}</Button>;
}
