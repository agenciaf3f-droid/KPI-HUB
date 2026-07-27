# Referencia — sgt-games-esboco-pdf (v2)

## Manifest

Arquivo: `.context/workflow/agent-specs-manifest.json`

| Campo | Uso |
|-------|-----|
| `bucket` | `sgt-agent-specs` (privado) |
| `specs.<id>.storagePath` | Caminho no Storage |
| `specs.<id>.localFallback` | Fallback local se Storage indisponivel |
| `specs.<id>.implementedRequisitos` | Doc de requisitos que supersede o PDF |
| `uploadedAt` / `sha256` | Preenchidos pelo script de upload |

## Specs cadastradas

| specId | Titulo | Storage path |
|--------|--------|--------------|
| `dia-do-amigo-esboco` | Correio Elegante — Dia do Amigo | `games/dia-do-amigo-2026/Correio_Elegante_Dia_do_Amigo_Esboco.pdf` |

## Resumo do esboco PDF (Dia do Amigo)

- Colaborador envia mensagem de carinho para colega (autocomplete, nao envia para si)
- Limite ~500 caracteres
- PDF: anonimo ou assinado (padrao anonimo) — **desvio SGT: sempre identificado**
- Fila agendada; entrega no Dia do Amigo (20/07)
- Editar/excluir antes da entrega
- Filtro de palavras ofensivas
- Reacoes (emoji) — SGT MVP: so curtida
- Metricas admin (envios, % participacao, anon vs assinado no PDF)
- Fora do PDF no SGT: premiacao (jantar/vinho), modal 1a visita, banner HUB

## Scripts

| Script | Funcao |
|--------|--------|
| `scripts/agent-specs-fetch.ts` | Baixa PDF do Storage → `.context/cache/agent-specs/` |
| `scripts/agent-specs-upload.ts` | Sobe PDF local → Storage + atualiza manifest |
| `scripts/lib/agent-specs.ts` | Helpers compartilhados |

Requer `.env.local` com `SUPABASE_SERVICE_ROLE_KEY`.

## Migration Storage

`supabase/migrations/20260714200000_sgt_agent_specs_storage.sql`

- Bucket `sgt-agent-specs` (10 MB, PDF only)
- Leitura Storage: admin autenticado; scripts usam service_role

## Evals (opcional — nao obrigatorio)

Para afinar **triggering** e respostas da skill:

1. Criar casos em `.cursor/skills/sgt-games-esboco-pdf/evals/` (perguntas que devem acionar a skill)
2. Rodar no Cursor: evals da skill com prompts como:
   - "Planeje um game para o Dia do Amigo 20/07"
   - "Compare o PDF do Correio Elegante com o que foi implementado"
   - "O anonimo esta no MVP do Dia do Amigo?"

v1 = PDF local em `docs/superpowers/`. **v2 = Storage + manifest + fetch** (esta skill).
