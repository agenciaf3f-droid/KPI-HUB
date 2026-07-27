---
name: kpi-supabase-data-engineer
description: Owns all database operations for KPI F3F. Creates or alters tables, RLS, migrations, and schema conventions. DDL versionado via Supabase CLI (migration new + db push) no projeto ulikfkemdawinetjyhok. MCP Supabase para diagnostico (list_tables, list_migrations, execute_sql leitura/DML, get_advisors). Use when creating or changing schema, RLS policies, migrations, or when querying the database.
---
# KPI F3F Supabase / Engenheiro de dados

Toda operação de **banco de dados** e **MCP Supabase** no KPI F3F é responsabilidade exclusiva desta skill.

## Projeto Supabase – obrigatório, sem exceção

**Regra absoluta:** Todas as chamadas ao MCP Supabase devem usar **obrigatoriamente e sem exceção** o projeto abaixo. Não criar, pausar, restaurar nem operar outros projetos; não trocar de projeto.

| Item           | Valor                                          |
| -------------- | ---------------------------------------------- |
| **Project ref** | `ulikfkemdawinetjyhok`                        |
| **Project URL** | `https://ulikfkemdawinetjyhok.supabase.co`   |
| **Ambiente**   | Dev e produção (canônico do KPI F3F)              |

Chaves (Anon Key, Publishable Key, service_role, secret) ficam em **`.env.local`** e no dashboard; **nunca** em arquivos versionados. O MCP Supabase deve estar configurado para este projeto (`ulikfkemdawinetjyhok`). Ver também [AGENTS.md](../../AGENTS.md) (seção 1 – Repository & deployment).

## 1. Regra de ouro

- **Esquema** (tabelas, colunas, tipos, índices, constraints) → esta skill.
- **RLS** (políticas, segurança por linha) → esta skill.
- **Migrações** (DDL e histórico) → esta skill.
- **Convenções de nomes e tipos** → esta skill (seção 7).
- **Uso do MCP Supabase** → esta skill define quando e como usar cada ferramenta.

## 2. Quando usar esta skill

- Criar ou alterar tabelas, colunas, índices ou constraints.
- Definir ou alterar políticas RLS.
- Escrever ou aplicar migrations.
- Consultar esquema (tabelas, extensões) ou histórico de migrações.
- Gerar tipos TypeScript a partir do esquema.
- Executar SQL no projeto (DDL ou DML) via MCP.
- Obter URL do projeto, chaves, logs ou advisors do Supabase.
- Gerenciar branches do projeto ou edge functions no contexto do banco/backend.

## 3. Ferramentas MCP Supabase (referência)

Todas as operações abaixo devem ser feitas **sempre no projeto `ulikfkemdawinetjyhok`**. Esta skill referencia e utiliza as seguintes ferramentas do MCP Supabase:

### Documentação e organizações
| Ferramenta | Uso |
| ---------- | --- |
| `search_docs` | Buscar documentação Supabase |
| `list_organizations` | Listar organizações (contexto; KPI F3F usa o projeto canônico) |
| `get_organization` | Detalhes de uma organização |

### Projetos (usar somente ulikfkemdawinetjyhok)
| Ferramenta | Uso |
| ---------- | --- |
| `list_projects` | Listar projetos (identificar o canônico) |
| `get_project` | Detalhes do projeto (sempre do ref `ulikfkemdawinetjyhok`) |
| `get_cost` | Custos do projeto |
| `confirm_cost` | Confirmar custos quando aplicável |
| `create_project` | **Não usar para KPI F3F** – projeto já existe |
| `pause_project` | **Não usar para o projeto KPI F3F** salvo instrução explícita |
| `restore_project` | Restaurar projeto pausado se necessário |

### Banco de dados (schema e dados)
| Ferramenta | Uso |
| ---------- | --- |
| `list_tables` | Ver tabelas/schemas (ex.: `['public']`) |
| `list_extensions` | Ver extensões instaladas |
| `list_migrations` | Ver migrações aplicadas (diagnóstico de drift) |
| `apply_migration` | **Não usar para DDL versionado.** Gera timestamp próprio e causa drift. Reservado apenas para emergência documentada no runbook. |
| `execute_sql` | Consultas, DML pontual, inspeção. **Nunca** DDL versionado (CREATE/ALTER TABLE, policies novas). |

### Monitoramento e chaves
| Ferramenta | Uso |
| ---------- | --- |
| `get_logs` | Logs (api, postgres, auth, etc.) |
| `get_advisors` | Avisos de segurança/performance |
| `get_project_url` | URL do projeto |
| `get_publishable_keys` | Chaves publicáveis (nunca versionar; usar .env.local) |

### Tipagem e Edge Functions
| Ferramenta | Uso |
| ---------- | --- |
| `generate_typescript_types` | Gerar tipos TS do esquema (ex.: `src/infra/database.types.ts`) |
| `list_edge_functions` | Listar edge functions |
| `get_edge_function` | Detalhes de uma edge function |
| `deploy_edge_function` | Deploy de edge function (quando a tarefa envolver backend serverless) |

### Branches (dev/prod)
| Ferramenta | Uso |
| ---------- | --- |
| `create_branch` | Criar branch para isolar mudanças de esquema |
| `list_branches` | Listar branches |
| `delete_branch` | Remover branch |
| `merge_branch` | Merge de branch |
| `reset_branch` | Reset de branch |
| `rebase_branch` | Rebase de branch |

**Regra de uso:** DDL versionado → **Supabase CLI** (`migration new` + `db push --linked`). MCP: consultas/DML pontual → `execute_sql`; diagnóstico → `list_migrations`, `list_tables`, `get_advisors`. Antes de qualquer chamada MCP, garantir que o contexto é o projeto **ulikfkemdawinetjyhok**.

**Proibido (causa drift):**
- Alterar schema pelo SQL Editor do Dashboard sem arquivo em `supabase/migrations/`.
- Aplicar DDL via MCP `apply_migration` ou `execute_sql` sem versionar pelo CLI.
- Usar `db query -f` + `migration repair` como fluxo padrão (legado; substituído por `db push`).

**Runbook canônico:** [.context/docs/supabase/migrations-workflow.md](../../.context/docs/supabase/migrations-workflow.md)

## 4. Workflows principais

### Setup inicial (uma vez por máquina)

1. `npx supabase link --project-ref ulikfkemdawinetjyhok --yes` (ref também em `supabase/project-ref`).
2. Confirmar: `npx supabase migration list --linked` → colunas Local e Remote alinhadas.

### Nova tabela ou alteração de esquema (fluxo canônico)

1. Verificar convenções (seção 7).
2. `npx supabase migration new <nome_snake_case>` → edita o `.sql` gerado em `supabase/migrations/`.
3. Incluir RLS na mesma migration quando aplicável.
4. `npx supabase db push --linked --yes` → aplica e registra histórico (nome do arquivo = versão remota).
5. `npx supabase gen types typescript --project-ref ulikfkemdawinetjyhok > src/infra/database.types.ts`
6. `npm run build && npm run test`
7. Validar drift: `npx supabase migration list --linked` (Local == Remote).
8. MCP `get_advisors` (security/performance) após aplicar.

Atalho Windows: `scripts/supabase-nova-migration.ps1 -Nome <nome> -Aplicar`

### Adicionar ou alterar RLS

1. Definir política (quem pode SELECT/INSERT/UPDATE/DELETE e com qual condição).
2. Incluir na mesma migration da tabela ou criar migration só de RLS (ex.: `enable_rls_modulo_financeiro_lancamentos`).
3. Seguir fluxo canônico acima (`migration new` → SQL → `db push`).
4. Validar com `get_advisors` tipo security.

### Consultar estado do banco

- Tabelas: `list_tables` (ex.: schemas `['public']`).
- Migrações: `list_migrations`.
- Extensões: `list_extensions`.
- Dúvidas: `search_docs`.

### Tipos TypeScript

- Após mudanças de esquema: `generate_typescript_types` e persistir (ex.: `src/infra/database.types.ts`).

### Branches e Edge Functions

- **Branches:** isolar mudanças de esquema em dev; merge/rebase conforme fluxo do time.
- **Edge functions:** listar/obter/deploy via MCP quando a tarefa envolver lógica serverless que acessa dados.

## 5. Checklist antes de aplicar migração

- [ ] Nomes em snake_case; tabelas/colunas seguem convenções (seção 7).
- [ ] Tipos adequados (UUID para IDs, timestamptz para datas).
- [ ] RLS considerado em tabelas com dados por usuário/aluno.
- [ ] Sem dados mock ou secrets; DDL idempotente quando fizer sentido.
- [ ] `npx supabase migration list --linked` confirma Local == Remote antes do commit.
- [ ] Migration aplicada via `db push --linked`, não via Dashboard/MCP `apply_migration`.

## 6. Integração com o KPI F3F

- **Entidades centrais:** tabelas core (usuário, aluno) únicas; módulos referenciam por `user_id` / `aluno_id`. Ver `.context/docs/architecture.md` e `.context/docs/data-flow.md`.
- **Segurança:** RLS alinhado a `.context/docs/security.md`.
- Nenhuma outra skill aplica migrações ou altera RLS/esquema.
- **Chatbot (auditorias):** ao adicionar coluna em pessoas, educacional_matriculas ou pessoa_redes_sociais, avisar ou delegar ao Backend: incluir o campo em `CAMPOS_AUDITAVEIS` em `src/modules/chatbot/services/chat-tools.ts` para que o chatbot possa auditar ("quantos sem X?") sem criar tool nova. Ver `.context/docs/chatbot/ESTRATEGIA-AUDITORIAS-E-CONSULTAS.md`.

## 7. Convenções de nomes e tipos (referência)

### Tabelas

- **snake_case** (ex.: `alunos`, `modulo_estoque_produtos`).
- Plural para entidades; nome descritivo para junção (ex.: `aluno_turma_matricula`).
- Por módulo: prefixo (ex.: `estoque_produtos`, `financeiro_lancamentos`).

### Colunas

- **snake_case**: `created_at`, `aluno_id`, `user_id`, `nome_completo`.
- FK: sufixo `_id` (ex.: `aluno_id`, `user_id`).
- Booleanos: `is_`, `has_` ou `ativo`.
- Datas: `timestamptz`; sufixos `_at` (ex.: `created_at`, `updated_at`).

### Migrations

- Nome: **snake_case**, descritivo (ex.: `create_tabela_alunos`, `add_rls_modulo_financeiro`).
- Uma migração = uma mudança lógica.

### Tipos de campos (PostgreSQL)

| Uso               | Tipo                       |
| ----------------- | -------------------------- |
| ID (PK, FK)       | `uuid`                   |
| Texto curto/longo | `text` ou `varchar(n)` |
| Inteiro           | `integer` ou `bigint`  |
| Decimal/dinheiro  | `numeric(p,s)`           |
| Booleano          | `boolean`                |
| Data/hora com TZ  | `timestamptz`            |
| Data sem hora     | `date`                   |
| JSON              | `jsonb`                  |

### RLS

- Habilitar RLS em tabelas com dados por usuário/contexto.
- Políticas por operação (SELECT, INSERT, UPDATE, DELETE).
- Usar `auth.uid()` quando o vínculo for por usuário (ex.: `user_id = auth.uid()`).
- Nome de política: `nome_tabela_operacao_escopo` (ex.: `alunos_select_own`).

Exemplo mínimo:

```sql
ALTER TABLE minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minha_tabela_select_own"
  ON minha_tabela FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "minha_tabela_insert_own"
  ON minha_tabela FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

## Referência adicional

- Doc completo e referência estendida: `.context/docs/skill-supabase-data-engineer.md`
