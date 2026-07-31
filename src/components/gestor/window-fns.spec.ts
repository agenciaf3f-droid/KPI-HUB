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

/**
 * O CSS foi escopado trocando `body` por `.gestor-app`. A substituição entrou
 * no meio de um nome (`.drill-modal-body` virou `.drill-modal-.gestor-app`) e
 * a regra morreu calada — o corpo do drill ficou sem padding nem rolagem.
 */
describe("CSS escopado do painel do Gestor", () => {
  const css = readFileSync(join(dir, "gestor.css"), "utf8");

  it("não tem seletor colado no .gestor-app", () => {
    const quebrados = css
      .split("\n")
      .map((linha, i) => ({ linha: linha.trim(), n: i + 1 }))
      .filter(({ linha }) => /[-_a-zA-Z0-9]\.gestor-app|\.gestor-app[-_a-zA-Z0-9]/.test(linha))
      .map(({ linha, n }) => `${n}: ${linha.slice(0, 80)}`);
    expect(quebrados).toEqual([]);
  });

  it("as classes com 'body' do HTML têm regra no CSS", () => {
    const usadas = new Set<string>();
    for (const fonte of [markup, engine]) {
      for (const m of fonte.matchAll(/class="([^"]*body[^"]*)"/g)) {
        m[1].split(/\s+/).filter((c) => c.includes("body")).forEach((c) => usadas.add(c));
      }
    }
    const semRegra = [...usadas].filter((classe) => !css.includes(`.${classe}`));
    expect(semRegra).toEqual([]);
  });
});
