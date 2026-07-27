---
name: kpi-relatorio-modulo
description: Produces a governance-focused module audit report for KPI F3F with executive summary, 0–10 global score, per-skill verdicts (score, justification, up to 3 recommendations), prioritized top-5 actions, execution order by skill, and gaps. Use when the user asks for a full module report, skill-by-skill audit, premium quality assessment, RLS/security review of a feature, or after implementing a module (relatório, parecer, auditoria por skills).
---

# KPI F3F Relatório de módulo — Auditoria e parecer por skills

Gera **relatório escrito** (não substitui implementação). Foco: governança do HUB KPI F3F, **Supabase/RLS**, isolamento e escopo de dados conforme policies, **Next.js App Router**, integração com **entidades centrais** (`pessoa`/`aluno`/`user_id`), qualidade e rastreabilidade (testes, docs, Vercel).

## Quando aplicar

- Pedido explícito de relatório, auditoria ou parecer do módulo **por skills KPI F3F**.
- Pós-implementação, antes de merge amplo, ou antes de escalar uso no HUB.
- Revisão de risco (segurança, duplicação, testes, documentação, integração entre módulos).

## Entradas obrigatórias (evidências)

O usuário deve fornecer **nesta ordem** (o que faltar vira **lacuna** na seção 6):

1. **Resumo do módulo** (5–10 linhas): o que faz, principais fluxos, telas/rotas (`src/app/(dashboard)/...`, `src/app/api/...`, `src/modules/...`).
2. **Arquivos alterados**: saída de `git diff --name-only main..HEAD` (ou branch base acordada, ex.: `develop`).
3. **Opcional**: trechos de logs (build/test), migrations/RLS relevantes (`supabase/migrations/`, scripts em `supabase/scripts/`).
4. **Opcional**: trecho de plano ativo em `.context/docs/project-plan.md`, `.context/docs/PLAN-*.md` ou requisitos em `.context/docs/requisitos/` que cubram o módulo.

Se o agente puder **ler o repositório**, cruzar arquivos citados com o resumo; se não houver evidência no chat nem no repo acessível, marcar **lacuna**.

## Regras

- **Não inventar** schema, endpoints ou decisões de produto: sem evidência → **lacuna**.
- **Segurança:** em dúvida, **o mais restritivo vence** (RLS, roles, exposição no client, dados sensíveis).
- Sempre indicar **risco** e **impacto** (produto / engenharia / operação).
- **Próximos passos por skill** na ordem canônica KPI F3F (ajustar ao escopo do módulo; citar desvio se for só UI estática ou só script):
  - Modelo/tabelas centrais: **Entidades centrais** (regras) → **Supabase** (schema/RLS) → **Backend** → **Frontend** ou **Dashboards** (telas data-heavy) → **Auth e Rotas** → **QA** → **Documentação**.
  - Integração entre módulos: **Integrações e vínculos** (contrato) antes ou em paralelo ao Backend conforme [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md).
  - Campos reutilizáveis novos: **Componentes** antes do **Frontend** que for consumir.
- **Lista de skills:** basear-se em [.context/docs/skills-map.md](.context/docs/skills-map.md). Para cada skill **relevante** ao módulo, emitir parecer; para skills **fora de escopo**, usar **N/A** com uma linha.
- **kpi-skill-gerente** não recebe nota de implementação; pode receber nota de **orquestração do relatório** (N/A) ou ser omitida do parecer detalhado.

## Rubrica global (0–10)

| Faixa | Significado |
|-------|-------------|
| **10** | Pronto para escalar: testado, documentado, seguro, sem duplicação problemática. |
| **8–9** | Sólido; melhorias pontuais. |
| **6–7** | Funcional; riscos claros (duplicação, gaps teste/UX/security). |
| **4–5** | Instável ou incompleto. |
| **0–3** | Bloqueado, viola invariantes (ex.: pessoa única, RLS) ou quebra build. |

Notas por skill usam a mesma escala ou **N/A**.

## Skills KPI F3F cobertas no parecer detalhado

Usar estes identificadores (alinhados ao repositório em `.cursor/skills/kpi-*/`):

`kpi-supabase-data-engineer`, `kpi-backend`, `kpi-frontend`, `kpi-dashboards`, `kpi-auth-rotas`, `kpi-integracoes-vinculos`, `kpi-entidades-centrais`, `kpi-qa-tester`, `kpi-security-performance`, `kpi-documentacao`, `kpi-debugger-erros`, `kpi-consultoria-processos`, `kpi-ux-designer`, `kpi-componentes`, `kpi-limpeza-codigo`, `kpi-organizar-repositorio`, `kpi-migracao-legado`, `kpi-novo-modulo`, `kpi-github-vercel`, `kpi-clickup-pm`, `kpi-obsidian-processos`.

Opcional no relatório: menção breve a **kpi-skill-gerente** apenas como orquestração do parecer (N/A).

## Formato de saída (obrigatório)

O relatório final **deve** conter exatamente estas seções:

### 1) Visão executiva

Parágrafo único + bullets curtos do que o módulo entrega e estado geral.

### 2) Nota global (0–10) + justificativa

Um número e 2–4 frases ancoradas em evidência (ou lacunas).

### 3) Parecer por skill (relevantes)

Para cada skill da lista acima (na ordem que preferir, desde que todas apareçam ou tenham N/A):

- **Parecer** (1–2 frases)
- **Nota** (0–10 ou N/A)
- **Justificativa** (evidência ou lacuna)
- **Recomendações** (máx. 3, objetivas)

Skills sem interface com o módulo: **N/A** + uma linha.

### 4) Síntese: Top 5 recomendações priorizadas

Lista numerada; cada item com **skill dona** entre parênteses (ex.: `kpi-supabase-data-engineer`).

### 5) Ordem sugerida de execução (próximos passos por skill)

Sequência única ou tabela: skill → próximo passo concreto (uma linha cada), respeitando dependências em [.cursor/skills/kpi-skill-gerente/reference.md](.cursor/skills/kpi-skill-gerente/reference.md).

### 6) Lacunas / assunções

Bullet list do que faltou (evidência, testes não rodados, RLS não auditado, plano não localizado, etc.).

## Boas práticas

- Citar caminhos com formato de código quando útil: `src/app/...`, `src/modules/...`, `.context/docs/...`, `supabase/migrations/...`.
- Não usar emojis no relatório.
- Se o módulo tocar **cron** (`vercel.json`), **secrets** (`CRON_SECRET`, service role em API routes) ou **MCP Supabase/Vercel**, mencionar em riscos/operação conforme [AGENTS.md](AGENTS.md).

## Referência adicional

- Mapa e fronteiras: [.context/docs/skills-map.md](.context/docs/skills-map.md)
- Ordem multi-skill e conflitos: [.cursor/skills/kpi-skill-gerente/reference.md](.cursor/skills/kpi-skill-gerente/reference.md)
