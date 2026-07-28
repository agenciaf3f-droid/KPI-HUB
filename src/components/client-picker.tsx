"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Client = { id: string; name: string };

export function ClientPicker({ value, onValueChange, adminAccessToken, id }: { value: string; onValueChange: (value: string) => void; adminAccessToken?: string; id?: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const headers = adminAccessToken ? { "x-admin-access-token": adminAccessToken } : undefined;

  useEffect(() => {
    void fetch("/api/clients", { headers })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error);
        setClients(body.clients ?? []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar os clientes."));
  }, [adminAccessToken]);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/clients", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ name }) });
      const body = await response.json();
      if (!response.ok || !body.client) throw new Error(body.error ?? "Não foi possível cadastrar o cliente.");
      setClients((current) => [...current.filter((client) => client.id !== body.client.id), body.client].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      onValueChange(body.client.name);
      setOpen(false);
      toast.success("Cliente cadastrado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="flex gap-2">
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}>
      <SelectTrigger id={id} className="w-full"><SelectValue placeholder={clients.length ? "Selecionar cliente" : "Cadastre o primeiro cliente"} /></SelectTrigger>
      <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>)}</SelectContent>
    </Select>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="icon" className="shrink-0 rounded-xl" aria-label="Cadastrar cliente" />}><Plus /></DialogTrigger>
      <DialogContent className="rounded-[1.5rem] p-6 sm:max-w-md">
        <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle><DialogDescription>Ele ficará disponível para as próximas demandas.</DialogDescription></DialogHeader>
        <form className="mt-2 space-y-4" onSubmit={createClient}>
          <Input name="name" placeholder="Nome do cliente" autoFocus required />
          <DialogFooter><Button type="submit" className="rounded-full" disabled={isSaving}>{isSaving ? "Salvando..." : "Cadastrar cliente"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
