# Referência – KPI F3F Documentação

Estrutura da documentação, quando atualizar cada artefato e convenções. **Registro progressivo:** templates e convenções adotadas podem ser documentados aqui.

---

## Estrutura do .context/docs (atual)

- **README.md** – Índice principal (Core Guides, Document Map). Todo novo guia ou doc de referência deve ser listado aqui.
- **project-plan.md** – Stacks, objetivos, regras, módulos, lógica de negócio, satélites.
- **skills-map.md** – Mapa de skills e Skill gerente.
- **project-overview.md** – Visão geral e propósito do KPI F3F.
- **architecture.md** – Arquitetura do HUB, princípios, componentes.
- **data-flow.md** – Fluxo de dados, entidades compartilhadas, integração.
- **security.md** – Auth, RLS, secrets, compliance.
- **development-workflow.md** – Branching, contribuição, convenções.
- **testing-strategy.md** – Abordagem de testes, cobertura, gates.
- **glossary.md** – Termos de domínio, entidades, conceitos.
- **tooling.md** – CLI, IDE, automação.
- **skill-supabase-data-engineer.md** – Documento único da skill Supabase (opcional; skills ficam em .claude/skills/).
- **qa/** – Docs de QA (getting-started, project-structure, README).
- **adr/** – Architecture Decision Records (criar quando existir o primeiro ADR).
- **image/** – Imagens (ex.: skills-map).

Ao adicionar novo documento: criar o arquivo e **adicionar entrada** no README.md (Core Guides e/ou Document Map).

---

## Quando atualizar o índice (README.md de .context/docs)

- Novo arquivo em `.context/docs/` que seja guia ou referência (não arquivos internos como codebase-map.json).
- Remoção ou renomeação de um doc listado.
- Reorganização de seções (ex.: nova seção "Guides por módulo").

Formato de entrada: `- [Título](./arquivo.md) — descrição breve.` na seção adequada (Core Guides, etc.) e linha na tabela Document Map quando fizer sentido.

---

## Quando criar ADR

- Decisão que **afeta arquitetura** (ex.: escolha de lib, padrão de API, estratégia de cache).
- Decisão que **afeta vários módulos** ou integração (ex.: contrato entre módulos, formato de evento).
- Decisão que **precisa ser lembrada** no futuro (ex.: por que não usamos X).

Não criar ADR para: mudança trivial, correção de bug, refatoração sem impacto em decisão de desenho.

**Onde:** ``. Nome: `NNN_titulo_curto.md` (ex.: `001_tanstack_query_para_cache.md`). Para gerar o boilerplate: `bash .claude/skills/kpi-documentacao/scripts/create-adr.sh "Título do ADR"` (a partir da raiz do repo). O script cria o arquivo com template (Contexto, Decisão, Consequências) e numeração automática; **em seguida adicionar o ADR ao .context/docs/README.md**.

**Conteúdo mínimo:** Contexto (o que motivou); Decisão (o que foi decidido); Consequências (prós, contras, impacto). Idioma: pt-BR.

---

## Quando atualizar o glossário (glossary.md)

- **Novo termo de domínio** (ex.: novo conceito do negócio, nova entidade).
- **Nova sigla** ou abreviação usada no projeto.
- **Alteração de definição** de termo existente (ex.: "membro" passa a incluir X).

Manter uma entrada por termo; definição curta e clara. Ordem alfabética ou por categoria (entidades, fluxos, técnico) conforme o arquivo atual.

---

## Quando atualizar outros docs

- **architecture.md** – Nova camada, novo princípio, mudança no desenho do HUB ou dos módulos.
- **data-flow.md** – Novo fluxo de dados, nova entidade compartilhada, mudança em integração ou sistema satélite.
- **project-plan.md** – Mudança de stack, objetivos, regras, módulos ou ordem de implementação (esta skill aplica a atualização; o conteúdo é definido pelo time/plano).
- **AGENTS.md (raiz)** – Mudança no Repository Map (pastas principais), novos AI Context References, mudança em convenções que os agentes devem seguir.
- **README da raiz** – Mudança em como rodar o projeto, como contribuir, visão geral do repositório.

---

## Checklist: após mudança de estrutura ou novo doc

- [ ] `.context/docs/README.md` – Novo doc listado ou entrada removida/ajustada?
- [ ] `AGENTS.md` – Repository Map ou AI Context References desatualizados?
- [ ] Links quebrados – Algum link em docs ou README aponta para arquivo movido/renomeado?
- [ ] glossary.md – Novo termo ou entidade que merece entrada?
- [ ] ADR – A mudança é uma decisão de arquitetura que merece ADR?

---

## Registro progressivo

| Item | Descrição |
|------|------------|
| **Pasta ADR** | `` (criada automaticamente pelo script). |
| **Template ADR** | Contexto, Decisão, Consequências. Gerado por `scripts/create-adr.sh "Título"`. |
| *(outros)* | Preencher quando o projeto padronizar. |

---

## Links

- [.context/docs/README.md](.context/docs/README.md) – Índice da documentação.
- [AGENTS.md](AGENTS.md) – Repository Map e referências para agentes.
- glossary.md – Glossário do projeto.
