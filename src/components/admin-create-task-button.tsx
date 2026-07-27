"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPES = ["Post estático", "Carrossel", "Story ou pacote de stories", "Reel / vídeo curto", "Vídeo longo", "Banner", "Anúncio/criativo de tráfego", "E-mail marketing", "Apresentação", "Landing page", "Site institucional", "Identidade visual", "Peça impressa", "Outro"];
type Designer = { id: string; full_name: string; designer_color: string };

export function AdminCreateTaskButton({ adminAccessToken }: { adminAccessToken: string }) {
  const [open, setOpen] = useState(false);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [deliveryType, setDeliveryType] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/admin/tasks", { headers: { "x-admin-access-token": adminAccessToken } })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error);
        setDesigners(body.designers ?? []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar os Designers."));
  }, [open, adminAccessToken]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!deliveryType || !assigneeId) return toast.error("Selecione o tipo e o Designer.");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/tasks", { method: "POST", headers: { "content-type": "application/json", "x-admin-access-token": adminAccessToken }, body: JSON.stringify({ clientName: formData.get("client"), title: formData.get("title"), quantity: formData.get("quantity"), deliveryType, assigneeId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível criar a tarefa.");
      toast.success("Tarefa criada em stand by para o Designer.");
      setOpen(false); setDeliveryType(""); setAssigneeId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a tarefa.");
    } finally { setIsSaving(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button className="h-10 rounded-full px-4 text-sm font-semibold" />}><Plus className="size-4" /> Criar tarefa</DialogTrigger>
    <DialogContent className="rounded-[1.5rem] p-6 sm:max-w-lg">
      <DialogHeader><DialogTitle>Nova tarefa</DialogTitle><DialogDescription>A tarefa será enviada em stand by. O timer só começa quando o Designer iniciar.</DialogDescription></DialogHeader>
      <form className="mt-2 space-y-4" onSubmit={submit}>
        <Input name="client" placeholder="Cliente" required />
        <Input name="title" placeholder="Título da tarefa" required />
        <div className="grid grid-cols-2 gap-3"><Select value={deliveryType} onValueChange={(value) => setDeliveryType(value ?? "")}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><Input name="quantity" type="number" min={1} defaultValue={1} /></div>
        <Select value={assigneeId} onValueChange={(value) => setAssigneeId(value ?? "")}><SelectTrigger><SelectValue placeholder={designers.length ? "Designar para" : "Nenhum Designer disponível"} /></SelectTrigger><SelectContent>{designers.map((designer) => <SelectItem key={designer.id} value={designer.id}><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full" style={{ backgroundColor: designer.designer_color }} />{designer.full_name}</span></SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button type="submit" className="rounded-full" disabled={isSaving || !designers.length}><Plus /> {isSaving ? "Criando..." : "Criar em stand by"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
