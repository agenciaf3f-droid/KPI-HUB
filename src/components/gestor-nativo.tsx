"use client";

// Aba Gestor SEM iframe: o código do Dash-Gestores (dashboard.html — markup,
// CSS e scripts) é injetado DIRETO nesta página e executa no mesmo documento
// do hub. É o código do projeto antigo rodando como parte da aba.
//
// Por que injetar em runtime em vez de JSX: são 5.697 linhas de vanilla JS que
// manipulam o DOM por id. Reescrevê-las em React é um projeto à parte; injetar
// preserva o código byte a byte, que é o combinado.
//
// Regra de navegação: a entrada nesta rota é SEMPRE full page load (o link da
// sidebar usa <a>, não <Link>) — os scripts do dashboard declaram const no
// escopo global e não podem executar duas vezes no mesmo documento.
import { useEffect, useRef } from "react";

export function GestorNativo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !hostRef.current) return;
    started.current = true;
    const host = hostRef.current;

    (async () => {
      const res = await fetch("/dashboard.html", { credentials: "same-origin" });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      // estilos e fontes do <head> do dashboard
      for (const node of Array.from(doc.head.querySelectorAll("style, link[rel='stylesheet'], link[rel='preconnect']"))) {
        document.head.appendChild(node.cloneNode(true));
      }

      // corpo sem os <script> (executados manualmente, em ordem, abaixo)
      const scripts = Array.from(doc.querySelectorAll("script"));
      const ordered = scripts.map((s) => ({ src: s.getAttribute("src"), text: s.textContent ?? "" }));
      scripts.forEach((s) => s.remove());
      host.innerHTML = doc.body.innerHTML;

      // executa na ordem do documento; src externo (Chart.js, supabase) espera carregar
      for (const item of ordered) {
        await new Promise<void>((resolve) => {
          const el = document.createElement("script");
          if (item.src) {
            el.src = item.src;
            el.onload = () => resolve();
            el.onerror = () => resolve();
          } else {
            el.textContent = item.text;
          }
          document.body.appendChild(el);
          if (!item.src) resolve();
        });
      }
    })();
  }, []);

  return <div ref={hostRef} className="gestor-host min-h-svh" />;
}
