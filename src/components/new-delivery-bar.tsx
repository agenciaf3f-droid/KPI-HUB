"use client";

import { Plus, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientPicker } from "@/components/client-picker";
import type { CreateDeliveryInput } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_DELIVERY_TYPES = [
  "Post estático",
  "Carrossel",
  "Story ou pacote de stories",
  "Reel / vídeo curto",
  "Vídeo longo",
  "Banner",
  "Anúncio/criativo de tráfego",
  "E-mail marketing",
  "Apresentação",
  "Landing page",
  "Site institucional",
  "Identidade visual",
  "Peça impressa",
  "Outro",
];

export function NewDeliveryBar({ onCreate, ownerName }: { onCreate: (delivery: CreateDeliveryInput) => Promise<void>; ownerName: string }) {
  const [deliveryTypes, setDeliveryTypes] = useState(DEFAULT_DELIVERY_TYPES);
  const [deliveryType, setDeliveryType] = useState("");
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newType, setNewType] = useState("");

  useEffect(() => { fetch("/api/delivery-types").then((response) => response.json()).then((body) => { if (Array.isArray(body.types)) setDeliveryTypes((current) => [...new Set([...current, ...body.types.map((item: { name: string }) => item.name)])]); }); }, []);

  async function addType() {
    const name = newType.trim();
    if (!name) return;
    const response = await fetch("/api/delivery-types", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const body = await response.json();
    if (!response.ok) { toast.error(body.error ?? "Não foi possível salvar o tipo."); return; }
    setDeliveryTypes((current) => [...new Set([...current, body.type.name])]); setDeliveryType(body.type.name); setNewType(""); setNewTypeOpen(false); toast.success("Tipo salvo para as próximas entregas.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const quantity = Number(formData.get("quantity") ?? 1);

    if (!clientName || !deliveryType) {
      toast.error("Selecione o cliente e o tipo de entrega.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
      clientName,
      deliveryType,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      });
      event.currentTarget.reset();
      setClientName("");
      setDeliveryType("");
      toast.success("Entrega iniciada e timer ativado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-[1.5rem] bg-muted p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-3 text-foreground">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent"><Play className="size-3.5 fill-current" /></span>
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em]">Iniciar uma entrega</h2>
          <p className="text-xs text-muted-foreground">Registre o próximo item da sua fila.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-client" className="text-xs font-medium text-muted-foreground">Cliente</label>
          <ClientPicker id="delivery-client" value={clientName} onValueChange={setClientName} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Tipo de entrega</span>
          <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value ?? "")}>
            <SelectTrigger aria-label="Tipo de entrega" className="w-full">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tipo de entrega</SelectLabel>
                {deliveryTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <button type="button" className="flex w-full items-center gap-2 px-2 py-2 text-sm text-primary" onClick={() => setNewTypeOpen(true)}><Plus className="size-4" /> Cadastrar novo tipo</button>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-quantity" className="text-xs font-medium text-muted-foreground">Quantidade</label>
          <Input id="delivery-quantity" name="quantity" type="number" min={1} inputMode="numeric" defaultValue={1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delivery-owner" className="text-xs font-medium text-muted-foreground">Responsável</label>
          <Input id="delivery-owner" value={ownerName} readOnly aria-readonly="true" className="bg-card text-muted-foreground" />
        </div>
      </div>

      {newTypeOpen ? <div className="flex max-w-md gap-2"><Input autoFocus value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="Ex.: Motion para redes sociais" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addType(); } }} /><Button type="button" variant="outline" className="rounded-full" onClick={() => void addType()}>Salvar</Button></div> : null}

      <Button type="submit" className="w-fit rounded-full px-5" disabled={isSubmitting}>
        <Play /> {isSubmitting ? "Iniciando..." : "Iniciar entrega"}
      </Button>
    </form>
  );
}
