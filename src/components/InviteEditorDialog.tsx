import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteEditorDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Preencha email e nome do editor");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha inicial precisa de ao menos 6 caracteres");
      return;
    }
    setSending(true);
    try {
      // Mesmo endpoint da aba Equipe, com a área editor pré-marcada.
      // (Antes chamava a edge function "invite-editor", que nunca foi deployada.)
      const res = await fetch("/api/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: name.trim(), email: email.trim(), senha: password, areas: ["editor"] }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível adicionar o editor. Tente novamente.");
        return;
      }

      toast.success(`${name.trim()} adicionado. Compartilhe a senha inicial com a pessoa.`);
      setOpen(false);
      setEmail("");
      setName("");
      setPassword("");
    } catch {
      toast.error("Não foi possível adicionar o editor. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Convidar Editor</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convidar Editor</DialogTitle>
          <DialogDescription>
            O editor entra com este e-mail e senha e vê só a aba Vídeo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do editor</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editor@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome do editor</Label>
            <Input
              id="invite-name"
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Lucas, Damião"
            />
            <p className="text-xs text-muted-foreground">
              Nome de exibição do editor. Se já tiver edições no banco, escreva
              exatamente igual (ex.: "Lucas", "Damião").
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password">Senha inicial</Label>
            <Input
              id="invite-password"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-xs text-muted-foreground">
              Você repassa a senha; o editor troca depois em Minha conta.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={sending} className="w-full">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? "Enviando..." : "Convidar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
