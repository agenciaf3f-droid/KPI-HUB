"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/**
 * Destino dos e-mails do Supabase: convite de membro (aba Equipe, senha em
 * branco) e "Esqueci minha senha" do login. O link já entra com sessão — aqui
 * a pessoa só cria a senha nova.
 */
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checando" | "ok" | "sem-sessao">("checando");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let done = false;

    // O client processa o token do link (hash ou ?code=) de forma assíncrona:
    // escuta o evento e mantém um prazo de tolerância antes de declarar inválido.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !done) {
        done = true;
        setReady("ok");
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !done) {
        done = true;
        setReady("ok");
      }
    });
    const timeout = setTimeout(() => {
      if (!done) setReady("sem-sessao");
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa de ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha criada. Bem-vindo(a)!");
      router.replace("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-5">
      <div className="w-full max-w-md">
        <span className="mb-5 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <KeyRound className="size-5" />
        </span>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Área da equipe</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Crie sua senha.</h1>

        {ready === "checando" ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Validando seu link…
          </p>
        ) : ready === "sem-sessao" ? (
          <p className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Este link expirou ou já foi usado. Peça um convite novo ao admin, ou use
            “Esqueci minha senha” na tela de login.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="ds-senha" className="text-sm font-medium">Nova senha</label>
              <Input id="ds-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" className="h-12 rounded-xl bg-card" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="ds-confirma" className="text-sm font-medium">Confirmar senha</label>
              <Input id="ds-confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" className="h-12 rounded-xl bg-card" required />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={saving}>
              {saving ? "Salvando..." : "Salvar senha e entrar"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
