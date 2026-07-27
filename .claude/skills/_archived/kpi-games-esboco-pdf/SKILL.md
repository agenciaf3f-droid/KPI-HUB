---
name: sgt-games-esboco-pdf
description: "Le esbocos PDF de games do SGT via Supabase Storage (v2). Use ao planejar, implementar ou revisar games em Gestao de Eventos a partir do PDF de referencia (ex.: Dia do Amigo). Invocar com /sgt-games-esboco-pdf ou quando o usuario citar o PDF Correio_Elegante_Dia_do_Amigo."
---

# SGT Games — Esboco PDF (v2 Storage)

Fonte canonica dos esbocos de games: **Supabase Storage** (`sgt-agent-specs`), nao o repo git.

Manifest: `.context/workflow/agent-specs-manifest.json`

## Quando usar

- Planejar ou revisar game interno (ex.: **Dia do Amigo**)
- Comparar PDF original vs requisitos implementados
- Gerar plano de acao (orquestrar com **sgt-skill-gerente**)

## Fase 0 — Obter o PDF (OBRIGATORIA)

1. Ler `.context/workflow/agent-specs-manifest.json` e identificar o `specId` (padrao: `dia-do-amigo-esboco`).
2. Baixar para cache local:

```bash
npx ts-node --project scripts/tsconfig.json scripts/agent-specs-fetch.ts --spec dia-do-amigo-esboco
```

3. O script imprime `cachePath` — usar **Read** nesse arquivo PDF.
4. Se Storage falhar, o script usa `localFallback` do manifest (se existir no disco).

**Nao** commitar PDFs grandes em `docs/superpowers/` — canonical e o Storage.

## Fase 1 — Cruzar com implementacao SGT

Apos ler o PDF, **sempre** ler tambem (quando existir):

| Artefato | Caminho |
|----------|---------|
| Requisitos travados | `.context/docs/requisitos/requisitos-dia-do-amigo-2026.md` |
| Codigo do game | `src/modules/gestao-eventos/games/dia-do-amigo/` |
| Integracoes | `.context/docs/integracao-e-vinculos-modulos.md` (secao Dia do Amigo) |

Documentar **gaps** PDF vs produto (desvios intencionais).

## Desvios conhecidos — Dia do Amigo 2026 (travados)

| PDF | SGT implementado |
|-----|------------------|
| Nome "Correio Elegante" | Game **Dia do Amigo** (Correio Elegante = Festa Junina) |
| Anonimo opcional (padrao anonimo) | **Proibido** — remetente sempre identificado |
| Palavra "carta" | Vocabulário **mensagem** |
| Entrega 20/07 (horario PDF generico) | **20/07 09:00** America/Sao_Paulo (cron) |
| Contagem publica de curtidas | Curtida **sem numero** no mural; metricas so admin |
| Mensagem privada | **Fora do MVP** |

Regra de ouro: **requisitos em `.context/docs/requisitos/` vencem o PDF** quando houver conflito.

## Fase 2 — Orquestracao (Skill Gerente)

Para **implementar** mudancas a partir do PDF:

1. **sgt-consultoria-processos** — atualizar requisitos se necessario
2. **sgt-ux-designer** — copy/fluxos
3. **sgt-supabase-data-engineer** — schema (se DDL)
4. **sgt-backend** + **sgt-frontend** — codigo
5. **sgt-qa-tester** — testes
6. **sgt-github-vercel** — PR/deploy

Nao usar `sgt-novo-modulo` — games ficam em Gestao de Eventos.

## Publicar nova versao do PDF (admin/dev)

```bash
npx ts-node --project scripts/tsconfig.json scripts/agent-specs-upload.ts \
  --spec dia-do-amigo-esboco \
  --file docs/superpowers/Correio_Elegante_Dia_do_Amigo_Esboco.pdf
```

Atualiza `uploadedAt` e `sha256` no manifest.

## Checklist de encerramento

- [ ] PDF lido via fetch + cache (v2 Storage)
- [ ] Requisitos implementados consultados
- [ ] Gaps PDF vs produto listados
- [ ] Proxima skill indicada (se houver trabalho)

## Referencia

[reference.md](reference.md) — resumo do esboco, manifest, evals opcionais.
