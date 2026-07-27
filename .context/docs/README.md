# .context/docs — KPI F3F

Memória e documentação do projeto. Fonte de verdade sobre o repositório é o [AGENTS.md](../../AGENTS.md) na raiz.

## Índice

| Doc | O que tem |
|---|---|
| [skills-map.md](skills-map.md) | As 20 skills ativas, quando usar cada uma, e as 8 arquivadas com o motivo |
| [relatorio-adaptacao-skills.md](relatorio-adaptacao-skills.md) | O que a adaptação do pacote `sgt-*` → `kpi-*` fez, e o que ficou pendente |

## A escrever (Fase 5 do plano)

| Doc | O que vai ter |
|---|---|
| `contrato-frontend.md` | Toda tabela/view/RPC legível por painel; todo route handler `/api/*` com request/response; o que o RLS deixa passar por papel. **É o documento de que o outro dev depende.** |
| `schema.md` | Os 3 domínios (`creator_*`, `controle_edicao.*`, `Controle de Mensagens`) e o que cada painel lê |
| `metricas.md` | Cada KPI por função — a fórmula, não o rótulo |
| `identidade.md` | O lookup email→painéis, mais a dívida de identidade canônica e o risco de RLS com raio de impacto |

## Onde buscar

- **Estrutura do repo, stack, dados, o que não fazer** → [AGENTS.md](../../AGENTS.md)
- **Qual skill usar** → [skills-map.md](skills-map.md), ou invoque `kpi-skill-gerente`
- **Design system do Creator** → `design-system/sistema-de-producao-criativa/MASTER.md`
- **Schema do banco** → `supabase/migrations/` (7 arquivos versionados)
- **Log de erros e RCA** → `troubleshooting-log.md` (criado pela `kpi-debugger-erros`)
