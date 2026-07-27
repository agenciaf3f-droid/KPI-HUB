import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ContaForm } from "@/components/conta/conta-form";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Minha conta · KPI F3F" };

const CARGO_LABEL: Record<string, string> = {
  gestor: "Gestor",
  editor: "Editor de Vídeo",
  creator: "Creator",
};

// Área do usuário: foto, nome, senha, 2FA e os dados fixos da conta.
// Chegou aqui pelo avatar da sidebar (antes ia direto pro /seguranca).
export default async function ContaPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");

  const cargo = acesso.isAdmin
    ? "Admin"
    : acesso.panels.map((p) => CARGO_LABEL[p] ?? p).join(" · ") || "Sem área";

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader
        activeItem="conta"
        fullName={acesso.fullName ?? acesso.email}
        panels={acesso.panels}
        isAdmin={acesso.isAdmin}
        avatarUrl={acesso.avatarUrl}
      />
      <ContaForm
        email={acesso.email}
        nomeInicial={acesso.fullName ?? ""}
        avatarInicial={acesso.avatarUrl ?? null}
        cargo={cargo}
      />
    </div>
  );
}
