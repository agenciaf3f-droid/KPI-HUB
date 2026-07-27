import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { EquipeManager, type Membro } from "@/components/equipe/equipe-manager";
import { getPanelAccess } from "@/lib/panels";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Equipe · KPI F3F" };

// Aba exclusiva do admin (conta da agência): convida membro com nome, e-mail,
// senha inicial e área — e é a área que decide quais abas a pessoa vê.
export default async function EquipePage() {
  if (!isSupabaseConfigured()) redirect("/primeiro-acesso");

  const acesso = await getPanelAccess();
  if (!acesso) redirect("/login");
  if (!acesso.isAdmin) redirect("/");

  const { data: membros } = await createAdminClient()
    .from("hub_members")
    .select("id, email, nome, areas, is_admin, avatar_url")
    .order("nome");

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader
        activeItem="equipe"
        fullName={acesso.fullName ?? acesso.email}
        panels={acesso.panels}
        isAdmin={acesso.isAdmin}
        avatarUrl={acesso.avatarUrl}
      />
      <EquipeManager membros={(membros ?? []) as Membro[]} />
    </div>
  );
}
