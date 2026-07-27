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
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Preencha email e nome do editor");
      return;
    }
    if (password && password.length < 6) {
      toast.error("A senha inicial precisa de ao menos 6 caracteres (ou deixe em branco para convidar por e-mail)");
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

      if (body?.linkConvite) {
        setInviteLink(body.linkConvite);
        toast.success(`${name.trim()} adicionado. Envie o link de convite.`);
      } else {
        toast.success(`${name.trim()} adicionado. Compartilhe a senha inicial com a pessoa.`);
        setOpen(false);
      }
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setInviteLink(null);
      }}
    >
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
          <DialogTitle>{inviteLink ? "Convite pronto" : "Convidar Editor"}</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "Mande este link para o editor. Ele cria a senha e entra direto na aba Vídeo."
              : "O editor entra com este e-mail e senha e vê só a aba Vídeo."}
          </DialogDescription>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-3">
            <p className="break-all rounded-xl bg-muted p-3 text-xs text-muted-foreground">{inviteLink}</p>
            <Button
              className="w-full"
              onClick={() => {
                void navigator.clipboard
                  .writeText(inviteLink)
                  .then(() => toast.success("Link copiado."))
                  .catch(() => toast.error("Não deu para copiar — selecione o texto acima."));
              }}
            >
              Copiar link de convite
            </Button>
          </div>
        ) : (
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
            <Label htmlFor="invite-password">Senha inicial (opcional)</Label>
            <Input
              id="invite-password"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Em branco → convite por e-mail"
            />
            <p className="text-xs text-muted-foreground">
              Em branco, o editor recebe um e-mail para criar a própria senha.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={sending} className="w-full">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? "Enviando..." : "Convidar"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
