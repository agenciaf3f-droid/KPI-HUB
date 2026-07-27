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
import { supabase } from "@/integrations/supabase/client";

export function InviteEditorDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Preencha email e nome do editor");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("invite-editor", {
        body: {
          email: email.trim(),
          name: name.trim(),
          redirectTo: window.location.origin + "/redefinir-senha",
        },
      });

      if (error) {
        // supabase-js coloca a mensagem real no context (resposta não-2xx / função ausente).
        let msg = "Não foi possível enviar o convite. Verifique se a função foi implantada.";
        try {
          const b = await error.context?.json();
          if (b?.error) msg = b.error;
        } catch {
          /* mantém msg padrão */
        }
        toast.error(msg);
        return;
      }

      toast.success("Convite enviado para " + email.trim());
      setOpen(false);
      setEmail("");
      setName("");
    } catch {
      toast.error("Não foi possível enviar o convite. Tente novamente.");
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
            O editor recebe um email para definir a senha e acessar o painel.
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
