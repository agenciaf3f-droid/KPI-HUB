# Relatório — Adaptação de Skills

Executado pela skill `adaptar-skills` (§7 exige este relatório).

## Projeto

- **Nome:** KPI F3F · **Prefixo:** `kpi` · **Local:** `.claude/skills/` (nível de projeto)
- **Origem detectada:** SGT — `global-educacao-tech/SGT`, Supabase `wyjgflyydetzejslmocn`
- **Origem secundária:** Organizacao10x (1 skill infiltrada no pacote)
- **Entrada:** 29 pastas · **Saída:** 20 ativas + 9 arquivadas

## Skills

| Skill | Ação | Observação |
|---|---|---|
| skill-gerente | Adaptada + reescrita | Tabela agora lista só as 20 ativas; ganhou seção §0 com a estrutura real do repo |
| supabase-data-engineer, auth-rotas, backend, frontend, dashboards, responsividade, ux-designer, qa-tester, security-performance, debugger-erros, limpeza-codigo, organizar-repositorio, documentacao, github-vercel, consultoria-processos, migracao-legado, relatorio-modulo, diario-individual, obsidian-processos | Adaptadas | Amarrações trocadas; caminhos remapeados; `obsidian-processos` aponta para o vault `SecondBrain` |
| **tema** | Arquivada | Descreve o sistema de temas sazonais do SGT (`SGT_TEMAS`, tabela `sgt_tema_sistema`, Copa/Festa Junina, `src/shared/themes/`). Após o rename a descrição passou a **afirmar** essas features como sendo do KPI F3F — mentira gerada pela substituição cega. |
| **componentes** | Arquivada | 371 linhas catalogando campos padronizados (CPF, CEP, telefone, moeda, DataTable) sobre libs ausentes: das 12 citadas, só `sonner`, `clsx`, `tailwind-merge` e `zod` existem. |
| **entidades-centrais** | Arquivada | 128 das 176 linhas são o modelo `aluno`/`pessoa` de um sistema escolar. |
| **novo-modulo** | Arquivada | Scaffold de módulo em `src/modules/` — arquitetura que este repo não usa. |
| **integracoes-vinculos** | Arquivada | Contratos entre módulos do SGT via `aluno_id`. |
| **clickup-pm** | Arquivada | Depende do MCP ClickUp, não configurado nesta máquina. |
| **games-esboco-pdf** | Arquivada | Feature específica do produto SGT. |
| **org-relatorio** | Arquivada | De um terceiro projeto (Organizacao10x) e duplica `relatorio-modulo`. |
| **adaptar-skills** | Arquivada | É a ferramenta que fez esta adaptação, não uma skill do projeto. |

## Substituições aplicadas

Na ordem que o `reference.md` manda — do mais específico ao mais genérico.

| Categoria | De | Para | Ocorrências |
|---|---|---|---|
| Supabase | `wyjgflyydetzejslmocn` | `ulikfkemdawinetjyhok` | 15 |
| GitHub | `global-educacao-tech/SGT` | `agenciaf3f-droid/KPI-HUB` | 4 |
| Nome do projeto | `SGT` / `Sgt` | `KPI F3F` | 325 |
| Projeto satélite | `Organizacao10x` / `Org10x` | `KPI F3F` | 11 |
| Prefixo | `sgt-` | `kpi-` | 273 |
| Local das skills | `.cursor/skills/`, `.context/skills/` | `.claude/skills/` | todas |
| Entidade de domínio | `aluno` / `pessoa` / `aluno_id` | `membro` / `cliente` / `member_id` | ~234 |
| Arquitetura | `src/modules/<mod>/{services,repositories,dtos,entities}` | `src/lib/` | 46 |
| Arquitetura | `src/modules/<mod>/components` | `src/components/` | — |
| Alias | `@/shared/ui`, `@/shared/hooks`, `@/modules/` | `@/components/ui`, `@/lib/` | — |
| Camadas | `src/infra/`, `src/domain/` | `src/lib/` | — |
| Componentes fantasma | `DataTable` | `Table` (`@/components/ui/table`) | — |
| Componentes fantasma | `ChartCard`, `KpiMetricCard`, `BarraFiltrosPadrao`, `FiltroBuscaTexto`, `useColunasPersistidas`, `coluna-manager` | removidos | ~120 |
| Docs inexistentes | links para `.context/docs/{requisitos,adr,qa,chatbot,migracao}/*` e mais 11 arquivos | convertidos em texto simples | ~90 |

## Scaffolders

Dos 7 scripts do pacote, **3 foram apagados** por criarem arquitetura que este repo não usa. O texto tinha sido varrido, mas o efeito só aparece quando alguém roda:

| Script | O que criava |
|---|---|
| `backend/scripts/create-layer.sh` | `src/modules/<mod>/{entities,repositories,services,dtos}` |
| `componentes/scripts/create-component.sh` | `src/shared/ui/` |
| `documentacao/scripts/create-adr.sh` | `.context/docs/adr/` |

Mantidos: `debugger-erros/scripts/log-error.sh` (escreve em `.context/docs/troubleshooting-log.md`, artefato legítimo), `github-vercel/scripts/validate-build.sh`, `limpeza-codigo/scripts/find-dead-code.sh`.

## Artefatos gerados

- `AGENTS.md` — reescrito preservando o bloco `nextjs-agent-rules` do Creator
- `.context/docs/skills-map.md`
- `.context/docs/README.md`
- `.claude/skills/kpi-skill-gerente/SKILL.md` — §0 novo com o contexto real do projeto

## Validação

| Checagem | Resultado |
|---|---|
| `grep -rioE 'sgt\|organizacao10x\|wyjgflyydetzejslmocn\|global-educacao-tech'` fora de `_archived/` | **0** |
| `frontmatter name:` == nome da pasta, nas 20 | **20/20** |
| Links markdown relativos entre skills | **todos resolvem** |
| Links para skills arquivadas | **0** |
| Caminhos `src/`/`@/` citados que não existem | **6**, todos placeholder de template (`src/lib/...`, `@/lib/.ts`) ou arquivo que a skill manda criar (`src/lib/deliveries.spec.ts`) |
| `npm run build` | **limpo** |

## Pendências (decisão humana)

1. **`kpi-backend` descreve um padrão que o repo não usa.** Ela fala de Services, Repositories e injeção de dependência em OOP. O Creator usa funções `async` soltas em `src/lib/*.ts` com `import "server-only"`. Os caminhos foram corrigidos, mas o *padrão* descrito continua sendo o do SGT. Reescrever contra o padrão real, ou arquivar.
2. **`kpi-dashboards` (515 linhas) perdeu os componentes de referência.** `ChartCard` e `KpiMetricCard` eram a espinha dorsal dela e não existem aqui. A metodologia continua válida; os exemplos concretos, não.
3. **9 skills arquivadas** podem ser recuperadas se a decisão mudar — nada foi apagado, tudo está em `.claude/skills/_archived/`.

## Próximo passo

Invocar `kpi-skill-gerente` na primeira tarefa real — o porte do painel Editor (Fase 4 do plano).
