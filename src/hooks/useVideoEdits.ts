import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Pause = {
  // Legacy rows may carry a reason; the app no longer writes or reads it.
  reason?: string;
  paused_at: string;
  resumed_at: string | null;
};

const today = () => new Date().toISOString().split("T")[0];

export function useVideoEdits() {
  return useQuery({
    queryKey: ["video-edits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_edits")
        .select("*")
        .order("edit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

type StartEditInput = {
  client_name: string;
  video_format: TablesInsert<"video_edits">["video_format"];
  editor_name: string;
  quantity: number;
  videoNames: string[];
  rawLinks: string[];
};

// Cria o lote com o cronômetro PARADO: `paused` + `timer_started_at: null` +
// `elapsed_seconds: 0`. `pauses` NÃO é enviado (o default do banco é `[]`), então
// o "Começar" seguinte (useResumeEdit sobre um array vazio) não registra intervalo.
export function useStartEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StartEditInput) => {
      // Um nome por vídeo do lote. NÃO filtra: a posição do nome é o vídeo
      // (nome i ↔ link i), então buracos não podem deslocar a lista.
      const videoNames = input.videoNames.slice(0, input.quantity).map((n) => n.trim());
      const { data, error } = await supabase
        .from("video_edits")
        .insert({
          status: "paused",
          timer_started_at: null,
          elapsed_seconds: 0,
          client_name: input.client_name,
          video_format: input.video_format,
          editor_name: input.editor_name,
          video_names: videoNames as unknown as Json,
          // Coluna singular antiga: mantida com o primeiro nome (compatibilidade
          // com telas/linhas que ainda leem `video_name`).
          video_name: videoNames[0] ?? null,
          raw_links: input.rawLinks.filter((l) => l.trim()) as unknown as Json,
          edit_date: today(),
          quantity: input.quantity,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição criada — clique em Começar");
    },
    onError: () => {
      toast.error("Erro ao iniciar edição");
    },
  });
}

export function usePauseEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      elapsedSeconds,
      pauses,
    }: {
      id: string;
      elapsedSeconds: number;
      pauses: Pause[];
    }) => {
      const nextPauses: Pause[] = [
        ...pauses,
        { paused_at: new Date().toISOString(), resumed_at: null },
      ];
      const { error } = await supabase
        .from("video_edits")
        .update({
          status: "paused",
          elapsed_seconds: elapsedSeconds,
          timer_started_at: null,
          pauses: nextPauses as unknown as Json,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição pausada");
    },
    onError: () => {
      toast.error("Erro ao pausar edição");
    },
  });
}

export function useResumeEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pauses }: { id: string; pauses: Pause[] }) => {
      const nextPauses = pauses.map((p, i) =>
        i === pauses.length - 1 ? { ...p, resumed_at: new Date().toISOString() } : p
      );
      const { error } = await supabase
        .from("video_edits")
        .update({
          status: "editing",
          timer_started_at: new Date().toISOString(),
          pauses: nextPauses as unknown as Json,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição retomada");
    },
    onError: () => {
      toast.error("Erro ao retomar edição");
    },
  });
}

// "Feito": trava o cronômetro (tempo congelado), grava o timestamp de conclusão
// e move a edição para a fila "Aguardando Link". NÃO registra pausa.
export function useFinishEditing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      elapsedSeconds,
    }: {
      id: string;
      elapsedSeconds: number;
    }) => {
      const { error } = await supabase
        .from("video_edits")
        .update({
          status: "awaiting_link",
          elapsed_seconds: elapsedSeconds,
          timer_started_at: null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição concluída — adicione o link");
    },
    onError: () => {
      toast.error("Erro ao concluir edição");
    },
  });
}

// "Adicionar Link": informa os links dos vídeos editados (um por vídeo do lote)
// → vira `done` e passa a contar.
export function useAddEditedLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, editedLinks }: { id: string; editedLinks: string[] }) => {
      const { error } = await supabase
        .from("video_edits")
        .update({
          status: "done",
          edited_links: editedLinks as unknown as Json,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Vídeo finalizado!");
    },
    onError: () => {
      toast.error("Erro ao adicionar link");
    },
  });
}

// "Voltar ao timer": reabre uma edição de `awaiting_link` para `editing`.
// O timer continua do valor congelado (elapsed_seconds intacto).
export function useReopenEditing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("video_edits")
        .update({
          status: "editing",
          timer_started_at: new Date().toISOString(),
          finished_at: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição reaberta");
    },
    onError: () => {
      toast.error("Erro ao reabrir edição");
    },
  });
}

export function useDeleteVideoEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("video_edits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-edits"] });
      toast.success("Edição removida!");
    },
    onError: () => {
      toast.error("Erro ao remover edição");
    },
  });
}
