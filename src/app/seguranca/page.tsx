import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { SegurancaClient } from "@/components/seguranca-client";
import { getPanelAccess } from "@/lib/panels";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Segurança · KPI F3F" };

// RSC fino por cima do fluxo de 2FA (client): garante a sessão e monta a
// sidebar com os painéis reais — antes o <AppHeader /> vinha sem props e a
// navegação sumia nesta tela.
export default async function SegurancaPage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");

  return (
    <div className="min-h-svh bg-background text-foreground md:pl-28">
      <AppHeader
        activeItem="conta"
        fullName={acesso.fullName ?? acesso.email}
        panels={acesso.panels}
        isAdmin={acesso.isAdmin}
        avatarUrl={acesso.avatarUrl}
      />
      <SegurancaClient />
    </div>
  );
}
