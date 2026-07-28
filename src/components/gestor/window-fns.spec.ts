import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O painel do Gestor é código transplantado de um `<script>` global, onde
 * `onclick="foo()"` resolvia direto. Como módulo ES, só o que passa por
 * `Object.assign(window, WINDOW_FNS)` fica visível para esses handlers.
 *
 * Esquecer um nome não quebra build, lint nem tipo: o botão simplesmente não
 * responde. Foi assim que `dpClick` (seleção de data) e os quatro drills
 * ficaram mudos. Este teste é o alarme para a próxima vez.
 */
const dir = join(process.cwd(), "src/components/gestor");
const engine = readFileSync(join(dir, "engine.js"), "utf8");
const markup = readFileSync(join(dir, "markup.ts"), "utf8");

/** Nomes declarados em `const WINDOW_FNS = { ... }`. */
function expostas(): Set<string> {
  const bloco = engine.match(/const WINDOW_FNS = \{([\s\S]*?)\};/);
  if (!bloco) throw new Error("WINDOW_FNS não encontrado em engine.js");
  return new Set(
    bloco[1]
      .split("\n")
      .map((linha) => linha.replace(/\/\/.*$/, "")) // tira comentários
      .join(",")
      .split(",")
      .map((nome) => nome.trim())
      .filter(Boolean),
  );
}

/** Toda função chamada de um atributo `on*="nome(..."`. */
function handlersInline(fonte: string): Set<string> {
  const nomes = new Set<string>();
  for (const m of fonte.matchAll(/\son[a-z]+="\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    // `this.style...` e afins não são funções do módulo.
    if (!["this", "document", "window"].includes(m[1])) nomes.add(m[1]);
  }
  return nomes;
}

describe("handlers inline do painel do Gestor", () => {
  it("todo onclick do markup estático está em WINDOW_FNS", () => {
    const disponiveis = expostas();
    const faltando = [...handlersInline(markup)].filter((nome) => !disponiveis.has(nome));
    expect(faltando).toEqual([]);
  });

  it("todo onclick gerado em runtime pelo engine está em WINDOW_FNS", () => {
    const disponiveis = expostas();
    const faltando = [...handlersInline(engine)].filter((nome) => !disponiveis.has(nome));
    expect(faltando).toEqual([]);
  });

  it("nomes expostos existem de fato no módulo", () => {
    const orfaos = [...expostas()].filter(
      (nome) => !new RegExp(`function ${nome}\\s*\\(`).test(engine),
    );
    expect(orfaos).toEqual([]);
  });
});
