"use client";

import { CheckCircle2, Copy, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Enrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

const DESIGNER_COLORS = ["#8B5CF6", "#EC4899", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#64748B"];

export default function SecurityPage() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDesigner, setIsDesigner] = useState(false);
  const [designerColor, setDesignerColor] = useState("#8B5CF6");
  const [isSavingColor, setIsSavingColor] = useState(false);

  useEffect(() => {
    async function checkFactor() {
      if (!isSupabaseConfigured()) {
        setIsChecking(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          window.location.assign("/login");
          return;
        }

        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        setIsEnabled(data.totp.some((factor) => factor.status === "verified"));
        const { data: profile, error: profileError } = await supabase.from("creator_profiles").select("role, designer_color").eq("id", userData.user.id).maybeSingle();
        if (profileError) throw profileError;
        setIsDesigner(profile?.role === "designer");
        if (profile?.designer_color) setDesignerColor(profile.designer_color);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível consultar a segurança.");
      } finally {
        setIsChecking(false);
      }
    }

    void checkFactor();
  }, []);

  async function saveDesignerColor(color: string) {
    setIsSavingColor(true);
    try {
      const response = await fetch("/api/profile/color", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ color }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar a cor.");
      setDesignerColor(body.color);
      toast.success("Cor de identificação atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a cor.");
    } finally {
      setIsSavingColor(false);
    }
  }

  async function startEnrollment() {
    if (!isSupabaseConfigured()) {
      toast.error("Configure o Supabase para ativar o Google Authenticator.");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Google Authenticator",
      });
      if (error) throw error;

      setEnrollment({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a configuração.");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || !isSupabaseConfigured()) return;

    setIsBusy(true);
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.id,
      });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollment.id,
        challengeId: challenge.id,
        code: code.replace(/\D/g, ""),
      });
      if (error) throw error;

      setIsEnabled(true);
      setEnrollment(null);
      setCode("");
      toast.success("Google Authenticator ativado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido. Tente novamente.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground md:pl-28">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <header className="flex items-start justify-between gap-4 rounded-[2rem] bg-card p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Conta e acesso</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Segurança da conta</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Proteja sua conta com um segundo código gerado pelo Google Authenticator.</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="rounded-[2rem] bg-card p-5 sm:p-7">
          {isChecking ? (
            <p className="text-sm text-muted-foreground">Verificando a configuração de segurança...</p>
          ) : isEnabled ? (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><CheckCircle2 className="size-7" /></span>
              <div>
                <p className="text-lg font-semibold">Google Authenticator ativo</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Seu login exige um código temporário após a senha.</p>
              </div>
            </div>
          ) : !enrollment ? (
            <div className="max-w-xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></span>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Ative a verificação em duas etapas</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use o Google Authenticator, Authy, 1Password ou qualquer aplicativo compatível com códigos temporários.</p>
              <Button type="button" onClick={startEnrollment} className="mt-6 h-11 rounded-xl px-5" disabled={isBusy}>
                <QrCode /> {isBusy ? "Preparando..." : "Configurar Google Authenticator"}
              </Button>
            </div>
          ) : (
            <div className="grid gap-7 md:grid-cols-[210px_minmax(0,1fr)] md:items-start">
              <div className="rounded-2xl bg-white p-3">
                <Image
                  src={enrollment.qrCode}
                  alt="QR Code para configurar o Google Authenticator"
                  width={210}
                  height={210}
                  unoptimized
                  className="aspect-square w-full"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-primary"><Smartphone className="size-5" /><p className="font-semibold">Escaneie o QR Code</p></div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">No Google Authenticator, toque em <strong className="font-medium text-foreground">+</strong>, escolha “Ler um QR Code” e depois informe o código exibido.</p>
                <div className="mt-5 rounded-xl bg-muted p-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Chave manual</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs font-semibold">{enrollment.secret}</code>
                    <button type="button" onClick={() => navigator.clipboard.writeText(enrollment.secret).then(() => toast.success("Chave copiada."))} className="grid size-8 place-items-center rounded-lg hover:bg-card" aria-label="Copiar chave manual"><Copy className="size-4" /></button>
                  </div>
                </div>
                <form className="mt-5 space-y-3" onSubmit={confirmEnrollment}>
                  <label htmlFor="totp-code" className="text-sm font-medium">Código de seis dígitos</label>
                  <Input id="totp-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-12 rounded-xl font-mono text-xl tracking-[0.3em]" required />
                  <Button type="submit" className="h-11 rounded-xl" disabled={code.length !== 6 || isBusy}>{isBusy ? "Confirmando..." : "Ativar verificação em duas etapas"}</Button>
                </form>
              </div>
            </div>
          )}
        </section>

        {isDesigner ? <section className="rounded-[2rem] bg-card p-5 sm:p-7">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Personalização da conta</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Escolha sua cor</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Ela identifica você nas demandas e nos indicadores da equipe.</p>
          <div className="mt-5 flex flex-wrap gap-3" role="radiogroup" aria-label="Cor de identificação">
            {DESIGNER_COLORS.map((color) => <button key={color} type="button" role="radio" aria-checked={designerColor === color} aria-label={`Escolher cor ${color}`} disabled={isSavingColor} onClick={() => saveDesignerColor(color)} className="grid size-11 place-items-center rounded-full border-4 border-card ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60" style={{ backgroundColor: color, boxShadow: designerColor === color ? `0 0 0 2px ${color}` : undefined }}>
              {designerColor === color ? <CheckCircle2 className="size-5 text-white drop-shadow" /> : null}
            </button>)}
          </div>
        </section> : null}

        <Link href="/" className="w-fit text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">← Voltar para a fila</Link>
      </main>
    </div>
  );
}
