# Referência – Componentes e bibliotecas (KPI F3F)

Documento **progressivo**: preencher "Biblioteca / Componente" e "Caminho" quando a lib ou o componente for adotado. Manter as especificações (máscara, formato, a11y) como contrato para quando for implementar.

**Campos oficiais do sistema:** Telefone, CPF/Documento e Data são **campos oficiais** em todo o KPI F3F. Em qualquer tela que capture ou exiba esses tipos deve ser usado **somente** o componente registrado nesta referência. Nenhum módulo cria variante própria. Requisitos: [requisitos-campos-oficiais-telefone-cpf.md](.context/docs/requisitos/requisitos-campos-oficiais-telefone-cpf.md), [requisitos-documento-identificacao-cpf-estrangeiro.md](.context/docs/requisitos/requisitos-documento-identificacao-cpf-estrangeiro.md), [requisitos-campo-data-oficial.md](.context/docs/requisitos/requisitos-campo-data-oficial.md).

### Bibliotecas oficiais (instaladas)

| Campo | Biblioteca principal | Outras |
|-------|----------------------|--------|
| **Telefone** | react-phone-number-input | — |
| **CPF / Documento** | cpf-cnpj-validator (validação) + react-imask (máscara) | Zod (esquemas) |
| **Data** | react-imask (máscara) + date-fns (manipulação) | Zod (validação); shadcn Popover + Calendar |
| **Moeda** | react-number-format (UI) + currency.js (cálculos) | Zod (validação); banco numeric(12,2) |

**Máscaras:** **react-imask** para CPF e Data. **react-number-format** para Moeda. Telefone usa a UI da react-phone-number-input.

**Outras libs do stack (formulários, UX):** React Hook Form (formulários), Sonner (toasts), clsx + tailwind-merge + **cn()** em `src/shared/utils/cn.ts` (base shadcn). **Recharts** e **TanStack Query v5** já estão no `package.json` para dashboards; TanStack Table via **DataTable** em listagens. Ver [relatorio-bibliotecas-e-moeda.md](.context/docs/relatorio-bibliotecas-e-moeda.md).

### Mensagens padronizadas (toasts, confirmações)

- **Módulo:** `src/shared/messages/`. Requisito: [requisitos-mensagens-padronizadas.md](.context/docs/requisitos/requisitos-mensagens-padronizadas.md).
- **Uso:** `getMessage(key)` para texto; `toastMessage(key, type)`, `toastSuccess(key)` e `toastError(key)` para feedback (Sonner).
- **Modal de confirmação:** `ConfirmDialog` (genérico) e presets `ConfirmDeleteDialog` e `ConfirmUnsavedDialog` em `src/shared/ui/ConfirmDialog.tsx` (export no barrel). Presets usam automaticamente as chaves de mensagens (Excluir?, Alterações não salvas).
- **Regra:** Telas de salvar/excluir usam **somente** chaves deste módulo e os componentes de confirmação; nenhum texto hardcoded para essas ações.

### Barrel (importação única)

- **Arquivo:** `src/shared/ui/index.ts`.
- **Uso:** Todo módulo importa os campos oficiais **somente** deste barrel; não importar direto de `InputCpf.tsx` etc.
- **Exemplo:** `import { InputCpf, InputTelefone, InputData, InputDataHora, InputMoeda } from "@/shared/ui";`
- O barrel reexporta: `ConfirmDialog`, `ConfirmDeleteDialog`, `ConfirmUnsavedDialog`, `InputCep`, `InputCpf`, `InputData`, `InputDataHora`, `InputMoeda`, `InputTelefone`, `FiltroBuscaTexto`, `DateRangePicker`, `FiltroPorData`, `DataTable`, `BarraFiltrosPadrao`, `BarraAnexosProcessos`, `ChartCard`, `KpiMetricCard`, `CalendarioMes`. Ao criar novo componente oficial em `src/shared/ui/`, adicionar o export no `index.ts`.

### Barra Anexos e Processos (formulários e listas)

- **Padrão:** Em toda tela de cadastro/edição (e, onde fizer sentido, na listagem) que tiver anexos ou processos, usar **sempre** o mesmo layout: à esquerda da barra, **Anexos** (ícone paperclip) e **Processos** (ícone engrenagem), cada um com dropdown; conteúdo definido por módulo/tela via props.
- **Componente:** `BarraAnexosProcessos` em `src/shared/ui/BarraAnexosProcessos.tsx` (export em `@/shared/ui`).
- **Props:** `itemsAnexos?: BarraAnexosProcessosItem[]`, `itemsProcessos?: BarraAnexosProcessosItem[]`, `className?`. Cada item: `label`, `onClick?`, `href?`.
- **Uso:** Lista de alunos, formulário novo/edição de aluno, e futuramente outras telas com anexos ou processos (ex.: Pessoa, Contrato). Não criar variante por módulo.

---

## CPF

### Especificação

- **Campo oficial:** uso obrigatório em todo o sistema onde CPF for capturado ou exibido (cliente, pessoa, aluno, funcionário, etc.). Ver requisito linkado no topo deste doc.
- **Máscara de exibição:** `000.000.000-00` (11 dígitos).
- **Validação:** algoritmo dos dígitos verificadores; rejeitar sequências inválidas (ex.: 111.111.111-11).
- **Valor no estado / envio à API:** apenas números (string ou number conforme contrato da API).
- **Acessibilidade:** `input` com `<label>` ou `aria-label`; mensagem de erro com `aria-describedby` e `aria-invalid` quando inválido.

### Biblioteca / Componente

| Item | Status |
|------|--------|
| **Validação** | **cpf-cnpj-validator** — uso dentro de esquemas **Zod** (front e back). Instalado: `npm install cpf-cnpj-validator zod`. |
| **Máscara de digitação** | **react-imask** — máscara `000.000.000-00` no componente (mesma lib de máscara do sistema para Data e CPF). Instalado: `npm install react-imask`. |
| **Caminho do componente** | `src/shared/ui/InputCpf.tsx`. |
| **Nome do componente** | `InputCpf`. |
| **Props principais** | value, onChange, placeholder, disabled, id, aria-label / aria-describedby; erro com aria-invalid. Valor enviado: só números (11 dígitos). |

**Regra:** Onde documento_tipo = CPF, usar **somente** InputCpf. Validação Zod + cpf-cnpj-validator; máscara via react-imask.

---

## Telefone

### Especificação

- **Campo oficial:** uso obrigatório em todo o sistema onde telefone/celular for capturado ou exibido (lead, cliente, pessoa, aluno, funcionário, responsável, etc.). Suporte a DDI (ex.: bandeira +55, Brasil); referência visual: campo com bandeira e formato +55 21 97900 5070. Ver requisito linkado no topo deste doc.
- **Máscara:** celular `(00) 00000-0000`; fixo `(00) 0000-0000`. Um único campo pode aceitar ambos (máscara dinâmica por tamanho) ou dois tipos separados – definir na implementação. Se houver seletor de país/DDI, manter consistente em todo o sistema.
- **Valor no estado / envio à API:** formato E.164 com `+` (ex.: `+5521986042194`) em `pessoas.telefone`. Util canônico: `src/shared/utils/telefone-br.ts` (`normalizarTelefoneBrParaE164`, `compararTelefones`, `telefoneParaInputExibicao`). Celular legado sem 9º dígito (10/12 dígitos) é normalizado inserindo o 9 após o DDD. Se ainda assim não normalizar, `InputTelefone` exibe o valor bruto editável + aviso (nunca esconde o dado do banco). Requisito completo: [requisitos-telefone-e164-br.md](.context/docs/requisitos/requisitos-telefone-e164-br.md). `InputTelefone` delega exibição a `telefoneParaInputExibicao` / `normalizePhoneToE164` (não duplica DDI 55).
- **Acessibilidade:** label; `aria-describedby` para erro.

### Biblioteca / Componente

| Item | Status |
|------|--------|
| **Biblioteca** | **react-phone-number-input** (padrão oficial do KPI F3F). Instalado: `npm install react-phone-number-input` (^3.4.x). Usa `libphonenumber-js`; seletor de país com bandeira; retorna E.164. |
| **Caminho do componente** | `src/shared/ui/InputTelefone.tsx` — wrapper que encapsula a lib, aplica tema Tailwind/shadcn e exporta o componente oficial **InputTelefone**. Todo campo de telefone no sistema deve usar **somente** este componente. |
| **Nome do componente** | `InputTelefone` (exportado de `src/shared/ui/InputTelefone.tsx`). |
| **Props principais** | Encapsular as da lib conforme necessidade; expor no mínimo: `value`, `onChange`, `defaultCountry` (ex.: `"BR"`), `placeholder`, `disabled`, `id`, `aria-label` / `aria-describedby` para a11y. Erro de validação: exibir mensagem abaixo do input e `aria-invalid`. Ver [documentação da lib](https://github.com/catamphetamine/react-phone-number-input) para opções completas. |
| **Estilos** | A lib inclui CSS; importar `react-phone-number-input/style.css` no wrapper ou em layout global. Sobrescrever com Tailwind/classes do tema KPI F3F para manter consistência com shadcn. |

**Regra:** Em todo o KPI F3F (lead, cliente, pessoa, aluno, funcionário, responsável, etc.), o campo de telefone deve ser **sempre** o componente `InputTelefone` que usa esta biblioteca. Nenhum módulo usa outra lib ou implementação própria de telefone.

---

## Data / Calendário

### Especificação

- **Campo oficial:** uso obrigatório em todo o sistema onde uma **data** for capturada ou exibida (nascimento, criação/assinatura de contrato, compra de material, matrícula, etc.). Um único componente; nenhum módulo cria input de data próprio. Requisito: [requisitos-campo-data-oficial.md](.context/docs/requisitos/requisitos-campo-data-oficial.md).
- **Exibição para usuário:** formato pt-BR `dd/MM/yyyy`; máscara de digitação `99/99/9999` (sem travar no primeiro dígito; ano com 4 caracteres).
- **Valor no estado / API:** ISO 8601 `yyyy-MM-dd` ou tipo `date`; timezone alinhado ao backend (local ou UTC conforme regra de negócio).
- **Acessibilidade:** label; valor em formato compreensível para leitor de tela; `aria-invalid` e `aria-describedby` em erro.

### Estratégia adotada ("Trindade")

| Camada | Ferramenta | Uso |
|--------|------------|-----|
| **Máscara de digitação** | **react-imask** | Máscara 99/99/9999 (dd/MM/yyyy); evita travar e limita ano a 4 dígitos. Mesma lib usada para máscara de CPF; TypeScript, mantida, compatível com React 19. |
| **Manipulação** | **date-fns** | Formatação, parse, isValid (datas reais: rejeitar 31/04 etc.). Instalado: `npm install date-fns`. |
| **Validação** | **Zod** | Ano em intervalo (ex.: 1900–2100); data real (refinamento com date-fns). Instalado: `npm install zod`. Validar ao sair do campo ou no submit, não a cada tecla. |

**Entrada dupla:** usuário pode **digitar** (máscara) **ou** escolher pelo **calendário** (Popover + Calendar do shadcn/ui). Mesmo valor no estado.

### Biblioteca / Componente

| Item | Status |
|------|--------|
| **Máscara** | **react-imask** — instalado. Padrão do sistema para máscaras (Data e CPF). |
| **Manipulação** | **date-fns** — instalado. |
| **Validação** | **Zod** — instalado. |
| **Calendário** | shadcn/ui Popover + Calendar (composição no componente oficial). |
| **Caminho do componente** | `src/shared/ui/InputData.tsx`. |
| **Nome do componente** | `InputData`. |
| **Props principais** | value, onChange, placeholder, min/max (opcional), disabled, id, aria-*; documentar quando existir. |

**Regra:** Todas as datas do sistema (nascimento, contrato, assinatura, compra, etc.) usam **somente** este componente. QA: anos inválidos, datas inexistentes (31/04), idade mínima quando for nascimento, máscara sem travar, a11y.

| Aspecto | Decisão |
|---------|---------|
| **Caminho do componente** | `src/shared/ui/InputDataHora.tsx`. |
| **Nome do componente** | `InputDataHora`. |
| **Máscara** | `dd/MM/yyyy HH:mm` via react-imask (mesmo stack de InputData). |
| **Valor controlado** | ISO datetime string ou `""`. |
| **Helpers** | `src/shared/utils/datetime-iso.ts`: `parseDataHoraPtBrToIso`, `isoToDataHoraPtBr`, `normalizeDatetimeForDb`. |
| **Props principais** | value, onChange, placeholder (`dd/mm/aaaa hh:mm`), disabled, id, aria-* |

**Regra:** Campos com data **e** hora (prazos, liberações) usam **somente** `InputDataHora`. Não usar `datetime-local` nativo. Mini-spec de referência: `.context/docs/requisitos/requisitos-campo-data-hora-desafios.md`.

**Exibição em listas e telas (pt-BR):** Para colunas de tabela ou texto que exibem data (ou data+hora), usar os utilitários em `src/shared/utils/formatarData.ts`: `formatarDataPtBr(iso)` (dd/MM/yyyy) e `formatarDataHoraPtBr(iso)` (dd/MM/yyyy HH:mm). Entrada: string ISO (yyyy-MM-dd ou datetime); saída: string formatada ou "" (o caller pode exibir "—" quando vazio). Assim todas as listas exibem datas no padrão pt-BR.

### Grade mensal (visão calendário)

Para telas que posicionam itens **por dia do mês** (ex.: Status Reports do Diário, Eventos), usar o componente compartilhado — **não** montar `<table>` de calendário ad hoc.

| Item | Status |
|------|--------|
| **Caminho** | `src/shared/ui/CalendarioMes.tsx` |
| **Nome** | `CalendarioMes` (export `@/shared/ui`) |
| **Libs** | Nenhuma extra; grade nativa + Tailwind (mesma abordagem de Gestão de Eventos). |
| **Props** | `ano`, `mes` (1–12), `onChange(ano, mes)`, `renderDia({ dia, dataIso, ehHoje, ehFimDeSemana })`, `hojeClassName?`, `toolbarExtra?` |
| **Uso** | Status Reports → `RelatoriosCalendarioClient`; Eventos pode migrar depois. |

---

## Moeda

### Especificação

- **Campo oficial:** uso obrigatório em todo o sistema onde valor monetário for capturado ou exibido (preços, totais, financeiro, etc.). Um único componente; nenhum módulo cria input de moeda próprio. Estratégia completa: [relatorio-bibliotecas-e-moeda.md](.context/docs/relatorio-bibliotecas-e-moeda.md).
- **Exibição:** formato pt-BR (ex.: R$ 1.234,56); prefixo "R$ ", separador de milhar ".", decimal ",".
- **Estado interno:** número puro (floatValue); nunca máscara como valor de negócio.
- **Envio à API / Supabase:** número; coluna **numeric(12,2)** no PostgreSQL (nunca float/real).
- **Cálculos:** sempre **currency.js** (evitar erros de precisão).
- **Acessibilidade:** label; sufixo "reais" ou "R$" para leitor de tela quando necessário.

### Biblioteca / Componente

| Item | Status |
|------|--------|
| **Máscara / UI** | **react-number-format** — componente NumericFormat (ou wrapper InputMoeda). prefix="R$ ", thousandSeparator=".", decimalSeparator=",". onValueChange entrega **floatValue** (número puro). Instalado. |
| **Cálculos** | **currency.js** — qualquer cálculo monetário (backend e frontend). Instalado. |
| **Validação** | **Zod** — valor não negativo, não zero quando aplicável; edge cases QA. |
| **Banco** | Supabase: tipo **numeric(12,2)** para colunas monetárias (skill Supabase). |
| **Caminho do componente** | `src/shared/ui/InputMoeda.tsx`. |
| **Nome do componente** | `InputMoeda`. |
| **Props principais** | value, onValueChange (floatValue), placeholder, disabled, id, aria-*; documentar quando existir. |

**Regra:** Todas as entradas/saídas de valor monetário usam **somente** InputMoeda; cálculos usam currency.js; banco usa numeric(12,2).

---

## Utilitário cn() (Tailwind + shadcn)

| Item | Status |
|------|--------|
| **Libs** | **clsx** + **tailwind-merge** — instaladas. |
| **Caminho** | `src/shared/utils/cn.ts`. |
| **Uso** | Combinar classes Tailwind sem conflito; base para componentes shadcn. Ex.: `cn("px-2", condition && "bg-red-500", className)`. |

---

## Listas e filtros padronizados

**Requisito:** [requisitos-listas-e-filtros-padronizados.md](.context/docs/requisitos/requisitos-listas-e-filtros-padronizados.md). Todas as listagens do KPI F3F usam **somente** estes componentes; nenhum módulo monta tabela ou filtro próprio.

| Componente | Caminho | Uso |
|------------|---------|-----|
| **FiltroBuscaTexto** | `src/shared/ui/FiltroBuscaTexto.tsx` | Campo de busca com debounce 500 ms; ícone lupa; `onDebouncedChange` para API (`q`). Placeholder configurável. |
| **DateRangePicker** | `src/shared/ui/DateRangePicker.tsx` | Período (from/to YYYY-MM-DD); presets pt-BR; usados recentemente (localStorage); intervalo personalizado empilhado (sem overflow). date-fns. |
| **FiltroPorData** | `src/shared/ui/FiltroPorData.tsx` | Campo de data (select) + `DateRangePickerCompleto` inline; trigger “Por Data” ou `{Campo}: range`. |
| **DataTable** | `src/shared/ui/DataTable/DataTable.tsx` | Tabela única: thead sticky, colunas redimensionáveis, ordenação por header, estados loading/empty/erro (copy oficial). Opt-in por coluna: `grow` (preenche espaço restante) e `wrap` (quebra linha em vez de truncar). Sem `grow` explícito, a coluna principal (`nome`, `titulo`, etc.) recebe grow automaticamente; conteúdo da célula usa `w-full min-w-0` (sem `maxWidth` interno) para evitar truncamento com margem vazia. |
| **StatusEnvioBadge** | `src/shared/ui/StatusEnvioBadge.tsx` | Badge Respondeu/Pendente para envios de formulário. |
| **RespostaChips** | `src/shared/ui/RespostaChips.tsx` | Exibe resposta multi-valor como chips (listagens GE Respostas). |
| **BarraFiltrosPadrao** | `src/shared/ui/BarraFiltrosPadrao.tsx` | Composição: FiltroBuscaTexto + DateRangePicker ou FiltroPorData (`dateFieldOptions`) + dropdown Colunas (visibilidade). |
| **coluna-manager** | `src/shared/utils/coluna-manager.ts` | Persistência de colunas (largura, visível, fixa, ordem) em localStorage; chave `kpi-list-{modulo}-columns`. |
| **useColunasPersistidas** | `src/shared/hooks/useColunasPersistidas.ts` | Hook: recebe módulo e dicionário de colunas; retorna `visibleColumns` e funções updateWidth, toggleVisibility, toggleFixed, reorder. |
| **Tipos** | `src/shared/types/list.ts` | `DateRange`, `SortState`, `ColumnDef`, `ColumnConfig`. |

**Regra:** Importar de `@/shared/ui`; usar `useColunasPersistidas(modulo, columnDefs)` e passar `visibleColumns` ao DataTable; barra de filtros com mesma disposição (busca + período + Colunas) em todas as listagens.

### Coluna nome/label principal (link para edição)

Em **toda** listagem do KPI F3F, a coluna que identifica o registro (Nome, Título, etc.) deve ser um **link clicável** que leva à página de edição do registro. O usuário pode abrir o editar clicando no nome, sem depender só do menu de ações (três pontos).

- **Implementação:** na definição de colunas do módulo, usar `accessor` como **função** que retorna `<Link href={rotaEditar}>{valorExibido}</Link>` (Next.js `Link`). Ex.: Pessoas → `/gestao-de-pessoas/pessoas/${row.id}/editar`; Alunos → `/educacional/cadastro-alunos/${row.id}/editar`; Estrutura curricular → `/educacional/cursos/${row.id}/editar`.
- **Estilo:** link discreto (ex.: `text-primary hover:underline`), com `truncate`/`min-w-0` para não quebrar layout da célula.
- **Checklist:** em toda nova listagem, a primeira coluna de identificação (nome/título) deve ser link para a rota de edição do item.

---

## Componentes de layout de página (PageHeader, Breadcrumb, SectionCard)

Usados na Estrutura Curricular e, depois, em todo o módulo educacional para hierarquia visual consistente.

| Componente | Caminho | Props principais | Uso |
|------------|---------|------------------|-----|
| **PageHeader** | `src/shared/ui/PageHeader.tsx` | `title`, `description?`, `action?: ReactNode` | Bloco superior: título (h1), descrição opcional, área de ação (botão primário). |
| **Breadcrumb** | `src/shared/ui/Breadcrumb.tsx` | `items: { label, href? }[]` | Navegação hierárquica; item sem `href` = atual (não clicável). |
| **SectionCard** | `src/shared/ui/SectionCard.tsx` | `title`, `action?: ReactNode`, `children` | Seção: borda, padding, título (h2), CTA opcional. |

**Acessibilidade:** Breadcrumb usa `nav` + `aria-label="Breadcrumb"`. SectionCard usa `aria-labelledby` apontando para o h2.

---

## Dashboards (KPI e gráfico)

Norma de telas analíticas: [KPI F3F Dashboards](../kpi-dashboards/SKILL.md), [requisitos-dashboards-padronizados.md](.context/docs/requisitos/requisitos-dashboards-padronizados.md), [ADR 004](../../.context/docs/adr/004_dashboards_padronizados_sgt.md).

| Componente | Caminho | Uso |
|------------|---------|-----|
| **ChartCard** | `src/shared/ui/dashboard/ChartCard.tsx` | Card de gráfico: título, ícone, skeleton ~280px, erro + retry |
| **KpiMetricCard** | `src/shared/ui/dashboard/KpiMetricCard.tsx` | KPI clicável ou estático; delta % opcional |

**Importação:** `import { ChartCard, KpiMetricCard } from "@/shared/ui";`

**Não registrar aqui (ficam no módulo):** `chart-theme.ts` (cores semânticas por domínio), `DrillDownDialog`, aggregates e hooks de dados — ver `src/modules/educacional/dashboard/` como referência viva.

**Regra:** Não duplicar `ChartCard`/`KpiMetricCard` em módulos; estender via props. Novos widgets globais de dashboard (ex.: faixa KPI genérica) exigem registro nesta seção + export no barrel.

---

## Outros componentes (registro progressivo)

Incluir abaixo novos tipos conforme forem adotados (ex.: CNPJ, CEP, select de país, etc.). Mesmo formato: especificação + tabela "Biblioteca / Componente" com status até implementação.

---

## Convenções gerais

- **Nomenclatura:** PascalCase (ex.: `InputCpf`, `InputTelefone`). Arquivo com mesmo nome (ex.: `InputCpf.tsx`).
- **Props:** interface `NomeDoComponenteProps`; exportar quando reutilizado.
- **Estilos:** Tailwind; tokens de tema em `tailwind.config` para cores e espaçamento dos componentes.
- **Erro:** mensagem abaixo do input; `aria-invalid` e `aria-describedby` no input.
- **Campos de texto (pt-BR):** Em todo `input type="text"` e `textarea` que capturem texto em português, usar `spellCheck` e `lang="pt-BR"` para correção ortográfica adequada.

---

## Navegação padronizada

### BotaoVoltar

- **Componente:** `BotaoVoltar` em `src/shared/ui/BotaoVoltar.tsx` (export em `@/shared/ui`).
- **Uso:** Botão de retorno em páginas e formulários. Substitui todos os Links inline de "Voltar" espalhados por módulos.
- **Props:**
  - `href?: string` — destino fixo (ex.: `/educacional/cursos`). Se omitido, usa `router.back()`.
  - `label?: string` — texto exibido. Padrão: `"Voltar"`.
  - `className?: string`
- **Visual:** `<ArrowLeft /> {label}` com estilo `border` consistente (mesmo padrão de botão secundário do sistema).
- **Regra:** Todo botão de "Voltar" em páginas e formulários deve usar este componente. Nenhum módulo cria Link inline de "Voltar" com estilo próprio.
- **Exemplo:**
  ```tsx
  import { BotaoVoltar } from "@/shared/ui"

  // Com href fixo (Server Component ou Client Component)
  <BotaoVoltar href="/educacional/cursos" label="Voltar à lista" />

  // Sem href (usa router.back() — apenas em Client Components)
  <BotaoVoltar label="Voltar" />
  ```

### Casinha (HUB) no AppHeader

- O `AppHeader` exibe um ícone `Home` compacto (sem texto) que sempre leva ao HUB (`/`).
- Não é necessário adicionar botão "Voltar ao HUB" nas páginas — o AppHeader já provê esse acesso.
- **Padrão de navegação resultante:** Casinha (AppHeader) → HUB; `BotaoVoltar` (dentro da página) → tela anterior do módulo.

---

## Tema Tailwind (componentes)

- Cores e espaçamento usados pelos componentes compartilhados em `theme.extend` do `tailwind.config`.
- Ao definir ou alterar tokens usados por mais de um componente, documentar aqui ou em comentário no config.

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – stack do projeto.
- [KPI F3F Frontend](.context/skills/kpi-frontend/SKILL.md) – skill que consome estes componentes.
- [KPI F3F Dashboards](.context/skills/kpi-dashboards/SKILL.md) – KPIs, gráficos, drill-down; consome `ChartCard` e `KpiMetricCard`.
