"use client";

import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/** Sai da sessão do hub — vale para as três abas (login é um só). */
export function LogoutButton() {
  async function handleLogout() {
    try {
      await createClient().auth.signOut();
    } finally {
      // assign, não router.push: limpa qualquer estado de cliente pendurado
      // (TanStack Query do editor, motor do gestor) junto com a sessão.
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Sair da conta"
      title="Sair"
      className="grid size-9 place-items-center rounded-full text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:size-10"
    >
      <LogOut className="size-4" />
    </button>
  );
}
