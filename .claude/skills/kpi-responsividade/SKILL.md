---
name: kpi-responsividade
description: Audits and fixes responsiveness across an KPI F3F module or screen — pages, toolbars, filters, modals/dialogs, tables and dashboards. Applies the project's canonical responsive patterns (Tailwind breakpoints, scrollable <dialog>, overflow-x-auto tables, fluid filter bars) so action buttons never get cut off on notebooks (1366x768) or mobile. Use when the user asks to make a module/screen responsive, reports cut-off content, modal footers off-screen, horizontal overflow, or layout breaking on small/zoomed viewports.
---

# KPI F3F Responsividade

Skill de **manutenção responsiva certeira** por módulo ou tela. Quando acionada, **audita** todo o módulo/tela informado (páginas, toolbar/busca, filtros, modais, tabelas, KPI strips, formulários, processos) e aplica as **correções responsivas padronizadas do KPI F3F** — sem inventar padrão novo e sem alterar regra de negócio.

Estende a skill [KPI F3F Frontend](../kpi-frontend/SKILL.md) (camada de apresentação). Mudanças em **componentes compartilhados** (`src/shared/ui`) são delegadas à skill [KPI F3F Componentes](../kpi-componentes/SKILL.md). Comportamento/breakpoints podem ser validados com [KPI F3F UX / Designer](../kpi-ux-designer/SKILL.md).

## Escopo

- **É desta skill:** ajustes de apresentação (Tailwind/JSX) para responsividade — layout fluido, scroll interno, overflow controlado, breakpoints, wrap de filtros, footers sempre clicáveis.
- **NÃO é desta skill:** schema, RLS, rotas, services, contratos de integração, regra de negócio. Apenas apresentação.

## Alvos obrigatórios da auditoria (varrer o módulo inteiro)

Ao receber "deixe o módulo X responsivo" (ou uma tela específica), inspecione e corrija nesta ordem:

1. **Modais / `<dialog>`** — maior fonte de bug (footer com Aplicar/Cancelar cortado).
2. **Toolbar e busca** da listagem (overflow em telas estreitas).
3. **Filtros** (barra de filtros, modais de filtro, chips).
4. **Tabelas** e KPI strips (overflow horizontal).
5. **Dashboard** (grids de cards, gráficos).
6. **Formulários / processos** (grids de campos, passos/wizards).

## Fluxo de trabalho

Copie e acompanhe o checklist:

```
Auditoria de responsividade — módulo/tela: ___________
- [ ] 1. Mapear arquivos do módulo (modais, listagem, filtros, tabelas, dashboard, forms)
- [ ] 2. Modais/<dialog>: aplicar esqueleto rolável (ver Padrão A)
- [ ] 3. Toolbar/busca: layout fluido + wrap (Padrão B)
- [ ] 4. Filtros: barra com flex-wrap e larguras fluidas (Padrão B)
- [ ] 5. Tabelas/KPI: wrapper overflow-x-auto (Padrão C)
- [ ] 6. Dashboard: grids responsivos (Padrão D)
- [ ] 7. Forms/processos: grid-cols-1 sm:grid-cols-2 (Padrão E)
- [ ] 8. Validar em 1366x768 e largura mobile; build/test
- [ ] 9. Se tocou componente compartilhado: acionar KPI F3F Componentes
- [ ] 10. Registrar correções (se foi bug) no troubleshooting-log
```

**Passo 1 — Mapear:** localizar os arquivos do módulo em `src/modules/<modulo>/` (e a página em `src/app/(dashboard)/<modulo>/`). Identificar todos os `<dialog>`, listagens (`DataTable`/`<table>`), barras de filtro e dashboards.

**Passos 2–7 — Aplicar padrões:** usar os padrões canônicos abaixo. Detalhes, exemplos completos e referências de arquivos do repositório em [reference.md](reference.md).

**Passo 8 — Validar:** mentalmente (ou com o usuário) conferir 1366x768 (notebook), zoom 125% e largura mobile (~375px). Rodar `npm run build` e os testes do módulo. Não introduzir TS/lint novos.

**Passos 9–10 — Fronteiras:** se a correção certa for em `src/shared/ui` (ex.: `FiltroBuscaTexto`, `DataTable`), **não alterar direto** — validar impacto em todos os consumidores e acionar a skill **KPI F3F Componentes** (ou aplicar via prop/classe só no módulo). Se a tarefa nasceu de um bug, registrar no `troubleshooting-log.md` (skill **KPI F3F Debugger**).

## Padrões canônicos (resumo — completo no reference)

### Padrão A — Modal `<dialog>` rolável (prioridade máxima)

`<dialog>` deve ter altura limitada e corpo rolável, com header/footer sempre visíveis:

- `<dialog>`: `max-h-[90dvh] m-auto flex flex-col` (trocar qualquer `overflow-hidden` por isto; manter largura/estilos).
- Header: `shrink-0`.
- Corpo (campos + banners): `<div className="min-h-0 flex-1 overflow-y-auto">`.
- Footer: `shrink-0` no `border-t` existente.

Referência aprovada no repo: `ComercialContratoEditar.tsx` (`flex max-h-[92vh] flex-col` + corpo `min-h-0 flex-1 overflow-y-auto`).

### Padrão B — Toolbar / filtros fluidos

- Container: `flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center`.
- Busca: `w-full sm:w-64` (não largura fixa que force overflow).
- Barra de filtros: `flex-wrap` + larguras fluidas; alinhar a `BarraFiltrosPadrao` quando existir.

### Padrão C — Tabelas e KPI strips

Envolver toda `<table>`/`DataTable`/strip de KPIs em `<div className="overflow-x-auto">` (padrão de `EducacionalDashboardShell.tsx`). Em mobile a tabela rola horizontalmente em vez de quebrar o layout.

### Padrão D — Grids de dashboard

`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` (ajustar contagem ao conteúdo); gráficos em container responsivo.

### Padrão E — Formulários e processos

Grids de campos: `grid grid-cols-1 sm:grid-cols-2 gap-4`. Wizards/passos: empilhar verticalmente abaixo de `sm`, evitar largura fixa em px.

## Regras de ouro

- **Unidades:** preferir `dvh` para altura de viewport (fallback `vh` já usado no projeto); confirmar consistência entre modais do mesmo módulo.
- **Mobile-first:** classe base = telas pequenas; usar prefixos `sm:`/`md:`/`lg:`/`xl:` para crescer.
- **Sem largura fixa em px** que cause overflow; preferir `w-full`, `max-w-*`, `min-w-0`.
- **Não mudar lógica:** só apresentação. Sem alterar dados, queries, validações ou copy.
- **Compartilhado é da Componentes:** Frontend/Responsividade consomem; não criam variante de campo padronizado.

## Breakpoints alvo

- `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536 (Tailwind padrão).
- **Caso crítico do projeto:** notebooks **1366x768** (com zoom 125% a altura útil cai para ~614px) — onde modais sem scroll cortam o rodapé.

## Referência

- Padrões completos, exemplos de código e arquivos de referência no repo: [reference.md](reference.md).
- Camada de apresentação e listagens padronizadas: [KPI F3F Frontend](../kpi-frontend/SKILL.md).
- Componentes compartilhados (alterações em `src/shared/ui`): [KPI F3F Componentes](../kpi-componentes/SKILL.md).
