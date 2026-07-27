---
name: kpi-dashboards
description: Owns data-heavy dashboards in KPI F3F — KPI cards, charts, tables, filters, drill-down, accessibility and performance. Extends KPI F3F Frontend; uses TanStack Query v5, Recharts and `Table`/list patterns from shared UI. Optional features (virtualization, Visx/ECharts, axe-core) require explicit approval and registration in other KPI F3F skills.
---

# KPI F3F Dashboards

Skill para **dashboards** e telas **data-driven** no KPI F3F: KPIs, gráficos, tabelas, filtros sincronizados, drill-down, freshness e exportações. Complementa [KPI F3F Frontend](.claude/skills/kpi-frontend/SKILL.md) (rotas, layout, composição base); não substitui.

**Regra de leitura:** este arquivo é **normativo** (o quê é obrigatório). Exemplos longos, mapa de arquivos, snippets e fluxos detalhados ficam em [reference.md](reference.md).

**Projeto único:** [AGENTS.md](../../AGENTS.md) — repo `agenciaf3f-droid/KPI-HUB`, Supabase `ulikfkemdawinetjyhok`, produção `personalglobal.app`. Escopo por **papel** e vínculos (`pessoa_id`, `user_id`, matrícula, turma, mentoria) conforme [Auth e Rotas](.claude/skills/kpi-auth-rotas/SKILL.md), [modulos-por-role](../../src/lib/config/modulos-por-role.ts) e [acessos-por-role](../../src/lib/config/acessos-por-role.ts). Não confundir com `org_id` de outros produtos.

---

## Quando usar esta skill

Use **KPI F3F Dashboards** quando a tela tiver **ao menos um** destes sinais:

- KPIs, gráficos e tabela de detalhe compartilhando filtros ou período.
- Filtro global de período (`hoje`, `7d`, `30d`, `12m`, intervalo custom).
- Drill-down (clique em KPI/gráfico → lista ou detalhe operacional).
- Dashboard principal de módulo, overview executivo ou relatório operacional.
- Sub-painel analítico embutido (Painel Analítico).
- Agregação, paginação server-side, freshness ou exportação com volume relevante.

**Não use** para formulário, CRUD simples, card estático ou listagem sem camada analítica → **KPI F3F Frontend** / **KPI F3F Componentes**.

---

## Decisão rápida de padrão

| Cenário | Padrão |
|--------|--------|
| Dashboard compartilhável por link | **URL** (`searchParams`, `filter-url`) |
| Sub-painel embutido | **Painel Analítico** — estado local, sem URL do pai |
| Drill-down para registros | `DrillDownDialog` + query lazy (`enabled: open`) |
| Muitos registros na tabela | Agregação/paginação no **servidor**; virtualização no client só se aprovada |
| Séries muito densas | Decimar/agregar no **backend**; Recharts continua padrão |
| Mais de 4 KPIs ou mais de 2 gráficos principais | **KPI F3F UX / Designer** antes de implementar |
| Dados sensíveis ou escopo incerto | **Auth e Rotas** + **Security & Performance** antes da UI |
| Métricas novas no banco | **Supabase** (se view/RPC/índice) → **Backend** → **Dashboards** |

Detalhes de implementação: [reference.md](reference.md).

---

## Stack oficial

Conferir `package.json` antes de codar.

| Uso | Pacote / padrão |
|-----|-----------------|
| Cache | `@tanstack/react-query` **v5** — `placeholderData`, `staleTime` quando fizer sentido |
| Tabelas | `Table` (`@/components/ui/table`) — requisitos listas |
| Gráficos | `recharts` |
| UI | shadcn/ui + Tailwind + `lucide-react` |
| Datas | `date-fns` (`date-fns-tz` só com requisito de fuso) |
| Animações | `framer-motion` com moderação; `prefers-reduced-motion` |
| Estado local | `useState` / `useReducer`; `localStorage` só em Client Components |
| Testes | Jest + RTL (comportamento visível); Playwright para fluxos críticos |

**Não estão na raiz (verificar `package.json`):** `@tanstack/react-virtual`, `react-window`, Visx, ECharts, `axe-core`. **Não** instalar sem aprovação explícita ([AGENTS.md](../../AGENTS.md)).

### Dependências opcionais

| Necessidade | Procedimento |
|------------|--------------|
| Virtualização | Priorizar servidor; se indispensável, aprovar pacote e registrar em **KPI F3F Componentes** |
| Gráficos densos (Canvas/WebGL) | Agregar no backend primeiro; Visx/ECharts só com aprovação |
| Auditoria a11y automática | Checklist manual/RTL; `axe-core` só com **KPI F3F QA** e aprovação |
| Exportação PDF / formatos ricos | Fora do padrão; requisito + stack + aprovação |
| Debounce externo | Helper local; evitar `lodash` sem aprovação |

Se a dependência alterar **padrão arquitetural** do HUB, registrar em `` ou documento interno (via **KPI F3F Documentação**). Uso pontual em um módulo não autoriza outros a copiarem a lib.

---

## Princípios obrigatórios de UX

1. **Hierarquia:** período + filtros globais → KPIs → gráficos principais → tabela/drill-down.
2. **Progressive disclosure:** detalhes secundários em abas, dialogs ou colapsáveis.
3. **Estados por bloco:** skeleton, empty contextual, erro com retry, freshness quando houver `updatedAt`.
4. **Drill-down previsível:** mesmo segmento no gráfico/KPI e na lista; URL quando compartilhável.
5. **Consistência:** cores em `chart-theme.ts`; não inventar filtros/layout sem **UX**.
6. **Acessibilidade prática:** orientar-se por **WCAG 2.2** (sem prometer certificação): teclado, foco, contraste, labels/aria, resumo textual de gráficos, não depender só de cor.
7. **Movimento:** discreto; respeitar `prefers-reduced-motion`.
8. **Feedback:** toasts/banners para exportação, filtros e falhas.

Telas **simples** não devem ser bloqueadas por cerimônia excessiva — checklist mínimo + padrão existente.

---

## Performance (regras)

- **Server first:** agregar, filtrar e paginar no backend; **proibido** somar milhares de linhas no browser.
- **Query:** keys estáveis com filtros **normalizados**; TanStack Query v5 com `placeholderData` e `staleTime` quando aplicável.
- **Gráficos densos:** série já agregada/decimada no service; Recharts com payload pronto.
- **Lazy load:** abas, gráficos abaixo da dobra, drill-down sob demanda.
- **Client-only:** `localStorage`, `window`, `matchMedia`, `showModal()` só em `"use client"`.
- Virtualização e Canvas/WebGL são **último recurso** após esgotar servidor — ver [reference.md](reference.md).

---

## Contrato de dados

Consumo via **Server Actions**, **Route Handlers** (`src/app/api/*`) ou **services/repositories** ([KPI F3F Backend](.claude/skills/kpi-backend/SKILL.md)). **Não** criar tabelas, RLS, views ou migrations → [KPI F3F Supabase](.claude/skills/kpi-supabase-data-engineer/SKILL.md).

Todo payload deve especificar: filtros e período efetivo; KPIs; séries; segmentos de drill-down; catálogos de multi-select; `updatedAt` ou justificativa; escopo/permissões.

Camadas obrigatórias: `types` → `*-aggregate.ts` (puro, testado) → `*-service.ts` → actions/hooks → UI. Ver [reference.md](reference.md#arquitetura-e-camadas).

---

## Dois padrões oficiais

| Padrão | Uso resumido |
|--------|----------------|
| **Dashboard com URL** | Principal do módulo; `from`/`to` e filtros em `searchParams`; botão limpar filtros |
| **Painel Analítico** | Sub-painel; filtros locais; modelos em `localStorage`; referência: `src/lib/<modulo>.ts` |

Checklists e componentes: [reference.md](reference.md#padrão-painel-analítico).

---

## Integração com outras skills

| Skill | Papel |
|-------|--------|
| **Frontend** | Rotas, layouts, composição base |
| **Componentes** | `Table`, filtros, campos; virtualização quando aprovada |
| **Backend** | Services, agregações, actions |
| **Supabase** | Views, RPC, índices, RLS |
| **Auth e Rotas** | Escopo por role/sessão |
| **UX / Designer** | Dashboards complexos (muitos KPIs/gráficos) |
| **QA / Tester** | Aggregate, RTL, E2E, smoke |
| **Security & Performance** | Vazamento, N+1, limites de payload |
| **Documentação** | Requisitos em `.context/docs/` quando padrão virar oficial |

---

## Anti-padrões (bloqueiam PR)

- Somar dados brutos no client (`useMemo` em milhares de linhas).
- Gráfico/KPI sem loading, empty ou retry.
- KPI sem contexto de período.
- Cor como único indicador de status.
- `useEffect` só para fetch quando Query/Server Action resolve.
- Query key com filtros não normalizados.
- Tabela HTML própria onde deveria ser `Table`.
- Instalar lib opcional sem aprovação/ADR.
- Admin client sem justificativa documentada.
- Lógica de negócio duplicada entre service e componente.
- Snapshots como teste principal (preferir RTL por comportamento).

---

## Checklist de aceite

- [ ] Período e filtros visíveis; chips quando aplicável.
- [ ] KPIs, gráficos e tabelas no **mesmo** filtro/período.
- [ ] Skeleton por bloco; empty e erro com retry.
- [ ] Freshness quando existir `updatedAt`.
- [ ] URL reproduz estado (se compartilhável).
- [ ] Volume grande: agregação/paginação no servidor.
- [ ] Drill-down lazy; exportação CSV só se autorizada (mesmo filtro).
- [ ] Aggregate com teste unitário.
- [ ] Permissões e escopo respeitados.
- [ ] Acessibilidade básica (teclado, contraste, resumo de gráfico).
- [ ] `prefers-reduced-motion` respeitado.
- [ ] `npm run build` e `npm run test` quando alterar comportamento.
- [ ] Nenhuma dependência nova sem aprovação.

---

## Formato de saída (quando acionada)

1. **Diagnóstico** — por que é Dashboards; ordem das outras skills.
2. **Estrutura** — seções, estados, progressive disclosure, drill-down.
3. **Contrato de dados** — filtros, payload, KPIs, séries, escopo.
4. **Plano** — passos por camada e caminhos de arquivo.
5. **Código** — `src/app/`, `src/lib/`, `src/lib/` conforme repo.
6. **Testes** — aggregate; RTL; E2E se crítico.
7. **Riscos** — performance, permissão, deps opcionais.

Não incluir exemplos extensos nem links externos como regra nesta resposta — apontar [reference.md](reference.md).

---

## Referência

- [reference.md](reference.md) — exemplos, Painel Analítico, hooks, mapa Educacional.
- requisitos-dashboards-padronizados.md — padrão transversal no HUB (índice `.context/docs`).
- ADR 004 — Dashboards padronizados — governança HUB.
- QA smoke dashboards — checklist manual.
- Componentes: Card com gráfico, Card de métrica em `@/components/ui` — reference Componentes § Dashboards.
- requisitos-listas-e-filtros-padronizados.md — tabelas de detalhe em dashboards.
- [KPI F3F Frontend](.claude/skills/kpi-frontend/SKILL.md) · Componentes · [Backend](.claude/skills/kpi-backend/SKILL.md)
- [skills-map.md](../../.context/docs/skills-map.md) · [AGENTS.md](../../AGENTS.md)
- Código referência: `src/lib/<modulo>.ts`
