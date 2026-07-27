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

  const admin = createAdminClient();
  const [{ data: membros }, { data: contas }] = await Promise.all([
    admin.from("hub_members").select("id, user_id, email, nome, areas, is_admin, avatar_url").order("nome"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  // Status derivado do auth: entrou alguma vez = Ativo; recebeu e-mail de
  // convite/definir senha = Convite enviado; senão = Pendente (senha repassada
  // na mão, pessoa ainda não logou).
  const contaPorId = new Map((contas?.users ?? []).map((u) => [u.id, u]));
  const comStatus = (membros ?? []).map((m) => {
    const conta = m.user_id ? contaPorId.get(m.user_id) : undefined;
    const status: Membro["status"] = conta?.last_sign_in_at
      ? "ativo"
      : conta?.invited_at || (conta as { recovery_sent_at?: string } | undefined)?.recovery_sent_at
        ? "convite"
        : "pendente";
    return { ...m, status };
  });

  return (
    <div className="min-h-svh bg-background md:pl-28">
      <AppHeader
        activeItem="equipe"
        fullName={acesso.fullName ?? acesso.email}
        panels={acesso.panels}
        isAdmin={acesso.isAdmin}
        avatarUrl={acesso.avatarUrl}
      />
      <EquipeManager membros={comStatus as Membro[]} />
    </div>
  );
}
