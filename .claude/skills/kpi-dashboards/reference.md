# Referência – KPI F3F Dashboards

Complemento normativo de [SKILL.md](SKILL.md). Use este arquivo para **exemplos**, **mapa de arquivos**, **fluxos** e **decisões de implementação**. O Frontend continua sendo a base de páginas; esta skill entra em **dashboard / visão analítica / métricas + gráficos + tabela sincronizada**.

**Requisito transversal (HUB):** requisitos-dashboards-padronizados.md — índice em [.context/docs/README.md](../../.context/docs/README.md)

---

## Limites (não invadir)

| Esta skill **não** | Delegar para |
|--------------------|--------------|
| Criar tabelas, RLS, views, migrations | **KPI F3F Supabase** |
| Campos reutilizáveis (data, moeda, CPF) | **KPI F3F Componentes** |
| Services/repositories e regras de agregação | **KPI F3F Backend** |
| Middleware, sessão, escopo de role | **KPI F3F Auth e Rotas** |
| Mockup/copy de dashboard complexo | **KPI F3F UX / Designer** (recomendado antes de codar) |
| ADR e índice `.context/docs` | **KPI F3F Documentação** |

---

## Listagens padronizadas

Tabela de detalhe em dashboard: **`Table` +  + ** — requisitos-listas-e-filtros-padronizados.md. KPIs e gráficos ficam acima; não substituem essa regra.

---

## Ordem multi-skill

| Cenário | Ordem |
|---------|--------|
| Dashboard novo com métricas novas no banco | UX (opcional) → Supabase (view/RPC/índice) → Backend → **Dashboards** → QA |
| Só mudança visual | **Dashboards** (+ Frontend se rotas/layout) |
| Performance ruim | Security & Performance → Backend/Supabase → Dashboards → QA |
| Componente reutilizável novo (Card com gráfico global, virtualização) | Componentes → Dashboards |
| Auditoria de módulo | kpi-relatorio-modulo → correções por skill dona |

---

## Matriz de implementações no repositório

| Módulo / rota | Padrão | Observação |
|---------------|--------|------------|
| `src/lib/<modulo>.ts` (Validação de cadastro) | **Painel Analítico** | Referência oficial (mar/2026) |
| Educacional — shell + `filter-url` | **URL** | `EducacionalDashboardShell`, `useEducacionalDashboardFilters` |
| Analytics eventos (`EventoMetricasDashboard`) | Legado / híbrido | Recharts + `Table`; alinhado a dashboards, não ao Painel Analítico completo |
| Analytics mentores, aniversariantes, eventos convidados | Gráficos pontuais | Avaliar convergência só se houver refactor planejado |

Não forçar rewrite de legado; novos painéis seguem Educacional ou URL conforme [SKILL.md](SKILL.md).

---

## Arquitetura e camadas

```text
src/lib/{modulo}/dashboard/
  types-{modulo}.ts
  services/{modulo}-dashboard-aggregate.ts   # puro, testado
  services/{modulo}-dashboard-service.ts   # fetch + aggregate
  hooks/use{Modulo}DashboardQuery.ts
  components/{Modulo}DashboardPanel.tsx
  components/{Modulo}Toolbar.tsx
  components/{Modulo}Chart.tsx
  components/{Modulo}DrillDownDialog.tsx
  components/{Modulo}ModelsDialog.tsx        # Painel Analítico
  constants/chart-theme.ts
  constants/{modulo}-chart-models.ts
  __tests__/{modulo}-dashboard-aggregate.spec.ts
```

**Regras:**

- `aggregate` — sem Supabase, browser ou UI.
- `service` — não duplica aggregate.
- `Panel` — não soma linhas brutas.
- `Chart` — payload pronto; `onDrill(segment, title)`.
- `DrillDown` — `enabled: open && !!filtros` (ou segment).
- Admin client — só com comentário de justificativa (RLS).

Server Actions de exemplo (Creator): `obterDashboardValidacaoCadastro`, `obterValidacaoDrillDown` em `src/app/(dashboard)/educacional/actions.ts`.

---

## TanStack Query v5 e SSR

- **Preferir** Server Components para blocos estáticos sem interação.
- **Client Components** para filtros, gráficos interativos, `localStorage`, `<dialog>`, TanStack Query.
- Evitar `useEffect` só para fetch; usar Query ou Server Action + hidratação quando fizer sentido.

```ts
// src/lib/{modulo}/dashboard/hooks/useModuloDashboardQuery.ts
"use client"

import { useQuery } from "@tanstack/react-query"

import { obterModuloDashboard } from "../services/modulo-dashboard-service"
import type { ModuloDashboardFilters } from "../types-modulo"

export function useModuloDashboardQuery(filters: ModuloDashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "modulo", filters],
    queryFn: () => obterModuloDashboard(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  })
}
```

**URL + Query:** normalizar filtros antes de compor `queryKey` e `searchParams` (ordem estável de chaves, tipos coerentes). Educacional: `src/lib/<modulo>.ts` + testes.

---

## Padrão: dashboard com URL

- `from`, `to` e dimensões em `searchParams`.
- Sanitizar filtros inválidos na leitura da URL.
- Botão **Limpar filtros**.
- Navegação voltar/avançar preserva estado coerente.
- Invalidar query após mutations que alterem métricas exibidas.

Layout sugerido (módulo com abas): [painel com abas no Frontend](../kpi-frontend/reference.md) — header → toolbar → KPIs → 2–4 gráficos → `Table` → dialog de detalhe.

---

## Padrão Painel Analítico

Sub-painel: KPIs + um gráfico principal + drill-down; **filtros locais** (`useState`), independentes do dashboard pai.

### Mapa de arquivos (Educacional – Validação de cadastro)

| Arquivo | Responsabilidade |
|---------|------------------|
| `ValidacaoCadastroDashboardPanel.tsx` | Orquestra filtros, modelo, drill-down, prefs |
| `ValidacaoCadastroToolbar.tsx` | Período, dimensões, limpar filtros |
| `ValidacaoValidadoresFilterModal.tsx` | Multi-select OR, busca, chips |
| `ValidacaoCadastroChart.tsx` | `switch (view)`; recharts; `onDrill` |
| `ValidacaoCadastroModelsDialog.tsx` | Catálogo de modelos |
| `ValidacaoDrillDownDialog.tsx` | Lista lazy, busca, link edição |
| `validacao-chart-models.ts` | `ChartModel[]` |
| `chart-theme.ts` | Paleta semântica |
| `validacao-dashboard-aggregate.ts` | Lógica pura + testes |
| `validacao-dashboard-service.ts` | Fetch; admin client se necessário |
| `useValidacaoDashboardQuery.ts` | TanStack Query |
| `types-validacao.ts` | Filtros, payload, segmentos |

### Stack UI do gráfico

| Camada | Componente |
|--------|------------|
| Gráficos | `recharts`: Pie, Bar (empilhado/agrupado), Area/Line/Bar + `Brush` |
| Card | Card com gráfico — skeleton ~280px, erro + retry |
| KPI | Card de métrica |
| Modais | `<dialog>` nativo + `showModal()` / `close()` |
| Período | Presets + `DateRangePicker` |
| Prefs | `localStorage` (modelo ativo, tipo de gráfico temporal) |

### Catálogo de modelos

```ts
interface ChartModel {
  id: string
  title: string
  view: ChartView
  objective: string
  howItHelps: string
  defaultEvolucaoType?: "area" | "line" | "bar"
}
```

- `*ModelsDialog`: grid, preview, **Aplicar** → `localStorage`.
- `*Chart.tsx`: um `switch (view)` para todos os tipos recharts.

### Toolbar e multi-select

- Toolbar declara independência do dashboard pai.
- Multi-select em modal: checkboxes, busca, “Marcar visíveis”, chips.
- Lógica **OR** no aggregate; service retorna **catálogo** de opções separado do recorte filtrado.

### Drill-down

1. Clique → `onDrill(segment, title)`.
2. `DrillDownDialog` abre; query `enabled: open && !!filtros`.
3. Busca local na lista retornada; link para rota do domínio (ex. `/gestao-de-pessoas/pessoas/{id}/editar`).
4. Exportação **CSV** opcional, mesmo filtro/período, se autorizado.

Query key sugerida: `['{modulo}-drill-down', filtros]`.

### Decisões de produto validadas

- Filtros locais no sub-painel (não herdar URL do pai).
- Modelos com `objective` + `howItHelps` (onboarding sem doc externa).
- Drill-down em dialog (mantém contexto).
- Card com gráfico e Card de métrica em `src/components/ui/` — importar de `@/components/ui` (registro em **KPI F3F Componentes**). Tema de cores: `chart-theme.ts` no módulo.

### Ordem ao criar novo painel

1. UX (opcional): KPIs, modelos, segmentos.
2. Backend: `types` → `aggregate` + testes → `service` → Server Actions.
3. Dashboards: Toolbar → Panel → Chart → ModelsDialog → DrillDownDialog → hook.
4. QA: aggregate; smoke drill-down e multi-select.

### Checklist Painel Analítico

- [ ] Mesmo `Payload` em KPIs, gráfico e toolbar.
- [ ] Filtros locais independentes do pai.
- [ ] Skeleton, empty, retry por bloco; freshness se `updatedAt`.
- [ ] Modelos documentados no catálogo.
- [ ] Drill-down lazy; cores em `chart-theme.ts`.
- [ ] Aggregate testado; service sem duplicar regra.
- [ ] Resumo acessível do gráfico; dialog com foco/teclado.
- [ ] CSV export só se permitido.

---

## Acessibilidade (checklist prático)

- Título e resumo textual do insight (`sr-only` ou texto visível auxiliar).
- Legenda legível; tooltip com valores.
- Contraste e foco visível em controles interativos.
- Não depender só de cor (ícone/textura/label).
- `prefers-reduced-motion` em animações Framer.

```tsx
// src/lib/{modulo}/dashboard/components/ModuloChartSummary.tsx
type ModuloChartSummaryProps = { title: string; summary: string }

export function ModuloChartSummary({ title, summary }: ModuloChartSummaryProps) {
  return (
    <p className="sr-only" aria-label={title}>
      {summary}
    </p>
  )
}
```

---

## Virtualização (opcional, após aprovação)

Só após paginação/agregação no servidor e aprovação + registro em **KPI F3F Componentes**.

```tsx
// Exemplo conceitual — requer @tanstack/react-virtual instalado e aprovado
"use client"

import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

type Row = { id: string }

export function VirtualizedDrillDownList({ rows }: { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={rows[item.index].id}
            className="absolute left-0 w-full"
            style={{ height: item.size, transform: `translateY(${item.start}px)` }}
          >
            {/* render da linha */}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Exportações

- **CSV:** padrão quando exportação for necessária; respeitar filtros ativos.
- **PDF / relatórios ricos:** fora do escopo padrão; requisito explícito + stack aprovada.
- Dados sensíveis: validar com Auth/Security antes de expor no client.

---

## Testes

| Camada | O quê |
|--------|--------|
| `*-aggregate.spec.ts` | Obrigatório — payloads, filtros, segmentos, OR multi-select |
| RTL | Comportamento visível (loading, empty, erro, drill aberto) |
| Playwright | Fluxos críticos (filtro → gráfico → drill → link) |
| Snapshots | Opcionais; não substituem RTL/E2E |

Smoke manual: limpar filtros, trocar modelo, abrir drill-down, conferir escopo por role.

---

## Links úteis

- [SKILL.md](SKILL.md) — norma enxuta
- [skills-map.md](../../.context/docs/skills-map.md)
- [AGENTS.md](../../AGENTS.md)
- [KPI F3F Frontend](../kpi-frontend/SKILL.md) · Componentes
- Código: `src/lib/<modulo>.ts`

Estudos externos ou tendências de mercado **não** são regra desta skill até virarem ADR ou doc em `.context/docs/`.
