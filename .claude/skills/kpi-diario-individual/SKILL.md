---
name: kpi-diario-individual
description: "Gera o Diario individual de HOJE no KPI F3F sem input manual: coleta Git, ClickUp, Vercel, chat Cursor e entradas existentes; cadastra registros, Status Report e resumo informal em linguagem simples. Invocar com /kpi-diario-individual apenas."
---

# KPI F3F Diario Individual — automatico (hoje)

Ao invocar **`/kpi-diario-individual`** (sem texto extra), o agente **coleta sozinho** o que foi feito **hoje** (America/Sao_Paulo), cadastra no Diario Operacional e entrega o **resumo informal**.

**Usuario nao precisa colar o dia.** So invocar a skill.

**Entregavel:** `content_narrativa` + link do relatorio + lista curta do que foi registrado.

## Config fixa (nao perguntar)

Ler `.context/workflow/diario-individual-config.json`:

- `userId`, `frenteIdDefault`, `timezone`, `vercel`, `clickup`

So perguntar frente se `frenteIdDefault` ausente ou invalido.

## Fase 0 — Coleta automatica (OBRIGATORIA, em paralelo)

Data alvo: **hoje** em `timezone` (padrao `America/Sao_Paulo`). Formato ISO: `yyyy-MM-dd`.

| Fonte | Como coletar | O que extrair |
|-------|----------------|---------------|
| **Git** | `npx ts-node --project scripts/tsconfig.json scripts/diario-coletar-evidencias-hoje.ts` | Commits do dia (hash, subject, autor) |
| **ClickUp** | MCP `clickup_resolve_assignees` ("me") + `clickup_get_time_entries` (start/end = hoje) + `clickup_filter_tasks` (`date_closed_from/to` = hoje, assignees = me) | Tasks com tempo, concluidas, titulos |
| **Vercel** | MCP `list_deployments` (projeto `vercel.projectId`, filtrar commits/deploys do dia) | Deploys production/preview, estado READY/ERROR |
| **Chat Cursor** | Historico **desta conversa** e threads recentes do mesmo dia no projeto | Decisoes, bugs corrigidos, pedidos do usuario |
| **KPI F3F existente** | Supabase: `do_entradas` do `userId` no dia (evitar duplicar) | Registros ja salvos no Meu Diario |

Salvar consolidado em `.context/logs/diario-evidencias-YYYY-MM-DD.json` (mesclar com saida do script Git).

**Nao inventar atividades.** Se a fonte nao retornou nada, marcar `lacuna` — nao preencher com suposicao.

Detalhes MCP e JSON: [reference.md](reference.md)

## Fase 1 — Sintese → payload de entradas

1. Ler evidencias consolidadas.
2. **Deduplicar** (mesmo assunto em Git + chat = 1 entrada).
3. **Ignorar** entradas KPI F3F que ja existem no dia (mesmo titulo ou mesmo commit).
4. Mapear cada atividade nova para 1 item em `entradas[]`:
   - `title`: verbo + objeto, curto
   - `content`: 1-3 frases simples (efeito pratico)
   - `categorySlug`: `desenvolvimento` | `correcao` | `reuniao` | `deploy` | `bloqueio`
   - `entryType`: `text` (padrao), `link` se commit/PR/deploy (externalUrl)
   - `status`: `concluido` quando evidencia fechada
5. Gravar `.context/logs/diario-payload-YYYY-MM-DD.json`

Se **zero atividades novas** e ja existem entradas no KPI F3F do dia: pular criacao e ir direto para Fase 2 com entradas existentes.

Se **zero em tudo**: informar usuario com resumo das fontes consultadas (nao falhar em silencio).

## Fase 2 — Cadastro + resumo (script)

```bash
npx ts-node --project scripts/tsconfig.json scripts/diario-individual-completo.ts \
  --user-id <do config> \
  --frente-id <do config> \
  --data <hoje ISO> \
  --payload .context/logs/diario-payload-YYYY-MM-DD.json
```

Se payload vazio mas ha entradas no KPI F3F: usar script com payload minimo vazio e confiar nas entradas ja no banco — **ajustar**: o script atual exige entradas no payload. Para esse caso, agente deve:
- ou gerar payload vazio `{"entradas":[]}` e alterar fluxo para pular criacao (ver nota abaixo)
- ou chamar apenas relatorio + IA + resumo via services

**Nota:** payload com `"entradas": []` — atualizar script para permitir array vazio e pular criacao (usar entradas ja no banco).

## Fase 3 — Resposta ao usuario

1. Titulo: `Diário individual - dd/MM/yyyy - {dia da semana}`
2. **Resumo informal** completo (stdout do script)
3. Link: `https://personalglobal.app/prestadores-servicos/diario/relatorios/{id}`
4. Bullets: fontes usadas + quantas entradas criadas + lacunas (ex.: "ClickUp sem time entries hoje")

## Unicidade (obrigatoria)

**Diario individual:** no maximo **1 ativo** (rascunho ou publicado) por `scope_id` (pessoa) + dia.

- Se ja existir **rascunho** do dia: **reutilizar** (atualizar content, subir version) — nao criar outro.
- Se ja existir **publicado**: **nao gerar** outro; avisar o usuario.
- Indice: `uq_do_relatorios_diario_individual_dia` (migration `20260713160000_...`).

A skill `/kpi-diario-individual` deve confiar em `gerarRelatorio` para esse upsert; nao criar segundo rascunho no mesmo dia.

## Titulo canonico

`Diário individual - 13/07/2026 - segunda-feira` — `titulo-diario-individual.ts`

## Fluxo tecnico (ordem fixa)

```
Coleta (Git, ClickUp, Vercel, chat, KPI F3F)
  → Sintese payload
  → criarEntradas (se houver novas)
  → gerarRelatorio (diario_individual, hoje)
  → gerarRelatorioEstruturadoViaIa
  → gerarResumoInformal  ← entregavel
```

## Pre-requisitos

| Item | Se falhar |
|------|-----------|
| `.env.local` + `SUPABASE_SERVICE_ROLE_KEY` | Parar; pedir env |
| OpenAI em Integracoes | Parar; avisar |
| Modulo prestadores-servicos | Parar |

## Regras

- **Nao pedir** relato do dia ao usuario (modo automatico).
- **Nao publicar** relatorio salvo pedido.
- **Nao expor** secrets no chat.
- Tom do resumo: ja definido em `narrativa-service` (simples, 1a pessoa).

## Erros comuns

| Sintoma | Acao |
|---------|------|
| RLS do_entradas | Usar frente do config; admin RLS ja corrigido |
| Resumo vazio | Garantir passo IA estruturada antes |
| Payload vazio + sem entradas | Listar lacunas das fontes |

## Skills relacionadas

- **kpi-clickup-pm:** leitura ClickUp (esta skill consome, nao atualiza tasks)
- **kpi-obsidian-processos:** opcional — nota do dia no vault se existir
- **kpi-github-vercel:** evidencia de commits/deploy (coleta apenas)

## Checklist de encerramento

- [ ] Fase 0 executada (todas as fontes tentadas)
- [ ] Evidencias salvas em `.context/logs/`
- [ ] Resumo informal exibido
- [ ] Link do relatorio
- [ ] Lacunas declaradas

## Referencia

[reference.md](reference.md) — MCP ClickUp/Vercel, mapeamento categoria, payload, config.
