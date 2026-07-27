---
name: kpi-frontend
description: Owns the KPI F3F presentation layer. Next.js App Router, TypeScript, Tailwind, functional components. Use when creating or changing pages, routes, layouts, forms, styles, or integrating UI with Supabase. Uses standardized field components from KPI F3F Componentes skill; does not define new reusable field components.
---

# KPI F3F Frontend

Responsável por toda a camada de apresentação do KPI F3F: componentes, páginas, formulários, estilos e padrões de UI. Stack definida em [project-plan.md](.context/docs/project-plan.md).

## Stack (aprovada)

- **Framework:** Next.js (App Router). **Linguagem:** TypeScript.
- **UI Kit:** **shadcn/ui** (componentes copiáveis) + **Tailwind CSS**.
- **State Server:** **TanStack Query** (obrigatório para cache/mutations de dados).
- **State Local:** React Context + Hooks (apenas para UI global leve).
- **Cliente Supabase:** `@supabase/supabase-js` + `@supabase/ssr`.
- **Testes:** Jest + React Testing Library para componentes; E2E (Playwright) quando necessário.

## Quando usar esta skill

- Criar ou alterar páginas, layouts e rotas (App Router).
- Criar ou alterar páginas e componentes de tela que **usam** os componentes padronizados (não criar novos componentes reutilizáveis de campo – isso é da skill KPI F3F Componentes).
- Usar campos padronizados (CPF, telefone, data, moeda) conforme definido na skill **KPI F3F Componentes** – ver reference da skill Componentes.
- Aplicar ou ajustar estilos com Tailwind; manter consistência de tema.
- Integrar dados do Supabase em componentes (hooks, Server Components, React Query/SWR).
- Garantir acessibilidade (labels, foco, contraste) e responsividade.

## Regras de código

- **Server vs Client:** Por padrão, crie **Server Components**. Use `'use client'` no topo do arquivo APENAS se o componente precisar de interatividade (onClick, onChange, hooks).
- **Shadcn/UI:** Prefira usar componentes primitivos do shadcn (ex.: Card, Button, Dialog) instalados em `src/components/ui` ou `src/components/ui` antes de criar HTML/CSS puro.
- **Componentes de Campo:** PROIBIDO criar inputs complexos (CPF, Data, Moeda) aqui. Importe da skill **KPI F3F Componentes**.
- **Data Fetching:** Use Server Actions ou TanStack Query. Não use `useEffect` para buscar dados se puder evitar.

## Componentes de formulário (campos padronizados)

Não definir nem criar aqui componentes de campo (CPF, telefone, data, moeda, calendário). **Usar sempre** os componentes e bibliotecas registrados na skill KPI F3F Componentes. Consultar o reference da skill Componentes para saber qual componente usar e qual o caminho no repositório. Se ainda não houver componente para um tipo (ex.: calendário), solicitar ou acionar a skill Componentes para definição e registro antes de implementar em telas.

## Listagens (tabelas e filtros)

**Regra:** Toda tela de listagem usa **somente** o padrão centralizado. Não montar `<table>` próprio nem filtro de busca/periodo customizado.

- **Componentes:** ``Table``, ``, ``, `DateRangePicker` — importar de `@/components/ui`.
- **Hook:** `(modulo, columnDefs)` em `@/lib/.ts` — retorna `visibleColumns`, `updateWidth`, `toggleVisibility`, etc.
- **Fluxo:** Definir dicionário de colunas (ColumnDef) por módulo → usar hook com chave do módulo → passar `visibleColumns` ao `Table`; barra de filtros com busca (e período quando fizer sentido) + dropdown Colunas. Requisito completo: requisitos-listas-e-filtros-padronizados.md.

## Padrão de tela de módulo (admin / painel com abas)

Quando o usuário pedir **refatoração de tela** alinhada ao HUB, tratar o módulo **Suporte → Administração** como **referência visual e estrutural aprovada** (nota de aceite do produto). **Manter a mesma lógica de composição**; **variar apenas a paleta de acento** conforme o módulo (ex.: Suporte = vermelho; outro módulo = teal, índigo, etc.).

- **Onde está especificado:** [reference.md — Padrão painel de módulo com abas](reference.md#padrão-painel-de-módulo-com-abas).
- **Implementação de referência no repositório:** `SuporteAdminLayoutShell.tsx`, `SuporteAdminTabs.tsx`, `suporte-admin-shared.tsx` / `SuporteAdminPanels.tsx` em `src/components/`.
- **Extração futura:** se vários módulos copiarem o mesmo shell, propor extração para `@/components/ui` (ou módulo compartilhado) e acionar a skill **KPI F3F Componentes** para registrar o primitivo — até lá, replicar a estrutura seguindo o reference.

## Estrutura de pastas (referência)

- `src/app/` – App Router (layouts, páginas, loading, error).
- `src/components/ui/` – componentes UI compartilhados entre módulos.
- `src/lib/` – hooks compartilhados (ex.: auth, form).
- `src/lib/<modulo>/` – componentes e páginas do módulo.
- `src/lib/` – cliente Supabase, config; não misturar com componentes de apresentação.

## Integração com outras skills

- **Banco/RLS:** esta skill não define tabelas nem RLS; consome dados via tipos gerados e serviços/repositories (skill Supabase / Backend).
- **Auth:** proteção de rotas e sessão é responsabilidade da skill Auth; esta skill usa o que Auth expõe (ex.: contexto de usuário, redirect de login).
- **Backend:** serviços e repositórios (OOP) ficam na camada de aplicação; o frontend chama esses serviços ou acessa Supabase via hooks/camada definida pelo Backend.

## Referência adicional

- **Componentes e bibliotecas padronizados:** skill KPI F3F Componentes e seu reference.
- Convenções de componentes, tema Tailwind e links: [reference.md](reference.md) (neste diretório).
- Stack e paradigma do projeto: [project-plan.md](.context/docs/project-plan.md).
