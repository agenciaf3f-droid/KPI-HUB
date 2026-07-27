---
name: adaptar-skills
description: Adapts a copied project skills pack to a new repository by replacing project bindings, renaming skill prefixes, regenerating AGENTS.md and skills-map, and classifying optional skills. Use when bootstrapping skills in a blank project, copying .cursor/skills from another repo, or when the user mentions adaptar skills, skill bootstrap, or migrating skills to a new project.
---

# Adaptar Skills

Skill **pessoal e portável**. Adapta um pacote de skills copiado de outro projeto para o repositório atual. Não implementa código de produto, migrations nem telas — só configura o ecossistema de skills.

## Regra de ouro

- **Metodologia** das skills (fronteiras, ordem multi-skill, padrões de service/QA) → manter; é portável.
- **Amarrações de projeto** (nome, prefixo, Supabase ref, repo, Vercel, entidades, módulos, MCPs) → substituir.
- Esta skill **não referencia nenhum projeto específico** — todo contexto vem do scan + questionário.

## Pré-requisitos

1. Pasta `.cursor/skills/` já copiada para o novo projeto (pode estar incompleta).
2. Repositório aberto no Cursor (mesmo que vazio).
3. Usuário disponível para confirmar dados que não forem inferíveis.

## Fluxo (seguir nesta ordem)

```
Progresso:
- [ ] 1. Descoberta automática
- [ ] 2. Questionário mínimo
- [ ] 3. Inventário e classificação
- [ ] 4. Plano (apresentar ao usuário)
- [ ] 5. Execução
- [ ] 6. Validação
- [ ] 7. Relatório final
```

### 1. Descoberta automática

Ler e inferir o máximo possível:

| Fonte | O que extrair |
|-------|---------------|
| `package.json` | nome, scripts (`dev`, `build`, `test`), stack (Next, Supabase, etc.) |
| `AGENTS.md` (se existir) | nome, repo, Supabase ref, Vercel, mapa de pastas |
| `.env.example` / `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` → ref do Supabase |
| Estrutura de pastas | `src/modules`, `src/shared`, `.context/docs`, convenções |
| `.cursor/skills/` | lista de skills, prefixo atual (`sgt-`, `lic-`, etc.), projeto de origem |
| `git remote -v` | org/repo GitHub |

**Detectar projeto de origem:** varrer `.cursor/skills/**` por padrões repetidos (refs Supabase, URLs, nomes de org, prefixo de pasta). Registrar em `source` no blueprint.

### 2. Questionário mínimo

Perguntar **só o que faltar** — preferir `AskQuestion` ou uma única rodada conversacional.

| Campo | Obrigatório | Exemplo |
|-------|-------------|---------|
| Nome do projeto | sim | `LIC Monitor` |
| Prefixo das skills | sim | `lic` → pastas `lic-backend`, etc. |
| Supabase ref | se usar Supabase | `abcdefghijklmnop` |
| GitHub org/repo | sim | `minha-org/meu-repo` |
| Vercel project | se deploy Vercel | `meu-projeto` |
| URL produção | se houver | `https://app.exemplo.com` |
| Entidades centrais | sim | usuário + edital (substituir aluno/pessoa do template) |
| Módulos principais | recomendado | PNCP, Alertas, Scraper |
| MCPs ativos | opcional | ClickUp, Obsidian, Supabase |

### 3. Inventário e classificação

Para cada pasta em `.cursor/skills/`:

| Status | Critério | Ação |
|--------|----------|------|
| **Adaptar** | Metodologia útil + amarrações do projeto antigo | Renomear prefixo + substituir bindings |
| **Portável** | Sem referências de projeto | Manter conteúdo; só renomear se mudar prefixo |
| **Opcional** | Depende de MCP/satélite inexistente (ClickUp, Obsidian) | Perguntar: adaptar, arquivar em `_archived/` ou remover |
| **Descartar** | Específica demais do projeto antigo sem equivalente | Remover ou arquivar com justificativa |

Gerar tabela antes de executar.

### 4. Plano (obrigatório antes de escrever)

Apresentar ao usuário:

1. Blueprint resumido (nome, prefixo, integrações).
2. Tabela inventário → ação por skill.
3. Lista de substituições planejadas (ver [reference.md](reference.md)).
4. Arquivos que serão criados/alterados: `AGENTS.md`, `.context/docs/skills-map.md`, skill gerente, `README` se necessário.

**Só executar após confirmação explícita** (`sim`, `pode`, `confirmo`).

### 5. Execução

#### 5.1 Renomear pastas e metadados

Se o prefixo mudar (`sgt-` → `lic-`):

1. Renomear diretórios em `.cursor/skills/`.
2. Atualizar `name:` no frontmatter YAML de cada `SKILL.md`.
3. Atualizar links internos entre skills (`sgt-backend` → `lic-backend`).
4. Atualizar títulos H1 (`# SGT Backend` → `# LIC Backend`).

Ordem: renomear para nome temporário se houver colisão; depois para nome final.

#### 5.2 Substituir bindings

Aplicar substituições em `.cursor/skills/**`, `.context/docs/**`, `AGENTS.md`, `.cursor/commands/**`, `.cursor/agents/**` conforme [reference.md](reference.md).

Regras:

- Substituir **mais específico primeiro** (URLs completas → refs → nomes).
- Revisar manualmente exemplos de domínio (trocar entidades do template pelas do novo projeto).
- Não inserir segredos (chaves anon, service_role, tokens).
- Manter metodologia e fronteiras entre skills intactas.

#### 5.3 Regenerar artefatos de orquestração

| Artefato | Responsabilidade desta skill |
|----------|------------------------------|
| `AGENTS.md` | Criar ou reescrever §1 (overview), §2 (mapa de pastas), integrações canônicas |
| `.context/docs/skills-map.md` | Checklist de skills, tabela "quando usar", referência à skill gerente |
| `{prefix}-skill-gerente/SKILL.md` | Tabela de skills do **novo** projeto; remover menções ao projeto antigo |
| `{prefix}-skill-gerente/reference.md` | Tarefa → skill(s) com domínio do novo projeto |
| `.context/docs/README.md` | Entrada mínima no índice se `.context/docs/` for criado |

Usar templates em [reference.md](reference.md) § Templates.

#### 5.4 Skills opcionais

- **ClickUp PM:** manter só se MCP ClickUp estiver configurado; senão arquivar.
- **Obsidian Processos:** manter só se houver vault + MCP; ajustar nome do vault nas instruções.
- **Migração legado:** manter se o novo projeto absorver sistemas antigos; senão arquivar.

### 6. Validação

Após execução, verificar:

```bash
# Referências órfãs ao projeto antigo (ajustar SOURCE conforme detectado)
rg -l "SOURCE_PROJECT_PATTERN" .cursor/skills .context/docs AGENTS.md 2>/dev/null || true

# Pastas com prefixo antigo
ls .cursor/skills/

# Frontmatter name alinhado ao nome da pasta
# Cada lic-foo/SKILL.md deve ter name: lic-foo
```

Checklist manual:

- [ ] Nenhuma ref Supabase/URL/repo do projeto **antigo** restante (salvo em `_archived/` ou histórico intencional).
- [ ] Skill gerente lista só skills **ativas** do novo projeto.
- [ ] `skills-map.md` existe e bate com pastas em `.cursor/skills/`.
- [ ] `AGENTS.md` aponta para `.cursor/skills/` e `.context/docs/`.
- [ ] Links relativos entre skills não quebrados após rename.

### 7. Relatório final

Entregar em markdown:

```markdown
# Relatório — Adaptação de Skills

## Projeto
- Nome: …
- Prefixo: …
- Origem detectada: …

## Skills
| Skill | Ação | Observação |
|-------|------|------------|

## Substituições aplicadas
- …

## Pendências (decisão humana)
- …

## Próximo passo
Invocar `/{prefix}-skill-gerente` para a primeira tarefa do projeto.
```

## O que esta skill NÃO faz

- Não implementa código em `src/`.
- Não cria tabelas, RLS nem migrations (skill Supabase do projeto).
- Não configura MCPs no Cursor (só documenta quais skills dependem deles).
- Não altera `~/.cursor/skills-cursor/` (skills internas do Cursor).
- Não move skills entre repositórios — assume que o usuário já copiou `.cursor/skills/`.

## Anti-padrões

- Executar substituições em massa sem plano confirmado.
- Deixar prefixo antigo em `name:` do frontmatter.
- Copiar segredos do projeto antigo para `AGENTS.md` ou skills.
- Adaptar skill gerente sem atualizar `skills-map.md` (ficam dessincronizados).

## Recursos

- Padrões de substituição, classificação detalhada e templates: [reference.md](reference.md)
