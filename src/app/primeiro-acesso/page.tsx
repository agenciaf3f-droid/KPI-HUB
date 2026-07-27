"use client";

import { KeyRound, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FirstAccessPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Configure as credenciais do Supabase antes de criar o acesso.");
      return;
    }

    const values = new FormData(event.currentTarget);
    const payload = {
      fullName: String(values.get("fullName") ?? ""),
      email: String(values.get("email") ?? ""),
      password: String(values.get("password") ?? ""),
    };
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível criar a conta.");

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password });
      if (error) throw error;
      toast.success("Conta Designer criada.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-5">
      <form className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><Layers className="size-6" /></span>
        <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Configuração inicial</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Criar acesso Designer</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Crie seu acesso interno à operação da Agência F3F. Sua área começa vazia, pronta para as suas entregas.</p>

        <div className="mt-7 space-y-4">
          <Input name="fullName" placeholder="Seu nome completo" required />
          <Input name="email" type="email" autoComplete="email" placeholder="seuemail@agencia.com" required />
          <Input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Crie uma senha (mínimo 8 caracteres)" required />
        </div>

        <Button type="submit" className="mt-6 h-11 w-full rounded-xl" disabled={isSubmitting}>
          <KeyRound className="size-4" /> {isSubmitting ? "Criando acesso..." : "Criar acesso Designer"}
        </Button>
      </form>
    </main>
  );
}
