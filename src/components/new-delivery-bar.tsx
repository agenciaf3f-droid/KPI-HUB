"use client";

import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateDeliveryInput } from "@/lib/types";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DELIVERY_TYPES = [
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
  const [deliveryType, setDeliveryType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientName = String(formData.get("client") ?? "").trim();
    const quantity = Number(formData.get("quantity") ?? 1);

    if (!deliveryType) {
      toast.error("Selecione o tipo de entrega.");
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
          <Input id="delivery-client" name="client" autoComplete="organization" placeholder="Nome do cliente" required />
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
                {DELIVERY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
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

      <Button type="submit" className="w-fit rounded-full px-5" disabled={isSubmitting}>
        <Play /> {isSubmitting ? "Iniciando..." : "Iniciar entrega"}
      </Button>
    </form>
  );
}
