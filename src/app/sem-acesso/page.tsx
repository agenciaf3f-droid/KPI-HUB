"use client";

import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Conta válida, sem área nenhuma — quem foi removido da equipe ou ainda não
 * recebeu área cai aqui. Antes o app devolvia essa pessoa para o /login, que
 * a mandava de volta para cá: dava um vai-e-volta sem explicação.
 */
export default function SemAcessoPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-5">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Sua conta ainda não tem acesso</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O login funcionou, mas nenhuma área está liberada para você. Peça ao
          administrador da agência para incluir sua conta na equipe.
        </p>
        <Button
          variant="outline"
          className="mt-7 rounded-full"
          onClick={() => {
            void createClient()
              .auth.signOut()
              .finally(() => window.location.assign("/login"));
          }}
        >
          Sair e tentar com outra conta
        </Button>
      </div>
    </main>
  );
}
