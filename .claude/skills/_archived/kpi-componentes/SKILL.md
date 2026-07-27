---
name: kpi-componentes
description: "Creates and standardizes reusable components and UI libraries for KPI F3F: fields (CPF, phone, date, currency, CEP), listas e filtros (DataTable, FiltroBuscaTexto, DateRangePicker, BarraFiltrosPadrao, coluna-manager), mensagens/toasts/ConfirmDialog. Defines which lib and component to use; progressive registry. Use when creating or changing shared components or consulting which component to use."
---

# KPI F3F Componentes

Responsável por **componentes reutilizáveis** e **bibliotecas de UI** do KPI F3F. Esta skill é a fonte única da verdade: qual componente usar para CPF, telefone, data, moeda, CEP, **listas e filtros** (DataTable, FiltroBuscaTexto, DateRangePicker, BarraFiltrosPadrao), mensagens/toasts/confirmação, e qual biblioteca (quando houver) está aprovada. O restante do frontend (skill [KPI F3F Frontend](.context/skills/kpi-frontend/SKILL.md)) **usa** o que aqui está definido. **Onde buscar:** registro completo no [reference.md](reference.md); código em `src/components/ui/` (barrel `@/components/ui`).

## Implementação progressiva

- **Ainda não temos** biblioteca ou componente para cada tipo (ex.: calendário). Na medida em que o projeto adotar uma lib ou criar um componente, **atualizar esta skill** (e o [reference.md](reference.md)) com:
  - Nome e versão da biblioteca (se aplicável).
  - Caminho do componente no repositório (ex.: `src/components/ui/InputData.tsx`).
  - Props obrigatórias e uso recomendado.
- Assim todo o sistema passa a usar o mesmo padrão; nenhum módulo cria "seu próprio" campo de data ou de moeda sem seguir este registro.

## Quando usar esta skill

- Criar um **novo componente reutilizável** (input com máscara, date picker, CEP, etc.) que será usado em mais de um módulo.
- **Listas e filtros:** definir ou alterar DataTable, FiltroBuscaTexto, DateRangePicker, BarraFiltrosPadrao, coluna-manager ou useColunasPersistidas; registrar no reference § "Listas e filtros padronizados". Requisito: requisitos-listas-e-filtros-padronizados.md.
- **Mensagens e confirmação:** toasts, ConfirmDialog, chaves de mensagem em `src/lib/messages/`; requisito: requisitos-mensagens-padronizadas.md.
- Escolher ou **adotar uma biblioteca** para um tipo de campo (ex.: calendário, máscaras).
- **Padronizar** um componente já existente (unificar implementações diferentes).
- Definir ou alterar **design tokens** e **tema Tailwind** dos componentes compartilhados.
- Consultar **qual componente ou lib usar** para CPF, telefone, data, moeda, CEP, listas, filtros, mensagens.

## Regras

- **Um componente por tipo:** para cada necessidade (CPF, telefone, data, moeda, calendário), o sistema tem **um** componente ou uma lib aprovada documentada aqui. Evitar duplicar (ex.: dois date pickers diferentes).
- **Documentar ao adotar:** assim que uma lib for escolhida ou um componente for criado, atualizar o [reference.md](reference.md) na seção correspondente (biblioteca, caminho, props, exemplo de uso).
- **Localização:** componentes compartilhados em `src/components/ui/`; importação via **barrel** `@/components/ui` (ver [reference.md](reference.md) § Barrel). Manter consistência de nomes (ex.: `InputData`, `InputTelefone`, `InputData`, `InputMoeda`); ao criar componente novo, adicionar o export em `src/components/ui/index.ts`.
- **Acessibilidade e máscaras:** specs de máscara, formato de valor e a11y estão no reference; ao implementar, seguir essas specs e registrá-las no reference quando forem concretizadas em código.

## Regras de Implementação (shadcn/ui)

- **Base de Componentes:** Use sempre os primitivos do **shadcn/ui** (localizados em `src/components/ui/` ou `src/components/ui/`) como base para novos componentes padronizados.
- **Composição:** Para componentes como `InputData`, combine o `Popover` e `Calendar` do shadcn, encapsulando a lógica de máscara e internacionalização pt-BR aqui definida.

## Criar novo componente padronizado

Para gerar a estrutura inicial de um componente em `src/components/ui/`, execute o script (a partir da raiz do repositório):

```bash
bash .claude/skills/kpi-componentes/scripts/create-component.sh <Nome>
```

Exemplo: `bash .claude/skills/kpi-componentes/scripts/create-component.sh InputData` gera `src/components/ui/InputData.tsx` com interface `Props` e export em PascalCase. Em Windows use Git Bash ou WSL.

## Conteúdo do reference.md

O [reference.md](reference.md) contém, por tipo de campo:

- **Especificação** (máscara, formato de exibição e de envio à API, a11y).
- **Biblioteca / componente:** preenchido progressivamente – "A definir quando adotado" até que a lib ou o componente seja escolhido e implementado; depois: nome da lib, versão, caminho do componente, props.

Ao adotar calendário, por exemplo: escolher a lib, implementar o componente, e em seguida preencher no reference a seção "Data / Calendário" com o nome da lib, o caminho do componente e um exemplo de uso. A partir daí, todo uso de data no sistema segue esse componente.

## Integração com outras skills

- **Frontend:** usa os componentes e padrões definidos aqui; não cria variantes próprias de CPF/telefone/data/moeda. Ao precisar de um campo novo padronizado, a Frontend aciona ou solicita a esta skill.
- **Backend:** validações e formatos de API continuam alinhados ao que os componentes enviam (ex.: CPF só números; data em ISO).

## Referência

- Especificações e registro de bibliotecas/componentes por tipo: [reference.md](reference.md) (neste diretório).
