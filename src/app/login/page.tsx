"use client";

import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Configure o Supabase para ativar o acesso da equipe.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (error) throw error;

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const factor = factors.totp.find((item) => item.status === "verified");
      if (!factor) {
        // Sem 2FA cadastrado: entra direto no app. O cadastro do Google
        // Authenticator continua disponível em /seguranca (avatar da sidebar),
        // mas deixou de ser etapa obrigatória do login — decisão do usuário.
        router.replace("/");
        return;
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) throw challengeError;

      setFactorId(factor.id);
      setChallengeId(challenge.id);
      setStep("mfa");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email) {
      toast.error("Digite seu e-mail no campo acima primeiro.");
      return;
    }
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/definir-senha`,
      });
      if (error) throw error;
      toast.success(`Enviamos um link de redefinição para ${email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    }
  }

  async function handleMfaSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured()) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verificationCode.replace(/\D/g, ""),
      });
      if (error) throw error;

      toast.success("Verificação concluída. Bem-vinda de volta!");
      router.replace("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="absolute -left-24 top-24 size-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-28 right-0 size-96 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative my-auto max-w-md">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Agência F3F</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-[-0.05em]">
            Toda a operação, em um só fluxo.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-sidebar-foreground/65">
            Organize a produção, acompanhe o esforço da equipe e mantenha cada entrega no ritmo certo.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-sidebar-foreground/70">
          <span className="grid size-9 place-items-center rounded-full bg-sidebar-accent text-accent">
            <ShieldCheck className="size-4" />
          </span>
          Acesso protegido para sua equipe
        </div>
      </section>

      <section className="relative flex min-h-svh items-center justify-center p-5 sm:p-8">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <span className="mb-5 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
              <LockKeyhole className="size-5" />
            </span>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Área da equipe</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Boas-vindas.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Entre com seu e-mail de trabalho para acessar a operação.
            </p>
          </div>

          {step === "credentials" ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">E-mail profissional</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@agencia.com" className="h-12 rounded-xl bg-card pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="password" className="text-sm font-medium">Senha</label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-primary transition-colors hover:text-primary/75">
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" className="h-12 rounded-xl bg-card px-10" required />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="size-4 rounded border-border accent-primary" />
                Manter acesso neste dispositivo
              </label>

              <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={isSubmitting}>
                {isSubmitting ? "Verificando acesso..." : "Entrar na plataforma"}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleMfaSubmit}>
              <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
                Abra o Google Authenticator e informe o código de seis dígitos da sua conta.
              </div>
              <div className="space-y-2">
                <label htmlFor="verification-code" className="text-sm font-medium">Código de verificação</label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="h-14 rounded-xl bg-card text-center font-mono text-2xl font-semibold tracking-[0.38em]"
                  required
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={verificationCode.length !== 6 || isSubmitting}>
                {isSubmitting ? "Confirmando..." : "Confirmar código"}
              </Button>
              <button type="button" onClick={() => setStep("credentials")} className="w-full text-sm font-medium text-muted-foreground hover:text-foreground">
                Voltar para o login
              </button>
            </form>
          )}

          <p className="mt-8 rounded-xl bg-muted px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
            Ainda não possui acesso? Solicite um convite ao gestor da sua equipe.
          </p>
        </div>
      </section>
    </main>
  );
}
