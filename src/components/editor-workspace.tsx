"use client";

// Porte do `pages/Index.tsx` do Dash-Editores — mesma composição, mesma ordem,
// mesmos componentes: EditForm → ActiveEdits → AwaitingLink → DateRangeFilter →
// StatsCards → DashboardCharts → RecentEditsTable.
//
// O que mudou: login/sessão agora são do hub (EditorAuthProvider recebe do
// servidor), as cores/fontes vêm dos tokens do Creator via globals.css e o
// header interno saiu — sidebar, Minha conta e aba Equipe cobrem o que ele fazia.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useState } from "react";

import { ActiveEdits } from "@/components/ActiveEdits";
import { AwaitingLink } from "@/components/AwaitingLink";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EditForm } from "@/components/EditForm";
import { RecentEditsTable } from "@/components/RecentEditsTable";
import { StatsCards } from "@/components/StatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoEdits } from "@/hooks/useVideoEdits";
import { EditorAuthProvider, useAuth } from "@/lib/editor-auth";
import type { Tables } from "@/integrations/supabase/types";

const queryClient = new QueryClient();

export function EditorWorkspace({ currentEditor, isAdmin, initialEdits }: { currentEditor: string; isAdmin: boolean; initialEdits?: Tables<"video_edits">[] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <EditorAuthProvider currentEditor={currentEditor} isAdmin={isAdmin}>
        <EditorIndex initialEdits={initialEdits} />
      </EditorAuthProvider>
    </QueryClientProvider>
  );
}

function EditorIndex({ initialEdits }: { initialEdits?: Tables<"video_edits">[] }) {
  const { data: edits, isLoading } = useVideoEdits(initialEdits);
  const { currentEditor, isAdmin } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rangeActive = from !== "" && to !== "";
  const allEdits = edits || [];
  // Admin vê tudo; editor vê só as próprias edições.
  const scopedEdits = isAdmin ? allEdits : allEdits.filter((e) => e.editor_name === currentEditor);
  const activeEdits = scopedEdits.filter((e) => e.status === "editing" || e.status === "paused");
  const awaitingEdits = scopedEdits.filter((e) => e.status === "awaiting_link");
  const doneEdits = scopedEdits.filter((e) => (e.status ?? "done") === "done");
  const filteredEdits = rangeActive
    ? doneEdits.filter((e) => e.edit_date >= from && e.edit_date <= to)
    : doneEdits;
  const rangeDays = rangeActive
    ? Math.max(0, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1)
    : 0;

  return (
    <div>
      {/* Sem header interno: o hub já identifica a aba na sidebar, e trocar
          senha/sair/convidar agora vivem em Minha conta, no botão de logout da
          sidebar e na aba Equipe. */}

      {/* Conteúdo — ordem idêntica ao Index.tsx original */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 sm:space-y-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            <EditForm />
            <ActiveEdits edits={activeEdits} controlEditor={currentEditor} />
            <AwaitingLink edits={awaitingEdits} />
            <DateRangeFilter
              from={from}
              to={to}
              onChange={(f, t) => {
                setFrom(f);
                setTo(t);
              }}
            />
            <StatsCards edits={filteredEdits} rangeActive={rangeActive} rangeDays={rangeDays} />
            <DashboardCharts edits={filteredEdits} from={from} to={to} isAdmin={isAdmin} />
            <RecentEditsTable edits={filteredEdits} />
          </>
        )}
      </main>
    </div>
  );
}
