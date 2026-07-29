"use client";

// Shim do `@/lib/auth` do Dash-Editores original, com a MESMA interface que os
// componentes portados consomem (`currentEditor`, `isAdmin`, `signOut`,
// `updatePassword`). A diferença: em vez de manter sessão própria via
// onAuthStateChange + EDITOR_BY_EMAIL hardcoded no cliente, os valores vêm do
// servidor (getPanelAccess → resolveIdentity) por props. Um lugar só decide
// identidade; o painel não carrega mapa de email nenhum.
import { createContext, useContext, useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { syncPasswordMirror } from "@/lib/f3f-central";

type EditorAuthValue = {
  currentEditor: string;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
};

const EditorAuthContext = createContext<EditorAuthValue | undefined>(undefined);

export function EditorAuthProvider({
  currentEditor,
  isAdmin,
  children,
}: {
  currentEditor: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<EditorAuthValue>(
    () => ({
      currentEditor,
      isAdmin,
      loading: false,
      // Mesmo projeto Supabase do hub: sair aqui é sair do hub inteiro.
      signOut: async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      },
      updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        // Propaga pro espelho do Console.Ads (senha única F3F). Best-effort.
        await syncPasswordMirror(newPassword);
      },
    }),
    [currentEditor, isAdmin],
  );

  return <EditorAuthContext.Provider value={value}>{children}</EditorAuthContext.Provider>;
}

export function useAuth(): EditorAuthValue {
  const ctx = useContext(EditorAuthContext);
  if (!ctx) throw new Error("useAuth (editor) precisa do EditorAuthProvider");
  return ctx;
}
