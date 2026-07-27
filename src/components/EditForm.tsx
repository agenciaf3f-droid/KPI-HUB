import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientCombobox } from "@/components/ClientCombobox";
import { useStartEdit } from "@/hooks/useVideoEdits";
import { useAuth } from "@/lib/editor-auth";
import { Play } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type VideoFormat = Database["public"]["Enums"]["video_format"];

const FORMATS: VideoFormat[] = ["VSL", "Criativo", "Ajuste", "IA", "CTAs", "Frank", "Hook"];

const MAX_QUANTITY = 5;
const QUANTITIES = [1, 2, 3, 4, 5];

export function EditForm() {
  const { currentEditor } = useAuth();
  const [clientName, setClientName] = useState("");
  const [videoFormat, setVideoFormat] = useState<VideoFormat | "">("");
  const [quantity, setQuantity] = useState(1);
  // Sempre 5 posições: reduzir a quantidade só esconde os extras (o submit corta).
  const [videoNames, setVideoNames] = useState<string[]>(() => Array(MAX_QUANTITY).fill(""));
  const [rawLinks, setRawLinks] = useState<string[]>(() => Array(MAX_QUANTITY).fill(""));

  const startEdit = useStartEdit();

  const setVideoNameAt = (i: number, value: string) =>
    setVideoNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));

  const setRawLinkAt = (i: number, value: string) =>
    setRawLinks((prev) => prev.map((l, idx) => (idx === i ? value : l)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = videoNames.slice(0, quantity).map((n) => n.trim());
    // Todos os nomes são obrigatórios (um por vídeo do lote); os links não.
    if (!clientName || !videoFormat || !currentEditor || names.some((n) => !n)) return;

    startEdit.mutate(
      {
        client_name: clientName,
        video_format: videoFormat as VideoFormat,
        editor_name: currentEditor,
        quantity,
        videoNames: names,
        // Corta em `quantity` para não enviar links de campos já escondidos.
        rawLinks: rawLinks.slice(0, quantity).map((l) => l.trim()),
      },
      {
        onSuccess: () => {
          setClientName("");
          setVideoFormat("");
          setQuantity(1);
          setVideoNames(Array(MAX_QUANTITY).fill(""));
          setRawLinks(Array(MAX_QUANTITY).fill(""));
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5 text-primary" />
            Iniciar Edição
          </CardTitle>
          {currentEditor && (
            <span className="text-sm text-muted-foreground">
              Editor: <span className="font-medium text-foreground">{currentEditor}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2 sm:min-w-[180px] sm:flex-1">
            <Label>Cliente</Label>
            <ClientCombobox value={clientName} onChange={setClientName} />
          </div>
          <div className="space-y-2 sm:min-w-[150px] sm:flex-1">
            <Label>Tipo de Vídeo</Label>
            <Select value={videoFormat} onValueChange={(v) => setVideoFormat(v as VideoFormat)}>
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:min-w-[110px]">
            <Label>Quantidade</Label>
            <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
              <SelectTrigger className="min-w-0" aria-label="Quantidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUANTITIES.map((q) => (
                  <SelectItem key={q} value={String(q)}>
                    {q} {q === 1 ? "vídeo" : "vídeos"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Um par "Nome + Link Bruto" por vídeo do lote (nome obrigatório, link opcional). */}
          <div className="w-full">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rawLinks.slice(0, quantity).map((link, i) => (
                <div
                  key={i}
                  className="min-w-0 space-y-2 rounded-lg border border-border bg-secondary/20 p-3"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Vídeo {i + 1}
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor={`video-name-${i}`}>Nome do Vídeo {i + 1}</Label>
                    <Input
                      id={`video-name-${i}`}
                      value={videoNames[i]}
                      onChange={(e) => setVideoNameAt(i, e.target.value)}
                      placeholder="Ex.: VSL Cliente X"
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`raw-link-${i}`}>Link Bruto {i + 1}</Label>
                    <Input
                      id={`raw-link-${i}`}
                      value={link}
                      onChange={(e) => setRawLinkAt(i, e.target.value)}
                      placeholder="https://... (opcional)"
                      className="w-full min-w-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={startEdit.isPending} className="w-full sm:w-auto sm:min-w-[130px] sm:self-end">
            {startEdit.isPending ? "Iniciando..." : "Iniciar Edição"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
