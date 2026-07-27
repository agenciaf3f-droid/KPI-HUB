"use client";

// Porte do `pages/Index.tsx` do Dash-Editores — mesma composição, mesma ordem,
// mesmos componentes: EditForm → ActiveEdits → AwaitingLink → DateRangeFilter →
// StatsCards → DashboardCharts → RecentEditsTable. O header interno (título,
// convidar editor, trocar senha, sair) também veio junto.
//
// O que mudou: login/sessão agora são do hub (EditorAuthProvider recebe do
// servidor) e as cores/fontes vêm dos tokens do Creator via globals.css.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Film, KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActiveEdits } from "@/components/ActiveEdits";
import { AwaitingLink } from "@/components/AwaitingLink";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EditForm } from "@/components/EditForm";
import { InviteEditorDialog } from "@/components/InviteEditorDialog";
import { RecentEditsTable } from "@/components/RecentEditsTable";
import { StatsCards } from "@/components/StatsCards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoEdits } from "@/hooks/useVideoEdits";
import { EditorAuthProvider, useAuth } from "@/lib/editor-auth";

const queryClient = new QueryClient();

export function EditorWorkspace({ currentEditor, isAdmin }: { currentEditor: string; isAdmin: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <EditorAuthProvider currentEditor={currentEditor} isAdmin={isAdmin}>
        <EditorIndex />
      </EditorAuthProvider>
    </QueryClientProvider>
  );
}

function EditorIndex() {
  const { data: edits, isLoading } = useVideoEdits();
  const { currentEditor, isAdmin, signOut, updatePassword } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPw(true);
    try {
      await updatePassword(newPw);
      toast.success("Senha alterada com sucesso");
      setPwOpen(false);
      setNewPw("");
      setConfirmPw("");
    } catch {
      toast.error("Não foi possível alterar a senha. Tente novamente.");
    } finally {
      setSavingPw(false);
    }
  };

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
      {/* Header interno do painel — igual ao original */}
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold leading-tight">Controle de Edições</h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Visão administrativa" : currentEditor}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? <InviteEditorDialog /> : null}
            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="rounded-full">
                    <KeyRound className="size-4" /> Senha
                  </Button>
                }
              />
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Alterar senha</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-nova">Nova senha</Label>
                    <Input id="pw-nova" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-confirma">Confirmar senha</Label>
                    <Input id="pw-confirma" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={savingPw}>
                      {savingPw ? "Salvando…" : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void signOut()}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

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
            <ActiveEdits edits={activeEdits} />
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
