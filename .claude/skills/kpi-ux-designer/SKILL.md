---
name: kpi-ux-designer
description: "UX and design for KPI F3F. Defines layouts (text mockups), visual hierarchy, user flow and copy (buttons, errors, loading, empty state) before Frontend implements. Use when designing screens, improving copy, or defining loading and empty states. Aligned to shadcn/ui and Tailwind."
---

# KPI F3F UX / Designer

Ponte entre **ideia e tela**: define estrutura da interface, hierarquia visual, fluxo do usuário e **copy** (textos de botões, mensagens de erro, loading, empty state) **antes** do Frontend implementar. Não codifica componentes (isso é da skill Frontend e Componentes); produz **mockups textuais**, especificação de copy e estados para que a implementação seja consistente em todo o KPI F3F. O projeto usa **shadcn/ui** e **Tailwind** ([project-plan.md](.context/docs/project-plan.md)); esta skill desenha com esses recursos em mente.

## Regra de ouro

- **Mockup textual** (estrutura da tela, blocos, ordem dos elementos) → esta skill.
- **Hierarquia visual** (título, subtítulo, grupos, ênfase) → esta skill.
- **Fluxo do usuário** (passos, navegação, ações principais) → esta skill.
- **Copy** (botões, labels, mensagens de erro, loading, empty state) → esta skill.
- **Implementar** em código (JSX, componentes) → skills [Frontend](.claude/skills/kpi-frontend/SKILL.md) e Componentes; esta skill **define o quê** mostrar e **como** dizer.

## Quando usar esta skill

- Desenhar uma **nova tela** ou fluxo (ex.: tela de matrícula, dashboard do membro, lista de tarefas) antes de codar: produzir mockup textual e copy.
- **Melhorar copy** de botões, mensagens de erro, placeholders ou labels existentes.
- Definir **estados de loading** (o que mostrar enquanto carrega) e **empty state** (o que mostrar quando não há dados; texto e sugestão de ação).
- Definir **fluxo** entre telas (ex.: lista → detalhe → edição; wizard de cadastro em quantos passos e o que cada um contém).
- Revisar **hierarquia visual** de uma tela (o que é título, o que é secundário; agrupamento de campos).
- Garantir **consistência** de tom e textos entre módulos (pt-BR; mesmo padrão para "Salvar", "Cancelar", "Nenhum resultado encontrado", etc.).
- Refatorações de **painel de módulo com abas** (admin/configuração): seguir o **padrão canônico** no [reference — Mockup padrão painel de módulo](reference.md#mockup-padrão-painel-de-módulo-com-abas); alinhar ao detalhe técnico em [kpi-frontend/reference.md](../kpi-frontend/reference.md#padrão-painel-de-módulo-com-abas).

## Regras

- **Mockup em texto/markdown:** descrever a tela em blocos (cabeçalho, formulário, tabela, rodapé) e ordem; indicar elementos interativos (botão X, link Y) e copy exato. Não exigir ferramenta de design visual; o Frontend usa o mockup como spec.
- **Copy em pt-BR:** alinhado ao AGENTS.md; botões e mensagens em português; evitar mistura de idiomas.
- **Estados explícitos:** para cada tela ou componente que carrega dados ou pode estar vazio, definir: texto de loading (ex.: "Carregando..."), texto de empty (ex.: "Nenhum registro encontrado.") e ação sugerida (ex.: "Adicionar primeiro item").
- **Mensagens de erro:** texto claro e acionável (ex.: "Preencha o CPF." em vez de "Campo inválido."); listar no mockup ou no reference quando houver padrão (ex.: erros de validação por campo).
- **shadcn/ui e Tailwind:** ao sugerir estrutura, considerar componentes que o projeto já usa ou pode usar (Button, Card, Input, Table, etc.); não inventar padrões que conflitem com a skill Componentes.

## Tipos de tarefa (resumo)

| Pedido / contexto | Ação |
|-------------------|------|
| Desenhar tela X (nova ou alteração) | Produzir mockup textual (blocos, ordem, copy) e, se aplicável, fluxo (navegação, passos). |
| Melhorar copy (botões, erros, labels) | Listar elementos atuais e propostas de texto; garantir pt-BR e consistência. |
| Definir loading e empty state da tela Y | Especificar texto de loading, texto de empty e ação sugerida (botão/link). |
| Definir fluxo do usuário para Z | Descrever passos, telas envolvidas e transições (ex.: lista → filtro → detalhe). |

Detalhes e templates no [reference.md](reference.md) (neste diretório).

## Integração com outras skills

- **Frontend:** implementa o que esta skill especifica (layout, componentes, copy); esta skill não escreve JSX.
- **Componentes:** campos e componentes padronizados (CPF, data, etc.) são da skill Componentes; esta skill define **onde** usá-los e **labels/copy** ao redor.
- **Documentação:** mockups e fluxos podem ser guardados em `.context/docs/` ou em ADR quando forem decisão de UX; esta skill pode indicar onde documentar.

## Referência adicional

- Estrutura de mockup textual, checklist de copy, loading/empty e registro progressivo: [reference.md](reference.md) (neste diretório).
- Stack UI do projeto: [project-plan.md](.context/docs/project-plan.md) (shadcn/ui, Tailwind).
