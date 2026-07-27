"use client";

import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Membro = {
  id: string;
  email: string;
  nome: string;
  areas: string[];
  is_admin: boolean;
  avatar_url: string | null;
};

const AREA_LABEL: Record<string, string> = {
  gestor: "Gestor",
  editor: "Vídeo",
  creator: "Creator",
};

export function EquipeManager({ membros }: { membros: Membro[] }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em]">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quem entra no hub e quais abas cada pessoa vê. A área define o acesso.
          </p>
        </div>
        <AdicionarMembroDialog />
      </header>

      <ul className="mt-6 space-y-3">
        {membros.map((m) => (
          <MembroRow key={m.id} membro={m} />
        ))}
        {membros.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum membro ainda. Adicione o primeiro.
          </li>
        ) : null}
      </ul>
    </main>
  );
}

function MembroRow({ membro }: { membro: Membro }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/equipe?id=${membro.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Não foi possível remover o membro.");
      toast.success(`${membro.nome} removido — o acesso foi revogado.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o membro.");
      setConfirming(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        {membro.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={membro.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {membro.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{membro.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{membro.email}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {membro.is_admin ? <Badge>Admin</Badge> : membro.areas.map((a) => (
          <Badge key={a} variant="secondary">{AREA_LABEL[a] ?? a}</Badge>
        ))}
        {/* A conta raiz da agência não sai; outros admins saem (o servidor ainda barra remover a si mesmo). */}
        {membro.email === "agenciaf3f@gmail.com" ? null : confirming ? (
          <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing}>
            {removing ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
            aria-label={`Remover ${membro.nome}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function AdicionarMembroDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  const toggleArea = (area: string) =>
    setAreas((current) => (current.includes(area) ? current.filter((a) => a !== area) : [...current, area]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || (!areas.length && !isAdmin)) {
      toast.error("Preencha nome, e-mail e ao menos uma área (ou marque Admin).");
      return;
    }
    if (senha && senha.length < 6) {
      toast.error("A senha inicial precisa de ao menos 6 caracteres (ou deixe em branco para convidar por e-mail).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha, areas, isAdmin }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Não foi possível adicionar o membro.");
      if (body?.linkConvite) {
        // Dialog fica aberto mostrando o link — o admin copia e manda por WhatsApp.
        setLinkGerado(body.linkConvite);
        toast.success(`${nome.trim()} adicionado. Envie o link de convite.`);
      } else {
        toast.success(
          body?.conviteEnviado
            ? `Convite enviado por e-mail para ${email.trim()}.`
            : body?.contaNova
              ? `${nome.trim()} adicionado. Compartilhe a senha inicial com a pessoa.`
              : `${nome.trim()} adicionado. A conta já existia — a senha antiga continua valendo.`,
        );
        setOpen(false);
      }
      setNome("");
      setEmail("");
      setSenha("");
      setAreas([]);
      setIsAdmin(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o membro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLinkGerado(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="rounded-full">
            <UserPlus className="size-4" /> Adicionar membro
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{linkGerado ? "Convite pronto" : "Adicionar membro"}</DialogTitle>
          <DialogDescription>
            {linkGerado
              ? "Mande este link para a pessoa (WhatsApp etc.). Ele abre a criação de senha e entra direto no hub."
              : "A pessoa entra com este e-mail e senha em kpis.agenciaf3f.com.br e vê só as abas da área dela."}
          </DialogDescription>
        </DialogHeader>
        {linkGerado ? (
          <div className="space-y-3">
            <p className="break-all rounded-xl bg-muted p-3 text-xs text-muted-foreground">{linkGerado}</p>
            <Button
              className="w-full"
              onClick={() => {
                void navigator.clipboard
                  .writeText(linkGerado)
                  .then(() => toast.success("Link copiado."))
                  .catch(() => toast.error("Não deu para copiar — selecione o texto acima."));
              }}
            >
              Copiar link de convite
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="membro-nome">Nome</Label>
            <Input id="membro-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lucas" autoComplete="off" />
            <p className="text-xs text-muted-foreground">
              Para editores, escreva exatamente como aparece nos vídeos já lançados (ex.: “Lucas”, “Damião”).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="membro-email">E-mail</Label>
            <Input id="membro-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@gmail.com" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="membro-senha">Senha inicial (opcional)</Label>
            <Input id="membro-senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Em branco → convite por e-mail" autoComplete="off" />
            <p className="text-xs text-muted-foreground">
              Em branco, a pessoa recebe um e-mail de convite e cria a própria senha. Preenchida, você repassa e ela troca em Minha conta.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Área</legend>
            <div className="flex flex-wrap gap-4">
              {Object.entries(AREA_LABEL).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={areas.includes(value)}
                    onChange={() => toggleArea(value)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={() => setIsAdmin((v) => !v)}
                className="size-4 rounded border-border accent-primary"
              />
              <span>
                Admin
                <span className="ml-1.5 text-xs text-muted-foreground">vê todas as abas e gerencia a equipe</span>
              </span>
            </label>
          </fieldset>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
