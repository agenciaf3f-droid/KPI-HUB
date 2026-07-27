---
name: kpi-novo-modulo
description: "Create a new module in the KPI F3F HUB: dashboard card, routes, menu, config (modulos-por-role, submodulos), scaffold (modules + app), optional Supabase. Orchestrates steps and can call other skills. Use when user says 'create module X' or 'novo módulo X'."
---

# KPI F3F Novo módulo

Responsável por **criar um novo módulo** no HUB KPI F3F de forma consistente: **card no dashboard**, **rotas**, **menu** (e sub-opções quando houver sidebar), **configurações** (modulos-por-role e, se existir, submodulos-por-modulo), mesma estrutura de pastas, uso de **entidades centrais** (sempre por ID), **auth único** e integração com o ecossistema. Esta skill **orquestra** o processo: conhece todos os passos e **pode chamar outras skills** (Frontend, Componentes, Supabase, Auth, Documentação, etc.) para implementar. Referências: [reference.md](reference.md), [requisitos-layout-padrao-e-estrutura-modulos.md](.context/docs/requisitos/requisitos-layout-padrao-e-estrutura-modulos.md), [project-plan](.context/docs/project-plan.md).

## Quando o usuário disser o nome do módulo

Sempre que o usuário usar esta skill informando o **nome do módulo** (ex.: "crie o módulo Mentores", "novo módulo Guia do Aluno"), executar **todos** os passos abaixo, na ordem do [reference.md](reference.md), deixando a **fundação pronta**: card no dashboard, rotas, menu linkado, config atualizada, scaffold em `src/modules/<id>/` e `src/app/<id>/`. Itens de menu podem ser placeholders até a definição final.

## Regra de ouro

- **Um módulo = um id** em minúsculo, kebab-case (ex.: `guia-do-aluno`, `mentores`). Esse id é usado em: `src/modules/<id>/`, `src/app/<id>/`, `href: /<id>`, chave em modulos-por-role e submodulos-por-modulo.
- **Card no dashboard:** o dashboard principal lista módulos a partir de `src/shared/config/modulos-por-role.ts`. Todo novo módulo deve ser adicionado a `ORDEM_APROVADA`, `TODOS_MODULOS` e a pelo menos um role em `MODULOS_POR_ROLE`. Se o ícone Lucide usado não estiver em `ModuloCard` (`src/shared/ui/ModuloCard.tsx`), adicionar ao `ICON_MAP`.
- **Rotas:** criar `src/app/<id>/page.tsx` (página inicial do módulo). Sub-rotas `/<id>/<sub>` ficam para quando houver telas concretas; pode deixar preparado um placeholder ou arquivo vazio conforme padrão do projeto.
- **Menu:** no dashboard, os itens do menu vêm de modulos-por-role (já coberto pelo card). Dentro de um módulo, o sidebar usa sub-itens de `submodulos-por-modulo.ts` (quando o arquivo existir). Ao criar um novo módulo: se existir `src/shared/config/submodulos-por-modulo.ts`, adicionar entrada para o novo `moduloId` com ao menos um item (ex.: "Início" → `/<id>`); se o arquivo não existir, criar e incluir o novo módulo com placeholder.
- **Entidades centrais:** o módulo não cria cadastro próprio de pessoa/aluno; referencia `aluno_id`, `user_id` ou `pessoa_id`. Auth e perfil: skill Auth e Rotas.
- **Documentação:** atualizar a tabela "Módulos criados" no [reference.md](reference.md) e, se mudar estrutura/escopo, índice em .context/docs.

## Quando usar esta skill

- O usuário diz **"novo módulo X"**, **"crie o módulo X"** ou **"KPI F3F Novo módulo: X"** (X = nome do módulo).
- Adicionar um módulo novo à lista do HUB (card no dashboard, rotas, menu, config).
- Dúvida "como criar o módulo X no KPI F3F?" ou "o que um novo módulo precisa ter?" → seguir o [reference.md](reference.md) e o checklist.

## Regras

- **Verificar nome antes de criar:** conferir se o id já existe em [reference.md](reference.md) (tabela "Módulos criados"), em `modulos-por-role.ts` (TODOS_MODULOS) ou em `src/modules/` e `src/app/`. Evitar duplicar.
- **Não duplicar entidades:** nunca criar tabela "aluno do módulo X"; usar FK para tabelas centrais.
- **Estrutura uniforme:** mesmo padrão de subpastas (services, repositories, components, entities, dtos) e de página inicial (header com "← Início", título do módulo).
- **Registro:** atualizar a tabela "Módulos criados" no [reference.md](reference.md) logo após criar o módulo.

## Passos obrigatórios (resumo)

1. **Nome/id** – Normalizar nome do usuário para id (minúsculo, kebab-case). Verificar se já existe.
2. **Card no dashboard** – Em `modulos-por-role.ts`: adicionar a `ORDEM_APROVADA`, `TODOS_MODULOS` (id, nome, href, descricao, icon, iconColor) e a `MODULOS_POR_ROLE`. Se ícone novo: adicionar em `ModuloCard.tsx` (ICON_MAP).
3. **Rotas** – Criar `src/app/<id>/page.tsx` (página inicial do módulo, padrão como Configurações). Scaffold em `src/modules/<id>/` (services, repositories, components, entities, dtos) via script ou manualmente.
4. **Menu (sub-opções)** – Se existir `src/shared/config/submodulos-por-modulo.ts`, adicionar entrada para o novo módulo com ao menos um item (ex.: "Início" → `/<id>`). Se não existir, criar o arquivo e incluir o módulo com placeholders.
5. **Banco (opcional)** – Se o módulo precisar de tabelas, delegar à skill Supabase (tabelas + RLS, FK para entidades centrais).
6. **Documentação** – Atualizar tabela "Módulos criados" no reference.md; Documentação atualiza índice se necessário.

Detalhes e ordem completa: [reference.md](reference.md).

## Skills que esta skill pode chamar

- **Frontend / Componentes:** páginas, layout e componentes do módulo.
- **Supabase:** tabelas e RLS do módulo (quando houver necessidade de banco).
- **Backend:** services e repositories (após scaffold).
- **Auth e Rotas:** proteção de rotas e perfil de acesso ao módulo.
- **Integrações e vínculos:** contrato entre módulos/satélites, se aplicável.
- **Organizar repositório:** mapa de diretórios e convenções.
- **Documentação:** project-plan, architecture, índice em .context/docs.
- **Entidades centrais:** só se for necessário nova entidade central (raro).

## Script de scaffold

`bash .cursor/skills/kpi-novo-modulo/scripts/create-module-full.sh <modulo>` cria `src/modules/<modulo>/` (services, repositories, entities, components, dtos) e `src/app/<modulo>/page.tsx`. Rodar a partir da raiz do repositório. Após rodar, completar card no dashboard e config (modulos-por-role, submodulos se existir) e atualizar a tabela no reference.

## Referência adicional

- Checklist completo, estrutura e registro: [reference.md](reference.md).
- Layout e menu: [requisitos-layout-padrao-e-estrutura-modulos.md](.context/docs/requisitos/requisitos-layout-padrao-e-estrutura-modulos.md).
- Lista de módulos: [project-plan](.context/docs/project-plan.md); mapa de diretórios: [kpi-organizar-repositorio/reference](.context/skills/kpi-organizar-repositorio/reference.md).
