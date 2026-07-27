# KPI F3F Responsividade — Referência

Padrões responsivos canônicos do KPI F3F, com exemplos de código e arquivos de referência reais no repositório. A skill aplica estes padrões; este arquivo é a fonte de detalhe.

---

## Padrão A — Modal `<dialog>` rolável

**Sintoma que corrige:** rodapé do modal (Aplicar/Cancelar/Limpar) cortado e sem como rolar em 1366x768, zoom 125% ou quando um banner de erro aumenta a altura do conteúdo.

**Anti-padrão (errado):**

```tsx
<dialog className="w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-2xl ...">
  <header className="...">...</header>
  <div className="px-6 py-5 sm:grid-cols-2">...campos...</div>
  <footer className="border-t ...">...botões...</footer>
</dialog>
```

**Padrão correto:**

```tsx
<dialog className="w-[min(42rem,calc(100vw-2rem))] max-h-[90dvh] m-auto flex flex-col rounded-2xl ...">
  <header className="shrink-0 ...">...</header>

  {/* corpo rolável: banner de erro + grid de campos juntos */}
  <div className="min-h-0 flex-1 overflow-y-auto">
    {erro && <div className="...">{erro}</div>}
    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">...campos...</div>
  </div>

  <footer className="shrink-0 border-t ...">...botões...</footer>
</dialog>
```

**Chaves:** `max-h-[90dvh]` limita a altura; `flex flex-col` cria a coluna; `min-h-0 flex-1 overflow-y-auto` faz só o corpo rolar; `shrink-0` mantém header/footer fixos. Trocar qualquer `overflow-hidden` do `<dialog>` por essa estrutura.

**Referência aprovada no repo:** `src/modules/comercial/components/ComercialContratoEditar.tsx` — usa `flex max-h-[92vh] flex-col` + corpo `min-h-0 flex-1 overflow-y-auto` + footer `border-t`.

**Casos conhecidos do mesmo anti-padrão (varrer):**
- `src/modules/comercial/components/ContratosFiltrosModal.tsx`
- `src/modules/comercial/dashboard/components/ValidacaoContratoValidadoresFilterModal.tsx`
- `AlunosFiltrosModal` (Educacional) — mesmo problema.

---

## Padrão B — Toolbar / busca / barra de filtros fluida

**Sintoma:** toolbar estoura a largura ou a busca (largura fixa) empurra outros elementos para fora em telas estreitas.

```tsx
{/* container fluido com wrap */}
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
  <FiltroBuscaTexto className="w-full sm:w-64" ... />
  {/* demais filtros: larguras fluidas, sem px fixo */}
</div>
```

- Listagem do Comercial: `ComercialContratosContent.tsx` já usa `flex-col xl:flex-row` + `flex-wrap` — bom ponto de partida.
- Busca compartilhada: `src/shared/ui/FiltroBuscaTexto.tsx` usa `w-64`. **Atenção:** alterar para `w-full sm:w-64` afeta TODOS os consumidores (Educacional, Pessoas, etc.). Antes de mudar o compartilhado, validar impacto e acionar **KPI F3F Componentes**; se houver risco, aplicar a classe via prop só no módulo-alvo.

---

## Padrão C — Tabelas e KPI strips

**Sintoma:** tabela larga quebra o layout / cria scroll na página inteira em mobile.

```tsx
<div className="overflow-x-auto">
  <table className="min-w-full ...">...</table>
</div>
```

- Vale para `<table>` HTML manual, `DataTable` em container apertado e strips horizontais de KPI.
- **Referência no repo:** `EducacionalDashboardShell.tsx` (wrapper `overflow-x-auto`).
- Tabelas que costumam estourar: `MatriculaContratoCursoTable`, `MatriculaContratoTurmaTable`.

---

## Padrão D — Grids de dashboard e cards

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
  {/* KpiMetricCard / ChartCard */}
</div>
```

- Ajustar a contagem de colunas ao conteúdo (KPIs 4 col, cards de listagem 2–3).
- Gráficos (recharts): usar container responsivo (`ResponsiveContainer`/altura fixa + largura 100%), nunca largura em px.
- Barra de filtros do dashboard (ex.: `ComercialDashboardFiltrosBar.tsx`): `flex-wrap` + larguras fluidas; alinhar a `BarraFiltrosPadrao` quando aplicável.

---

## Padrão E — Formulários e processos (wizard/passos)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* campos */}
</div>
```

- Steps/wizard: empilhar verticalmente abaixo de `sm`; navegação de passos com `flex-wrap`.
- Botões de ação do formulário: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` (primário à direita no desktop, empilhado no mobile).
- Evitar `width`/`min-width` em px; usar `w-full`, `max-w-*`, `min-w-0` (o `min-w-0` é essencial para flex children truncarem em vez de estourar).

---

## Como auditar um módulo (busca prática)

1. **Modais:** procurar `<dialog` no módulo → conferir `max-h` + `flex flex-col` + corpo rolável.
2. **Tabelas:** procurar `<table` e `DataTable` → conferir wrapper `overflow-x-auto`.
3. **Larguras fixas suspeitas:** procurar `w-[`, `min-w-[`, `max-w-[` com px altos sem fallback responsivo.
4. **Toolbars/filtros:** conferir `flex-wrap` e `w-full sm:w-*` nas buscas.
5. **Grids:** conferir `grid-cols-*` sem o passo `grid-cols-1` para mobile.

---

## Validação (antes de concluir)

- **Viewports:** 1366x768 (notebook), 1366x768 @ zoom 125% (altura útil ~614px), ~375px (mobile).
- **Por modal:** abrir, rolar campos, confirmar que o rodapé fica visível e clicável.
- **Build/test:** `npm run build` (sem TS/lint novos) + testes do módulo.
- **Compartilhado:** se alterou `src/shared/ui`, validar todos os consumidores (delegar à **KPI F3F Componentes**).
- **Log:** se a tarefa nasceu de bug, registrar no `.context/docs/troubleshooting-log.md` (**KPI F3F Debugger**).

---

## Fronteiras (quem faz o quê)

- **KPI F3F Responsividade:** apresentação responsiva por módulo/tela (este escopo).
- **KPI F3F Frontend:** dona da camada de apresentação; esta skill é uma extensão focada.
- **KPI F3F Componentes:** qualquer alteração em componente compartilhado (`src/shared/ui`).
- **KPI F3F UX / Designer:** define comportamento/breakpoints esperados quando houver dúvida de design.
- **KPI F3F Debugger:** registro no troubleshooting-log quando for correção de bug.
- **Não toca:** schema, RLS, rotas, services, contratos, regra de negócio.
