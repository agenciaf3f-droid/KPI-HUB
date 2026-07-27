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
export function GestorApp({ churnOnly = false }: { churnOnly?: boolean } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const mod = await import("./engine");
      if (cancelled || !hostRef.current) return;
      mod.initGestor(hostRef.current);
      destroy = mod.destroyGestor;
      if (churnOnly) {
        // Aba Churn: mesmo app do gestor aberto direto na seção Churn.
        // O seletor interno some via CSS (.churn-only) — o resto é idêntico.
        hostRef.current.classList.add("churn-only");
        (window as unknown as { switchTab?: (t: string) => void }).switchTab?.("tab3");
      }
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [churnOnly]);

  return <div ref={hostRef} className="gestor-app min-h-svh" />;
}
