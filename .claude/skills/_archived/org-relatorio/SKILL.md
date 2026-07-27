---
name: org-relatorio
description: Produces a governance-focused module audit report for Organizacao10x with executive summary, 0–10 global score, per-skill verdicts (score, justification, up to 3 recommendations), prioritized top-5 actions, execution order by skill, and gaps. Use when the user asks for a full module report, skill-by-skill audit, premium quality assessment, multi-tenant/RLS review of a feature, or after implementing a module (relatório / parecer / auditoria por skills).
---

# org-relatorio — Auditoria e relatório por skills (Organizacao10x)

Gera *relatório escrito* (não substitui implementação). Foco: governança, `org_id`, Supabase/RLS, Next.js App Router, qualidade premium.

## Quando aplicar

- Pedido explícito de relatório / auditoria / parecer do módulo por skills.
- Pós-implementação ou antes de escalar para muitos clientes.
- Revisão de risco (segurança, duplicação, testes, docs).

## Entradas obrigatórias (evidências)

O usuário deve fornecer *nesta ordem* (o que faltar vira *lacuna* na seção 6):

1. **Resumo do módulo** (5–10 linhas): o que faz, principais fluxos, telas/rotas (`/app/...`, `/api/...`).
2. **Arquivos alterados**: saída de `git diff --name-only main..HEAD` (ou branch base acordada).
3. **Opcional**: trechos de logs (build/test), migrations/RLS relevantes.
4. **Opcional**: trecho de plano ativo em `.context/docs/PLAN-*.md` que cobre o módulo.

Se o agente puder ler o repo, usar leitura de arquivos citados para cruzar com o resumo; se não houver evidência no chat nem no repo acessível, marcar **lacuna**.

## Regras

- **Não inventar** schema, endpoints ou decisões de produto: sem evidência → *lacuna*.
- **Segurança:** em dúvida, o mais restritivo vence (RLS, permissões, exposição no client).
- Sempre indicar **risco** e **impacto** (produto / engenharia).
- **Próximos passos por skill** na ordem canônica: *Dados (Supabase)* → *Backend* → *Frontend* → *Auth/Rotas* → *QA* → *Docs* (ajustar se o módulo for só UI estática; citar o desvio).
- Lista de skills: basear-se em `.context/docs/skills-map.md`. Para cada skill *relevante* ao módulo, emitir parecer; para skills *fora de escopo*, usar **N/A** com uma linha.
- `org-gerente` não recebe nota de implementação; pode receber nota de *orquestração do relatório* (N/A) ou ser omitida do parecer detalhado.

## Rubrica global (0–10)

| Faixa | Significado |
|-------|-------------|
| **10** | Pronto para escalar: testado, documentado, seguro, sem duplicação problemática. |
| **8–9** | Sólido; melhorias pontuais. |
| **6–7** | Funcional; riscos claros (duplicação, gaps teste/UX/security). |
| **4–5** | Instável ou incompleto. |
| **0–3** | Bloqueado, viola invariantes ou quebra build. |

Notas por skill usam a mesma escala ou N/A.

## Formato de saída (obrigatório)

O relatório final **deve** conter exatamente estas seções:

### 1) Visão executiva

Parágrafo único + bullets curtos do que o módulo entrega e estado geral.

### 2) Nota global (0–10) + justificativa

Um número e 2–4 frases ancoradas em evidência (ou lacunas).

### 3) Parecer por skill (relevantes)

Para cada skill (ex.: org-supabase-data-engineer, org-backend, org-frontend, org-auth-rotas, org-integracoes-vinculos, org-entidades-centrais, org-qa-tester, org-security-performance, org-documentacao, org-debugger-erros, org-consultoria-processos, org-ux-designer, org-componentes, org-limpeza-codigo, org-organizar-repositorio, org-migracao-legado, org-novo-modulo, org-wiki-governance, org-github-vercel, org-clickup, org-obsidian-docs):

- **Parecer** (1–2 frases)
- **Nota** (0–10 ou N/A)
- **Justificativa** (evidência ou lacuna)
- **Recomendações** (máx. 3, objetivas)

Skills sem interface com o módulo: N/A + uma linha.

### 4) Síntese: Top 5 recomendações priorizadas

Lista numerada; cada item com *skill dona* entre parênteses.

### 5) Ordem sugerida de execução (próximos passos por skill)

Sequência única ou tabela: skill → próximo passo concreto (uma linha cada).

### 6) Lacunas / assunções

Bullet list do que faltou (evidência, testes não rodados, RLS não auditado, etc.).

## Boas práticas

- Citar caminhos de arquivo com formato de código quando útil (`web/...`, `.context/docs/...`).
- Não usar emojis no relatório (alinhado às preferências do projeto).
- Se o módulo tocar *PLANO-OFICIAL* ou gate `plan:official-saas:gate`, mencionar em riscos/deploy.

## Referência adicional

Para ordem multi-skill e conflitos: [.cursor/skills/org-gerente/reference.md](../org-gerente/reference.md).
