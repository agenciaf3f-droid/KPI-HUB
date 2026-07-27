---
name: kpi-limpeza-codigo
description: "Code cleanup for KPI F3F: dead code, duplication, reuse, refactoring, and removal of clutter. Identifies and removes unused code; unifies duplicates; extracts to shared when appropriate. Use when cleaning code, removing duplication, refactoring, or when the user asks for cleanup or removal of clutter."
---

# KPI F3F Limpeza de código

Responsável por **código morto**, **duplicação**, **reaproveitamento** e **refatoração** no KPI F3F. Esta skill identifica o que pode ser removido ou unificado e aplica as mudanças sem alterar o comportamento funcional (salvo refatoração explícita acordada). Estrutura de pastas e "onde colocar arquivos" é da skill **Organizar repositório** (quando existir); aqui o foco é o **conteúdo** do código.

## Regra de ouro

- **Remover código morto** → esta skill.
- **Eliminar duplicação** (lógica repetida, copiar-colar) → esta skill.
- **Reaproveitar** (extrair para `shared/`, componente ou service único) → esta skill.
- **Refatorar** (melhorar estrutura sem mudar comportamento) → esta skill.
- **Remover lixo** (comentários obsoletos, logs de debug, imports não usados) → esta skill.
- **Reorganizar pastas / mover arquivos em massa** → skill Organizar repositório.

## Quando usar esta skill

- O usuário pede **limpeza de código**, **remover código morto**, **tirar duplicação** ou **refatorar**.
- Encontrar **exports não usados**, **funções nunca chamadas**, **arquivos órfãos** (não importados por ninguém).
- **Lógica duplicada** em mais de um arquivo ou módulo; decisão de extrair para shared/service ou componente.
- **Comentários obsoletos**, **console.log** de debug, **código comentado** que não é mais necessário.
- **Dependências** não usadas no `package.json` (remover com cuidado; confirmar que não são usadas).
- **Tipos ou interfaces** duplicados; unificar em um único lugar.

## Regras

- **Não mudar comportamento:** remoção e refatoração não devem alterar o que o sistema faz (salvo quando o usuário pedir mudança explícita). Testes devem continuar passando.
- **Escopo claro:** preferir limpezas em lotes pequenos (um tipo por vez: só morto, ou só duplicação) e commitar com mensagem descritiva (ex.: `chore: remove unused exports in módulo X`).
- **Confirmar antes de apagar:** se houver dúvida se um trecho é realmente morto (ex.: usado via string dinâmica, ou em outro repo), perguntar ou deixar comentário para o time revisar.
- **Respeitar outras skills:** ao extrair código para shared, seguir padrões da skill correspondente (Frontend, Componentes, Backend); ao remover, não quebrar contratos entre módulos.
- **Registro progressivo:** critérios ou exceções adotados pelo projeto (ex.: "não remover X porque…") podem ser documentados no [reference.md](reference.md).

## Checklist típico (referência)

- [ ] Imports e exports não usados.
- [ ] Funções ou componentes nunca referenciados.
- [ ] Arquivos que não são importados por nenhum outro.
- [ ] Lógica duplicada em dois ou mais lugares (candidata a extração).
- [ ] Comentários obsoletos e código comentado desnecessário.
- [ ] `console.log` ou logs de debug deixados no código.
- [ ] Tipos/interfaces duplicados (unificar em `types.ts` ou shared).
- [ ] Dependências em `package.json` não usadas (verificar com cuidado).

**Identificar código morto de forma programática:** para exports não usados, arquivos órfãos e dependências não referenciadas, use **knip** (ferramenta para projetos TypeScript/JavaScript). Na raiz do repo:

- Projeto inteiro: `bash .cursor/skills/kpi-limpeza-codigo/scripts/find-dead-code.sh` ou `npx knip`
- Um módulo: `bash .cursor/skills/kpi-limpeza-codigo/scripts/find-dead-code.sh src/modules/<modulo>` ou `npx knip --directory src/modules/<modulo>`

Revisar a saída antes de remover; respeitar as exceções do [reference.md](reference.md) (dynamic import, contrato externo, stubs).

Detalhes e critérios no [reference.md](reference.md) (neste diretório).

## Integração com outras skills

- **Organizar repositório:** movimentação de arquivos e estrutura de pastas; Limpeza foca no conteúdo (remover, unificar, refatorar).
- **Backend / Frontend / Componentes:** ao extrair ou refatorar, o resultado deve seguir os padrões dessas skills (pastas, nomenclatura, camadas).
- **Documentação:** se a limpeza remover ou renomear algo que está documentado, atualizar docs ou indicar que a skill Documentação deve ser acionada.

## Referência adicional

- Critérios para código morto, duplicação e quando não remover: [reference.md](reference.md) (neste diretório).
