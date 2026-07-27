# Referência — Adaptar Skills

Padrões de substituição, classificação e templates para bootstrap de skills.

---

## Blueprint do projeto

Objeto mental que a skill monta antes de executar:

```yaml
project:
  name: "Nome legível"
  slug: "nome-slug"
  skill_prefix: "lic"          # pastas: lic-backend, lic-frontend, …
  language: "pt-BR"

source:                          # detectado no scan
  name: "SGT"
  skill_prefix: "sgt"
  supabase_ref: "wyjgflyydetzejslmocn"
  github: "global-educacao-tech/SGT"

target:
  supabase_ref: "…"
  supabase_url: "https://{ref}.supabase.co"
  github_org: "…"
  github_repo: "…"
  github_url: "https://github.com/{org}/{repo}"
  vercel_project: "…"
  production_url: "https://…"

domain:
  central_entities:
    - { id: "user", label: "Usuário", replaces: "usuário/auth" }
    - { id: "edital", label: "Edital", replaces: "aluno" }
  modules:
    - "PNCP"
    - "Alertas"

integrations:
  mcp_clickup: false
  mcp_obsidian: false
  mcp_supabase: true
```

---

## Ordem de substituição

Aplicar **do mais específico ao mais genérico** para evitar substituições parciais erradas:

1. URLs completas (Supabase, GitHub, Vercel, produção)
2. Refs e identificadores (`wyjgflyydetzejslmocn`, nome projeto Vercel)
3. `org/repo` e caminhos GitHub
4. Nome legível do projeto (`SGT – Sistema Global Tech`)
5. Sigla/nome curto (`SGT`) — cuidado com falsos positivos em palavras
6. Prefixo de skills em paths e frontmatter (`sgt-` → `lic-`)
7. Entidades de domínio (ex.: aluno → edital) — **revisão manual** após replace
8. Lista de módulos em exemplos e tabelas

### Tabela de substituição (mapear source → target)

| Categoria | Onde buscar no source | Substituir por |
|-----------|----------------------|----------------|
| Supabase URL | skills Supabase, AGENTS.md | `https://{target.ref}.supabase.co` |
| Supabase ref | idem | `{target.ref}` |
| GitHub URL | AGENTS.md, github-vercel skill | `{target.github_url}` |
| GitHub org/repo | idem | `{org}/{repo}` |
| Vercel project | AGENTS.md | `{target.vercel_project}` |
| Produção | AGENTS.md, integrações | `{target.production_url}` |
| Nome projeto | títulos, AGENTS §1 | `{project.name}` |
| Prefixo skills | nomes de pasta, `name:`, links | `{skill_prefix}-` |
| Entidades | entidades-centrais, integrações, exemplos | conforme `domain.central_entities` |

### Cuidados com replace em massa

- **SGT** como substring: revisar `git grep` após replace; palavras como `insight` não devem quebrar.
- **sgt** em paths de import (`@/…`): paths de código em `src/` ficam fora do escopo desta skill, salvo menção em docs/skills.
- Preservar blocos de **metodologia** (tabelas "quem não faz o quê", ordem multi-skill).

---

## Classificação de skills (heurística)

| Padrão no nome/conteúdo | Classificação típica |
|-------------------------|----------------------|
| `skill-gerente` | Adaptar (orquestrador — obrigatório) |
| `supabase`, `backend`, `frontend`, `auth`, `qa` | Adaptar |
| `documentacao`, `organizar`, `limpeza`, `github` | Adaptar (poucas amarrações) |
| `clickup` | Opcional → MCP ClickUp |
| `obsidian` | Opcional → vault + MCP |
| `migracao-legado` | Opcional → se projeto absorve legado |
| Nome de outro produto sem equivalente | Descartar ou arquivar |

Pastas arquivadas: `.cursor/skills/_archived/{nome-original}/` + nota em `skills-map.md`.

---

## Templates

### AGENTS.md (esqueleto mínimo)

```markdown
# AGENTS.md

> **Mission:** Fonte de verdade para agentes neste repositório.

## 1. Project Overview

- **Name:** {project.name}
- **Goal:** [preencher com usuário ou Consultoria]
- **Key Entities:** [domain.central_entities]
- **Architecture Style:** [inferir de package.json]

**Repository & deployment (canonical):**

| Serviço | Identificador / URL |
|---------|---------------------|
| **GitHub** | `{target.github_url}` |
| **Supabase (dev)** | `{target.supabase_url}` — ref: `{target.supabase_ref}` |
| **Vercel** | Projeto: `{target.vercel_project}`. Produção: `{target.production_url}` |

## 2. Repository Map

- `src/modules/`: lógica por domínio
- `src/shared/`: utilitários e UI compartilhados
- `src/infra/`: banco, auth, integrações
- `.cursor/skills/`: skills do projeto ({skill_prefix}-*)
- `.context/docs/`: memória e documentação

## 3. Tech Stack & Constraints

[Inferir de package.json; sem dependências novas sem aprovação]

## 4–7. Dev, Testes, PR, Referências

[Copiar estrutura padrão do template de origem, ajustando comandos reais do package.json]
```

### skills-map.md (cabeçalho)

```markdown
# Mapa de Skills – {project.name}

Skills em `.cursor/skills/`. A **{skill_prefix}-skill-gerente** orquestra o uso.

## Checklist

| # | Skill | Status |
|---|-------|--------|
| 1 | {skill_prefix}-skill-gerente | Feito |
| … | … | Pendente / Feito |

## Quando usar cada skill

| Skill | Quando usar |
|-------|-------------|
| … | … |
```

### Skill gerente — ajustes obrigatórios

1. Título: `# {PREFIX} Skill Gerente` (ex.: `# LIC Skill Gerente`).
2. Tabela §1: só skills **presentes** em `.cursor/skills/`.
3. `Fonte de verdade:` → `.context/docs/skills-map.md` deste repo.
4. Remover refs ao projeto de origem (SGT, refs antigas, módulos antigos).
5. `reference.md`: exemplos de tarefa com domínio do **novo** projeto.

---

## Comandos úteis (validação)

```bash
# Listar skills
ls .cursor/skills/

# Buscar resíduos do projeto antigo (trocar PATTERN)
rg "PATTERN" .cursor/skills .context/docs AGENTS.md

# Contar skills por prefixo
ls .cursor/skills/ | rg "^{prefix}-"
```

---

## Fluxo resumido (diagrama)

```
Copiar .cursor/skills/ → novo repo
        ↓
/adaptar-skills
        ↓
Scan + questionário → Blueprint
        ↓
Inventário + plano → confirmação usuário
        ↓
Rename prefixo + substituições + AGENTS + skills-map + gerente
        ↓
Validação + relatório
        ↓
/{prefix}-skill-gerente (primeira tarefa real)
```
