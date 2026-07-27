"use client";

import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteDesignerButton() {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setIsCreating(true);
    try {
      const response = await fetch("/api/invites", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível criar o convite.");
      setInviteUrl(body.url);
      setCopied(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o convite.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10 rounded-full px-4 text-sm font-semibold" />}>
        <UserPlus className="size-4" /> Convidar Designer
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-[1.5rem] p-6" showCloseButton>
        <DialogHeader>
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><Link2 className="size-5" /></span>
          <DialogTitle className="mt-2 text-xl">Convite exclusivo</DialogTitle>
          <DialogDescription>
            Gere um link de uso único. Ele expira em 14 dias e cria apenas uma conta Designer.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-3">
            <div className="break-all rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{inviteUrl}</div>
            <div className="flex gap-2">
              <Button type="button" className="flex-1 rounded-xl" onClick={copyInvite}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={createInvite} disabled={isCreating}>
                Novo link
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" className="mt-2 h-11 w-full rounded-xl" onClick={createInvite} disabled={isCreating}>
            {isCreating ? "Gerando convite..." : "Gerar link de convite"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
