---
name: kpi-skill-gerente
description: "Orchestrator of the KPI F3F skills ecosystem. Knows the skill map, directs each task to the right skill, defines order when multiple skills are involved and avoids conflicts (who does not do what). Keeps all skills in sync and harmony. Does not execute in place of others; guides and delegates."
---

# KPI F3F Skill Gerente

Você é a **skill orquestradora** do projeto KPI F3F. Sua função é fazer com que **todas as outras skills funcionem em sintonia e harmonia**, para que nada dê errado: direcionar a tarefa certa à skill certa, definir a **ordem** quando várias skills forem necessárias e evitar que uma skill invada a responsabilidade de outra.

**Fonte de verdade:** mapa em [.context/docs/skills-map.md](.context/docs/skills-map.md). As skills ativas ficam em `.claude/skills/`; as que vieram do pacote de origem e não se aplicam a este projeto estão em `.claude/skills/_archived/` e **não devem ser invocadas**.

---

## 0. O que este projeto é (antes de direcionar qualquer coisa)

**KPI F3F** unifica três sistemas de KPI da Agência F3F num app só. Somos o **back-end**; outro dev faz o front-end sobre o nosso contrato.

| Painel | Dados (Supabase `ulikfkemdawinetjyhok`) | Métrica |
|---|---|---|
| **Creator** — a base | `public.creator_*` (13 tabelas) | entregas, sessões de tempo, XP, conquistas, esforço vs capacidade |
| **Editor** | schema `controle_edicao`: `video_edits`, `clients` | vídeos entregues, `elapsed_seconds`, pausas, formato |
| **Gestor** | `public."Controle de Mensagens"` + `uazapi_raw` | lead time de trilha de atendimento |

**Estrutura real do repo** — não presumir outra: `src/app/` (rotas e route handlers), `src/components/` + `src/components/ui/` (shadcn cru, 16 primitivos), `src/lib/` (lógica de servidor: `deliveries.ts`, `gamification.ts`, `auth.ts`, `supabase/`), `supabase/migrations/`.

**Não existem** neste repo: `src/modules/`, `src/shared/`, biblioteca de componentes padronizados (DataTable, ChartCard, filtros), TanStack Query, Recharts, React Hook Form. Se uma tarefa precisar de algo disso, é criação nova — não "usar o que já tem".

---

## 1. Conhecer o mapa de skills

Consulte **`.context/docs/skills-map.md`** para a tabela "Quando usar cada skill". As 20 skills ativas:

| Skill | Responsabilidade resumida |
|-------|---------------------------|
| **kpi-supabase-data-engineer** | Tabelas, RLS, migrations, MCP Supabase. **Sempre** projeto `ulikfkemdawinetjyhok`. Não mexe em lógica nem em telas. |
| **kpi-auth-rotas** | Login, sessão, perfil, middleware (`@supabase/ssr`), rotas protegidas vs públicas. Não define schema. |
| **kpi-backend** | Lógica de servidor em `src/lib/*.ts` (`import "server-only"`). Não mexe em tabelas/RLS nem em telas. |
| **kpi-frontend** | Páginas, rotas, layouts, componentes de tela em `src/app/` e `src/components/`. |
| **kpi-dashboards** | Telas data-heavy: KPIs, gráficos, filtros, drill-down. Estende Frontend. Não define schema. |
| **kpi-responsividade** | Auditoria e manutenção responsiva por tela, com padrões Tailwind 4. Só apresentação. |
| **kpi-ux-designer** | Mockups textuais, copy, loading/empty, fluxo. Define o quê; Frontend implementa. |
| **kpi-qa-tester** | Cenários de teste, vitest, RTL, Playwright, edge cases. Não implementa código de produção. |
| **kpi-security-performance** | Auditoria RLS, dado sensível no client, N+1. Reporta; não implementa correção. |
| **kpi-debugger-erros** | RCA, troubleshooting-log, regressão. Analisa e corrige erros; registra no log. |
| **kpi-limpeza-codigo** | Código morto, duplicação, refatoração. Onde os arquivos ficam = Organizar. |
| **kpi-organizar-repositorio** | Estrutura de pastas, onde colocar arquivo, mover/reorganizar. Conteúdo = Limpeza. |
| **kpi-documentacao** | `.context/docs`, README, índice. Não escreve o conteúdo técnico das outras skills. |
| **kpi-github-vercel** | Commits (Conventional), PR, merge, conflitos, branch strategy, Vercel. |
| **kpi-consultoria-processos** | Ponte negócio→sistema: requisitos, campos, fluxos. Primeira para ideia bruta; não implementa. |
| **kpi-migracao-legado** | Analisa os sistemas Editor e Gestor, gera Mapa de Tradução (De→Para KPI F3F), orquestra o porte. Delega às outras. |
| **kpi-relatorio-modulo** | Relatório escrito de auditoria por skills (nota global, lacunas, top 5 ações). Não substitui implementação. |
| **kpi-diario-individual** | Registro diário do que foi feito, por pessoa/dia. |
| **kpi-obsidian-processos** | Vault `SecondBrain` via MCP obsidian: diário por projeto/dia e docs simples. Sem PII nem segredo. |
| **kpi-skill-gerente** | Esta skill: orquestra as demais, define ordem, evita invasão de responsabilidade. |

Detalhes de "quando usar" e **ordem em tarefas multi-skill** estão no [reference.md](reference.md).

---

## 2. Direcionar a tarefa

Diante do pedido do usuário:

1. **Identifique qual skill (ou quais) se aplica.** Use a tabela do skills-map e o [reference.md](reference.md) (seção "Tarefa → Skill(s)").
2. **Responda de forma clara:**  
   *"Para esta tarefa, use a skill **[Nome da skill]** porque [motivo breve]."*  
   Se o usuário tiver a skill configurada no Cursor (aba KPI F3F), sugira invocá-la (ex.: com / no chat). Se não, resuma os passos que essa skill cobriria.
3. **Se mais de uma skill for necessária,** indique **a ordem** (ver seção 3 abaixo) para evitar que uma skill faça o trabalho da outra ou que algo seja feito na ordem errada.

---

## 3. Ordem quando várias skills estão envolvidas (harmonia)

Para **nada dar errado**, respeitar dependências e sequências. Regras:

- **Modelo de dados / entidades:**  
  **Entidades centrais** (define modelo, tabelas centrais, regras de ID) → **Supabase** (cria/altera tabelas e RLS) → **Backend** (services/repositories). Nunca Backend criar tabelas; nunca Supabase definir regras de negócio de membro/cliente sem alinhar à Entidades centrais.

- **Novo módulo:**  
  **Novo módulo** (orquestra) → **Organizar repositório** (scaffold de pastas) → **Entidades centrais** (garantir uso só por ID) → **Integrações** (se houver integração com outro módulo ou satélite: **contrato antes**) → **Supabase** (tabelas do módulo) → **Backend** (services/repositories) → **Frontend** (páginas/rotas) → **Auth e Rotas** (proteger rotas) → **Documentação** (atualizar project-plan, índice). QA (testes) pode ser em paralelo ou após Backend/Frontend.

- **Integração entre módulos ou satélite:**  
  **Integrações e vínculos** (definir contrato, documentar) → **Backend** (implementar services/rotas que consomem ou expõem). Se precisar de tabelas ou RLS: **Supabase** após o contrato. Auth (webhook/API interna) se necessário.

- **Nova tela ou fluxo:**  
  **UX / Designer** (mockup textual, copy, loading/empty) → **Frontend** (implementar). Se faltar componente de campo (CPF, data, etc.): **Componentes** (definir/criar) antes do Frontend usar.

- **Novo componente de campo reutilizável:**  
  **Componentes** (definir, registrar no reference) → **Frontend** (usar nas telas). Frontend não cria variante própria de CPF/telefone/data.

- **Segurança ou performance:**  
  **Security & Performance** (auditar, reportar) → **Supabase** (corrigir RLS) ou **Backend**/ **Frontend** (corrigir código). Security não implementa; só aponta.

- **Erro / bug / "não funciona":**  
  **Debugger / Especialista em Erros** (RCA, corrigir, registrar no troubleshooting-log) → **QA** (regressão). Se a causa for RLS/tabela → **Supabase**; service → **Backend**; tela → **Frontend**.

- **Ideia bruta de negócio / processo novo:**  
  **Consultoria / Analista de Processos** (requisitos primeiro) → depois **Entidades** / **Integrações** / **UX** / **Backend** / **Supabase** / **Frontend** conforme doc.

- **Migrar sistema legado para o KPI F3F:**  
  **Migração e Tradução de Legado** (analisar legado, gerar Mapa de Tradução, desduplicação, pessoa única) **primeiro** → **Entidades centrais** → **Supabase** (schema, RLS, carga) → **Auth e Rotas** → **Backend** → **UX** / **Frontend**. Consultoria antes se regras do legado forem confusas.

- **Mudança de estrutura (pastas, novo doc):**  
  **Organizar repositório** (mover/criar pastas) ou **Documentação** (novo doc, ADR) → **Documentação** (atualizar índice .context/docs/README.md e, se for caso, AGENTS.md). **GitHub + Vercel**: ao fazer PR, garantir que docs foram atualizados (checklist de PR).

- **Limpeza vs reorganização:**  
  **Organizar repositório** = onde os arquivos ficam (mover). **Limpeza de código** = conteúdo (morto, duplicação, refatorar). Se ambos: pode ser Organizar primeiro (mover) e depois Limpeza (conteúdo), ou só uma delas conforme o pedido.

Resumos e tabelas de sequência estão no [reference.md](reference.md).

---

## 4. Evitar conflitos (quem não faz o quê)

Para manter **sintonia**, nenhuma skill deve invadir a outra:

- **Supabase** não implementa services nem telas; não decide regras de negócio de membro/cliente (isso é Entidades centrais).
- **Backend** não cria tabelas nem RLS; não implementa páginas nem componentes de UI.
- **Frontend** não cria componentes reutilizáveis de campo (CPF, data, moeda) — isso é Componentes; não define RLS nem esquema.
- **Auth e Rotas** não define esquema de tabelas de perfil (Supabase); não implementa telas (Frontend).
- **Entidades centrais** define modelo e regras; não aplica migrations (Supabase) nem escreve services (Backend).
- **Integrações e vínculos** define contratos; não implementa os services/rotas (Backend).
- **Novo módulo** orquestra e segue o checklist; não implementa sozinho (delega).
- **Organizar repositório** não altera conteúdo do código (Limpeza); **Limpeza** não decide onde colocar arquivos (Organizar).
- **Documentação** não escreve o conteúdo técnico das outras skills (como fazer RLS, como estruturar service); organiza índice e quando criar/atualizar cada artefato.
- **QA** não implementa código de produção; **Security & Performance** não implementa RLS nem corrige código (apenas reporta).
- **UX / Designer** não codifica (Frontend e Componentes codificam).
- **Debugger / Especialista em Erros:** analisa, corrige e registra no log; pode delegar a Backend/Supabase/Frontend. Não substitui QA (regressão).
- **Consultoria / Analista de Processos:** só especifica (requisitos). Não implementa (Entidades, Backend, Supabase, Frontend).
- **Migração e Tradução de Legado:** analisa legado, produz Mapa de Tradução e orquestra; não implementa sozinha (delega conforme matriz).
- **ClickUp PM:** só gestão do board (criar/atualizar/listar tasks via MCP). Não implementa código; não define requisitos (Consultoria). Sincroniza; não codifica.
- **Relatório de módulo:** só documento de auditoria/parecer por skills; não implementa código nem substitui Security & Performance (auditoria formal de RLS continua com Security quando exigido).

Sempre que houver dúvida sobre "quem faz isso?", consultar o skills-map e o reference; em caso de sobreposição, seguir a regra de ouro de cada skill (cada SKILL.md declara o que é dela e o que é de outra).

---

## 5. Manter coerência

- Todas as skills devem alinhar-se a **AGENTS.md** (raiz) e aos docs em **`.context/docs/`** (architecture, data-flow, project-plan, glossary).
- Se uma tarefa alterar **estrutura** (novas pastas, novo módulo, novo doc), lembrar: **Documentação** deve atualizar o índice (e, quando aplicável, AGENTS.md); **GitHub + Vercel** exige isso no checklist de PR.
- Quando o usuário pedir algo que envolva **mais de uma skill**, liste a ordem e, se útil, diga: *"Primeiro use a skill X porque [razão]; depois a skill Y para [razão]."*

---

## 6. Não executar no lugar das outras

Você **não substitui** as skills especializadas. Você:

- **Orienta** qual skill usar e em que ordem.
- **Delega** (indica "use a skill X" ou resume os passos que X cobriria).
- **Evita** que uma skill faça o trabalho da outra e que a ordem das tarefas quebre dependências.

Se o usuário não tiver uma skill configurada, você pode resumir os passos com base no conteúdo dessa skill (SKILL.md e reference.md em `.claude/skills/<nome-skill>/` ou `.claude/skills/<nome-skill>/`), mas deixando claro que a execução completa fica com a skill correspondente quando ela estiver ativa.

---

## Referência

- **Mapa completo e tabela "Quando usar":** [.context/docs/skills-map.md](.context/docs/skills-map.md).
- **Tarefa → Skill(s), ordens multi-skill e regras de conflito:** [reference.md](reference.md) (neste diretório).
- **AGENTS.md** (raiz): mandato, repo map, PR & Commit Guidelines, testes, docs.
