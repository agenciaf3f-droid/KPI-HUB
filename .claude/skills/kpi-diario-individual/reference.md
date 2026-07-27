# Referencia — kpi-diario-individual (modo automatico)

## Invocacao

```
/kpi-diario-individual
```

Sem texto adicional. Data = **hoje** (`America/Sao_Paulo`).

## Config

Arquivo: `.context/workflow/diario-individual-config.json`

```json
{
  "userId": "<uuid auth.users>",
  "frenteIdDefault": "<uuid do_frentes>",
  "frenteNomeDefault": "KPI F3F",
  "timezone": "America/Sao_Paulo",
  "vercel": { "projectId": "...", "teamId": "...", "projectName": "kpi" },
  "clickup": { "assignee": "me" }
}
```

## Fase 0 — Coleta por fonte

### 1. Git (script local)

```bash
npx ts-node --project scripts/tsconfig.json scripts/diario-coletar-evidencias-hoje.ts
```

Saida: `.context/logs/diario-evidencias-YYYY-MM-DD.json` (secao `fontes.git.commits`).

### 2. ClickUp (MCP `user-clickup`)

**Assignee:**

```
clickup_resolve_assignees(assignees: ["me"])
```

**Time entries do dia:**

```
clickup_get_time_entries(
  start_date: "YYYY-MM-DD",
  end_date: "YYYY-MM-DD"
)
```

**Tasks concluidas hoje (assignee = me):**

```
clickup_filter_tasks(
  assignees: ["<id me>"],
  date_closed_from: "YYYY-MM-DD",
  date_closed_to: "YYYY-MM-DD",
  include_closed: true
)
```

**Tasks atualizadas (busca ampla):**

```
clickup_search(
  keywords: "",
  filters: { assignees: ["<id me>"], asset_types: ["task"] },
  sort: [{ field: "updated_at", direction: "desc" }],
  count: 30
)
```

Filtrar no agente: `updated_at` ou comentarios do dia.

### 3. Vercel (MCP `plugin-vercel-vercel` ou `user-vercel`)

```
list_deployments(
  projectId: <vercel.projectId do config>,
  teamId: <vercel.teamId>
)
```

Manter deploys onde `meta.githubCommitSha` ou `created` caem no dia (BRT).
Registrar: estado (READY/ERROR), mensagem do commit, target (production).

### 4. Chat Cursor

- Ler mensagens do usuario e entregas do agente **nesta sessao** (e sessoes do mesmo dia se acessivel).
- Extrair: bugs reportados, correcoes, deploys pedidos, modulos tocados.
- Nao copiar tokens, `.env`, PII.

### 5. KPI F3F — entradas ja existentes

Via Supabase MCP `execute_sql` (projeto `ulikfkemdawinetjyhok`):

```sql
SELECT id, title, content, occurred_at, source
FROM do_entradas
WHERE author_user_id = '<userId>'
  AND deleted_at IS NULL
  AND occurred_at::date = '<YYYY-MM-DD>'::date
ORDER BY occurred_at;
```

Usar para **nao duplicar** na sintese.

### 6. Obsidian (opcional)

MCP `user-obsidian-status-report`: `obsidian_get_periodic_note` ou nota `01_DIARIO/.../YYYY-MM-DD.md`.
Se existir bloco MANUAL do dia, incluir na sintese.

## JSON consolidado (evidencias)

Mesclar em `.context/logs/diario-evidencias-YYYY-MM-DD.json`:

```json
{
  "data": "2026-07-13",
  "tituloDia": "segunda-feira",
  "timezone": "America/Sao_Paulo",
  "fontes": {
    "git": { "commits": [{ "hash": "7acc024f", "subject": "fix(prestadores-servicos): ..." }] },
    "clickup": {
      "timeEntries": [],
      "tasksClosed": [],
      "tasksTouched": []
    },
    "vercel": {
      "deployments": [{ "id": "dpl_...", "state": "READY", "commitMessage": "...", "target": "production" }]
    },
    "chat": {
      "itens": ["Corrigido RLS do_entradas para admin", "Datas pt-BR com InputData"]
    },
    "kpi": {
      "entradasExistentes": [{ "id": "...", "title": "..." }]
    }
  },
  "lacunas": ["clickup_time_entries_vazio"]
}
```

## Sintese → payload

Regras de mapeamento:

| Evidencia | categorySlug | entryType |
|-----------|--------------|-----------|
| `fix(...)` commit | correcao | text |
| `feat(...)` commit | desenvolvimento | text |
| deploy production READY | deploy | text ou link |
| task ClickUp concluida | desenvolvimento | text |
| reuniao (chat/manual) | reuniao | text |
| erro/bloqueio | bloqueio | text |
| PR URL | desenvolvimento | link + externalUrl |

**Dedup:** mesmo tema em commit + chat = 1 entrada (titulo do commit, content resume chat).

Payload final: `.context/logs/diario-payload-YYYY-MM-DD.json`

```json
{ "entradas": [ { "title": "...", "content": "...", "categorySlug": "deploy", "status": "concluido", "hour": 14 } ] }
```

`entradas: []` permitido — script usa registros ja no KPI F3F.

## Execucao final

```bash
npx ts-node --project scripts/tsconfig.json scripts/diario-individual-completo.ts \
  --user-id <config.userId> \
  --frente-id <config.frenteIdDefault> \
  --data <hoje> \
  --payload .context/logs/diario-payload-<hoje>.json
```

## Titulo do Status Report

```typescript
tituloDiarioIndividualPtBr("2026-07-13")
// "Diário individual - 13/07/2026 - segunda-feira"
```

## Contrato IA

1. `gerarRelatorioEstruturadoViaIa` — obrigatorio
2. `gerarResumoInformal` — entregavel ao usuario

Doc: ``

## Categorias (`do_categorias.slug`)

`desenvolvimento`, `correcao`, `reuniao`, `deploy`, `bloqueio`

## Perguntas ao usuario (modo automatico)

**Nenhuma** por padrao. Excecoes:

- `frenteIdDefault` invalido → listar frentes e pedir 1 escolha
- OpenAI / service role ausente → bloquear com mensagem clara
- Zero evidencias em todas as fontes → informar lacunas (nao inventar dia)
