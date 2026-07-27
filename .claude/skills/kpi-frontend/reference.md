# Referência – KPI F3F Frontend (estrutura e tema)

**Campos padronizados (CPF, telefone, data, moeda, calendário):** definição, especificação e registro de componentes e bibliotecas ficam na skill KPI F3F Componentes e no reference da skill Componentes. Use sempre o componente registrado lá; não crie variantes nas telas.

**Listagens:** Toda tela de listagem usa `Table` (`@/components/ui/table`), e (import de `@/components/ui` e `@/lib/`). Não montar `<table>` próprio. Requisito: requisitos-listas-e-filtros-padronizados.md. Registro: reference da skill Componentes § "Listas e filtros padronizados".

**Dashboards (KPIs, gráficos, drill-down):** skill [KPI F3F Dashboards](.claude/skills/kpi-dashboards/SKILL.md) Componentes oficiais: Card com gráfico, Card de métrica em `@/components/ui`. Escolher **Dashboard com URL** ou **Painel Analítico** antes de implementar; referência de código: `src/lib/<modulo>.ts`.

---

## Padrão painel de módulo com abas

**Referência implementada no código:** Suporte → Administração (`/suporte/admin`).

**Mandato:** Em refatorações de telas de **configuração / administração de módulo** no dashboard, replicar **esta estrutura e hierarquia**. **Não reinventar** outro layout (ex.: só `PageHeader` plano sem hero, abas só texto sem grid, container estreito `max-w-6xl` centralizado com faixas vazias). **Cores de acento** trocam por módulo; **posicionamento, ritmo, tipos de bloco e navegação** permanecem.

### 1. Container da página

- `mx-auto w-full max-w-screen-2xl` + padding horizontal confortável (`px-4 sm:px-6 lg:px-8`).
- Objetivo: usar largura útil em monitores largos, sem “coluna fina” no meio.

### 2. Breadcrumb

- Acima do hero; itens: módulo (link) → contexto atual (texto).
- Componente: `Breadcrumb` de `@/components/ui`.

### 3. Hero (cartão superior)

- Cartão com **borda suave**, **cantos grandes** (`rounded-2xl`), **gradiente leve** no tema do módulo (ex.: Suporte: `border-red-100`, `from-red-50 via-white to-amber-50/70`, blur decorativo opcional).
- **Badges** em pill no topo (contexto + perfil/papel quando fizer sentido), com ícone pequeno.
- **Título** `h1` forte (`text-2xl sm:text-3xl`).
- **Ações à direita** (stack em mobile): botão secundário outline (“Voltar ao painel” / equivalente) + botão primário na cor de acento do módulo.
- Copy do hero: **enxuta**; evitar parágrafos longos se o usuário pedir redução de ruído.

### 4. Alertas contextuais (opcional)

- Abaixo do hero quando houver (ex.: “Visão de gestor”): `rounded-2xl`, borda âmbar, role/status.

### 5. Abas de seção (navegação)

- **Padrão KPI F3F:** `Link` + `usePathname` (rotas reais), **não** só estado local sem URL.
- Container: `grid` responsivo (`md:grid-cols-2`, `xl:grid-cols-5` ou conforme quantidade de abas), `rounded-2xl border bg-white p-2 shadow-sm`.
- Cada aba: **ícone** + **título** + **descrição curta** (descrição pode ocultar em `md:hidden` se necessário).
- Aba ativa: fundo tint + anel/borda na **cor de acento do módulo** (ex.: Suporte: `bg-red-50 text-red-700 ring-red-200`).

### 6. Área de conteúdo (aba ativa)

- Espaçamento vertical consistente (`mt-8` após abas, `space-y-6` entre blocos).
- **Faixa executiva opcional** (gradiente leve + KPI à direita) quando a aba for “visão geral”.
- **Grade de métricas:** cards `rounded-2xl border shadow-sm`, ícone em quadrado colorido, número grande, hint pequeno; grid `sm:grid-cols-2 xl:grid-cols-4` (ajustar conforme quantidade).
- **Blocos de detalhe:** seções tipo card com cabeçalho (título + descrição + ações placeholder), corpo com tabela/lista; em telas largas preferir **duas colunas** (`xl:grid-cols-2`) quando dois painéis são independentes (ex.: Categorias | Subcategorias), com `min-w-0` e áreas com scroll `max-h-[min(70vh,…)]` para não esticar a página infinita.

### 7. Cores por módulo (acento)

Trocar **somente** tokens da família (borda/fundo gradiente do hero, botão primário, aba ativa, badges de destaque, barras de progresso semânticas). Exemplos:

| Módulo (exemplo) | Acento sugerido (Tailwind) |
|------------------|----------------------------|
| Suporte          | `red` (referência aprovada) |
| Educacional      | `indigo` ou `violet`       |
| Gestão de eventos| `teal`                     |
| Patrimônio       | `slate` / `zinc`           |

Manter **neutros** (`gray`, `white`) para superfícies e texto secundário.

### 8. Código de referência (KPI F3F)

- Layout + hero + abas: `src/components/<componente>.tsx`, `SuporteAdminTabs.tsx`
- Blocos e painéis: `src/components/<componente>.tsx`, `SuporteAdminPanels.tsx`
- Rotas: `src/app/(dashboard)/suporte/admin/` (`layout.tsx`, subpastas por aba)

### 9. Quando subir para Componentes

Se **3+ módulos** repetirem o mesmo shell (hero + tab grid + slot), extrair um componente genérico (ex.: `ModuleAdminShell`) em `@/components/ui`, parametrizado por `accent`, `tabs[]`, `badges[]` — registro na skill **Componentes**. Até lá: **copiar estrutura** deste reference.

---

## Convenções de componentes (telas e uso)

- **Nomenclatura:** PascalCase para componentes (ex.: `InputData`, `CardEntrega`). Nome do arquivo igual ao componente (ex.: `InputData.tsx`).
- **Props:** interface `NomeDoComponenteProps` no mesmo arquivo ou em `types.ts` do módulo; exportar quando reutilizado.
- **Estilos:** Tailwind nas classes do componente; variáveis de tema (cores, espaçamento) em `tailwind.config.ts` para reuso entre módulos.
- **Estado de erro:** campos de formulário devem exibir mensagem de erro abaixo do input; usar cor e `aria-invalid`/`aria-describedby` para acessibilidade. Componentes de campo já devem seguir isso (ver skill Componentes).

---

## Tema Tailwind (sugestão)

- **Cores primárias/secundárias:** definir em `theme.extend.colors` no `tailwind.config` para uso consistente (ex.: `primary`, `secondary`, `danger`, `success`).
- **Tipografia:** `fontFamily` e `fontSize` únicos; usar em todos os módulos para manter identidade visual.
- **Espaçamento:** preferir escala padrão do Tailwind (`p-4`, `gap-4`, etc.); evitar valores arbitrários repetidos.
- **Breakpoints:** usar breakpoints padrão (`sm`, `md`, `lg`, `xl`) salvo necessidade de dispositivo específico; mobile-first.

---

## Links

- KPI F3F Componentes – componentes e bibliotecas padronizados (campos, listas e filtros, mensagens).
- [KPI F3F Dashboards](.claude/skills/kpi-dashboards/SKILL.md) – KPIs, gráficos, filtros sincronizados, drill-down.
- Requisitos listas e filtros – `Table`, , DateRangePicker, critérios de aceite.
- Requisitos dashboards padronizados – contrato transversal HUB.
- [project-plan.md](.context/docs/project-plan.md) – stack e paradigma.
- architecture.md – visão do HUB e módulos.
