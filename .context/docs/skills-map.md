# Mapa de Skills — KPI F3F

Skills em `.claude/skills/`. A **kpi-skill-gerente** orquestra o uso: ela direciona a tarefa para a skill certa e define a ordem quando várias entram.

Adaptadas do pacote `sgt-*` do projeto SGT (`global-educacao-tech/SGT`). Relatório da adaptação: [relatorio-adaptacao-skills.md](relatorio-adaptacao-skills.md).

## Ativas (20)

| Skill | Quando usar |
|---|---|
| **kpi-skill-gerente** | Sempre primeiro numa tarefa que envolve mais de uma skill. Direciona e ordena. |
| **kpi-consultoria-processos** | Ideia bruta de negócio que ainda não virou requisito. Antes de qualquer código. |
| **kpi-supabase-data-engineer** | Tabela, coluna, RLS, migration, MCP Supabase. Projeto `ulikfkemdawinetjyhok`. |
| **kpi-auth-rotas** | Login, sessão, perfil, middleware `@supabase/ssr`, rota protegida vs pública. |
| **kpi-backend** | Lógica de servidor em `src/lib/*.ts` com `import "server-only"`. |
| **kpi-frontend** | Página, rota, layout, componente de tela em `src/app/` e `src/components/`. |
| **kpi-dashboards** | Tela data-heavy: KPI, gráfico, filtro, drill-down. Estende Frontend. |
| **kpi-responsividade** | Auditoria e ajuste responsivo de uma tela, com Tailwind 4. |
| **kpi-ux-designer** | Mockup textual, copy, estado de loading/empty, desenho de fluxo. |
| **kpi-qa-tester** | Cenário de teste, vitest, RTL, Playwright, edge case. |
| **kpi-security-performance** | Auditoria de RLS, dado sensível no client, N+1. Reporta; não corrige. |
| **kpi-debugger-erros** | Erro em produção ou teste: RCA, log de troubleshooting, regressão. |
| **kpi-limpeza-codigo** | Código morto, duplicação, refatoração. |
| **kpi-organizar-repositorio** | Onde um arquivo deve ficar; mover ou reorganizar pastas. |
| **kpi-documentacao** | `.context/docs`, README, índice. |
| **kpi-github-vercel** | Commit, PR, merge, conflito, branch, deploy na Vercel. |
| **kpi-migracao-legado** | Portar Editor ou Gestor para dentro do KPI F3F. Gera Mapa de Tradução. |
| **kpi-relatorio-modulo** | Auditoria escrita por skills: nota global, lacunas, top 5 ações. |
| **kpi-diario-individual** | Registro diário do que foi feito, por pessoa e dia. |
| **kpi-obsidian-processos** | Diário e docs no vault `SecondBrain` via MCP obsidian. Sem PII nem segredo. |

## Arquivadas (8) — não invocar

Em `.claude/skills/_archived/`.

| Skill | Por que saiu |
|---|---|
| `kpi-tema` | Descreve o sistema de temas sazonais do SGT (`SGT_TEMAS`, tabela `sgt_tema_sistema`, Copa/Festa Junina). Nada disso existe aqui. |
| `kpi-componentes` | Catálogo de campos padronizados (CPF, CEP, telefone, moeda, DataTable) sobre libs que este repo não tem — das 12 citadas, só 4 existem. |
| `kpi-entidades-centrais` | Modelo `aluno`/`pessoa` do sistema escolar. Nossas entidades são membro/cliente/entrega. |
| `kpi-novo-modulo` | Scaffold de módulo no HUB SGT, em `src/modules/` — arquitetura que este repo não usa. |
| `kpi-integracoes-vinculos` | Contratos entre módulos do SGT via `aluno_id`. |
| `kpi-clickup-pm` | Depende do MCP ClickUp, não configurado. |
| `kpi-games-esboco-pdf` | Feature específica do produto SGT. |
| `org-relatorio` | De um terceiro projeto (Organizacao10x) e duplica `kpi-relatorio-modulo`. |
| `adaptar-skills` | É a ferramenta que fez esta adaptação, não uma skill do projeto. |

## Regras que valem para todas

- Estrutura real do repo: `src/app/`, `src/components/`, `src/lib/`. **Não existe** `src/modules/` nem `src/shared/`.
- `src/components/ui/` tem 16 primitivos shadcn crus. Não há DataTable, ChartCard, filtros padronizados nem hooks compartilhados.
- Sem TanStack Query, Recharts ou React Hook Form instalados.
- Ler `node_modules/next/dist/docs/` antes de escrever código de rota, middleware ou route handler.
- Nenhum segredo em skill ou doc.
