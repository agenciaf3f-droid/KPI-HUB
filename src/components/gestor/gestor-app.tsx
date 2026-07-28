"use client";

import { useEffect, useRef } from "react";

import "./gestor.css";

/**
 * Aba Gestor — o código do Dash-Gestores como módulo do app (markup + engine
 * transplantados em build; ver ./engine.js). Sem login próprio: a sessão é a
 * do hub, garantida pelo RSC de /gestor.
 *
 * O import do engine é dinâmico e roda DEPOIS do mount: o módulo referencia
 * `document` e o init() precisa do markup já no DOM.
 */
/** Recorte de quem está vendo o painel. Vem do RSC — nunca do cliente. */
export type EscopoGestor = { nome: string; admin: boolean; gestor: boolean; editor: boolean };

// Props primitivas de propósito: um objeto seria recriado a cada render e
// reiniciaria o motor inteiro no efeito.
export function GestorApp({
  churnOnly = false,
  nome = "",
  admin = false,
  gestor = false,
  editor = false,
}: {
  churnOnly?: boolean;
  nome?: string;
  admin?: boolean;
  gestor?: boolean;
  editor?: boolean;
} = {}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    let observer: MutationObserver | undefined;

    void (async () => {
      const mod = await import("./engine");
      if (cancelled || !hostRef.current) return;
      // Antes do init: o motor lê o escopo já na primeira renderização dos dados.
      (window as unknown as { __F3F_ESCOPO?: EscopoGestor }).__F3F_ESCOPO = { nome, admin, gestor, editor };
      if (!admin) hostRef.current.classList.add("escopo-usuario");
      mod.initGestor(hostRef.current);
      destroy = mod.destroyGestor;
      if (churnOnly) {
        // Aba Churn: mesmo app do gestor aberto direto na seção Churn.
        // O seletor interno some via CSS (.churn-only) — o resto é idêntico.
        hostRef.current.classList.add("churn-only");
        (window as unknown as { switchTab?: (t: string) => void }).switchTab?.("tab3");
      }

      // O CSS acompanha o tema sozinho, mas o Chart.js recebe cor literal na
      // criação: ao trocar claro/escuro é preciso redesenhar os gráficos.
      observer = new MutationObserver(() => {
        const w = window as unknown as { applyFilter?: () => void; churnRender?: () => void };
        try {
          w.applyFilter?.();
          w.churnRender?.();
        } catch {
          /* gráfico ainda não montado — o próximo refresh pega o tema novo */
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      destroy?.();
    };
  }, [churnOnly, nome, admin, gestor, editor]);

  return <div ref={hostRef} className="gestor-app min-h-svh" />;
}
