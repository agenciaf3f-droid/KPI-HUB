"use client";

import { Camera, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removerFoto, salvarPerfil, trocarFoto } from "@/app/conta/actions";
import { syncPasswordMirror } from "@/lib/f3f-central";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  nomeInicial: string;
  avatarInicial: string | null;
  cargo: string;
};

export function ContaForm({ email, nomeInicial, avatarInicial, cargo }: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em]">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie seu perfil e preferências.</p>
      </header>

      <div className="mt-6 space-y-4">
        <FotoCard nome={nomeInicial || email} avatarInicial={avatarInicial} />
        <InformacoesCard email={email} nomeInicial={nomeInicial} />
        <SenhaCard email={email} />
        <SegurancaCard />
        <ContaCard cargo={cargo} />
      </div>
    </main>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FotoCard({ nome, avatarInicial }: { nome: string; avatarInicial: string | null }) {
  const [avatarUrl, setAvatarUrl] = useState(avatarInicial);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.set("foto", file);
    startTransition(async () => {
      const r = await trocarFoto(formData);
      if (r.ok) {
        setAvatarUrl(r.avatarUrl ?? null);
        toast.success("Foto atualizada.");
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleRemove = () =>
    startTransition(async () => {
      const r = await removerFoto();
      if (r.ok) {
        setAvatarUrl(null);
        toast.success("Foto removida.");
      } else {
        toast.error(r.error);
      }
    });

  return (
    <Card titulo="Foto de perfil">
      <div className="flex flex-wrap items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Sua foto de perfil" className="size-16 rounded-full object-cover ring-2 ring-primary/20" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-xl font-semibold text-primary ring-2 ring-primary/20">
            {nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => inputRef.current?.click()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              Trocar foto
            </Button>
            {avatarUrl ? (
              <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={handleRemove} disabled={pending}>
                <Trash2 className="size-4" /> Remover foto
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — máx. 3MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}

function InformacoesCard({ email, nomeInicial }: { email: string; nomeInicial: string }) {
  const [nome, setNome] = useState(nomeInicial);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarPerfil(nome);
      if (r.ok) toast.success("Perfil salvo.");
      else toast.error(r.error);
    });
  };

  return (
    <Card titulo="Informações">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="conta-nome">Nome</Label>
          <Input id="conta-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conta-email">E-mail</Label>
          <Input id="conta-email" value={email} readOnly disabled className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">O e-mail de login não pode ser trocado por aqui.</p>
        </div>
        <Button type="submit" size="sm" className="rounded-full" disabled={pending || nome.trim().length < 2}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar perfil
        </Button>
      </form>
    </Card>
  );
}

function SenhaCard({ email }: { email: string }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nova.length < 6) {
      toast.error("A nova senha precisa de ao menos 6 caracteres.");
      return;
    }
    if (nova !== confirma) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      // Confere a senha atual antes de trocar — updateUser sozinho não pede.
      const { error: senhaErrada } = await supabase.auth.signInWithPassword({ email, password: atual });
      if (senhaErrada) {
        toast.error("Senha atual incorreta.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) throw error;
      // Propaga pro espelho do Console.Ads (senha única F3F). Best-effort.
      await syncPasswordMirror(nova);
      toast.success("Senha alterada.");
      setAtual("");
      setNova("");
      setConfirma("");
    } catch {
      toast.error("Não foi possível alterar a senha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card titulo="Alterar senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senha-atual">Senha atual</Label>
          <Input id="senha-atual" type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha-nova">Nova senha</Label>
          <Input id="senha-nova" type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha-confirma">Confirmar nova senha</Label>
          <Input id="senha-confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" size="sm" className="rounded-full" disabled={saving || !atual || !nova || !confirma}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Alterar senha
        </Button>
      </form>
    </Card>
  );
}

function SegurancaCard() {
  const [status, setStatus] = useState<"checando" | "ativa" | "inativa">("checando");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().auth.mfa.listFactors();
        if (!cancelled) setStatus(data?.totp.some((f) => f.status === "verified") ? "ativa" : "inativa");
      } catch {
        if (!cancelled) setStatus("inativa");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card titulo="Segurança">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Autenticação em duas etapas</p>
            <p className="text-xs text-muted-foreground">
              {status === "checando" ? "Verificando…" : status === "ativa" ? "Ativa — Google Authenticator" : "Não configurada"}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" render={<Link href="/seguranca">{status === "ativa" ? "Gerenciar" : "Configurar"}</Link>} />
      </div>
    </Card>
  );
}

function ContaCard({ cargo }: { cargo: string }) {
  return (
    <Card titulo="Conta">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Cargo</dt>
          <dd className="font-medium">{cargo}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Empresa</dt>
          <dd className="font-medium">Agência F3F</dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-destructive"
          onClick={() => {
            void createClient()
              .auth.signOut()
              .finally(() => window.location.assign("/login"));
          }}
        >
          <LogOut className="size-4" /> Sair da conta
        </Button>
      </div>
    </Card>
  );
}
