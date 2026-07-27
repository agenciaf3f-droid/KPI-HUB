# Referência – KPI F3F Skill Gerente

Tabela de delegação (tarefa → skill), ordens multi-skill e regras para evitar conflitos. Fonte de verdade do mapa: [.context/docs/skills-map.md](.context/docs/skills-map.md).

**Onde buscar (centralizado):** Requisitos → `.context/docs/requisitos/`. Componentes UI → `@/shared/ui` e [reference Componentes](.cursor/skills/kpi-componentes/reference.md). Mensagens → `src/shared/messages/`. Listas/filtros → [requisitos-listas-e-filtros-padronizados.md](.context/docs/requisitos/requisitos-listas-e-filtros-padronizados.md) + DataTable/BarraFiltrosPadrao/useColunasPersistidas. **Dashboards** → [requisitos-dashboards-padronizados.md](.context/docs/requisitos/requisitos-dashboards-padronizados.md) + [ADR 004](.context/docs/adr/004_dashboards_padronizados_sgt.md) + [kpi-dashboards/SKILL.md](.cursor/skills/kpi-dashboards/SKILL.md) + `ChartCard`/`KpiMetricCard` em `@/shared/ui`. Índice completo: [.context/docs/README.md](.context/docs/README.md) § "Onde buscar".

---

## Tarefa → Skill(s) (delegação rápida)

| Tipo de pedido / tarefa | Skill principal | Outras skills (ordem quando aplicável) |
|--------------------------|-----------------|----------------------------------------|
| Criar/alterar tabelas, RLS, migrations, Supabase | **Supabase / Engenheiro de dados** | Entidades centrais (se for tabela central); Documentação (se alterar fluxo). |
| Login, sessão, perfil, middleware, rotas protegidas | **Auth e Rotas** | Supabase (tabela de perfil); Frontend (telas de login/perfil). |
| Definir/alterar modelo usuário ou pessoa/aluno; "uma pessoa única" | **Entidades centrais** | Supabase (implementar schema); Backend (services que tocam pessoa/usuário). |
| Criar um novo módulo no HUB | **Novo módulo** | Orquestra: Organizar → Entidades/Integrações (se necessário) → Supabase → Backend → Frontend → Auth → Documentação. |
| Commit, PR, merge, conflitos, Vercel | **GitHub + Vercel** | Documentação (se mudou scaffolding); QA (testes no PR). |
| Services, repositories, entidades de domínio | **Backend** | Supabase (tipos, acesso via repo); Auth (user_id na sessão). |
| Como dois módulos se comunicam; webhook/satélite; contrato; atualizar doc de integração e vínculos | **Integrações e vínculos** | Mantém [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md) (quem fala com quem, campos de integração, campos comuns). Backend (implementar); Documentação (índice/Onde buscar). |
| Atualizar .context/docs, README, ADR, glossário, índice | **Documentação** | — |
| Onde colocar arquivo; estrutura de pastas; mover/reorganizar | **Organizar repositório** | Documentação (se mudar mapa); Limpeza (se também for conteúdo). |
| Código morto, duplicação, refatorar, remover lixo | **Limpeza de código** | Organizar (se for extrair para shared e mover). |
| Páginas, rotas, layouts, componentes de tela | **Frontend** | Componentes (usar campos padronizados); Auth (rotas protegidas). |
| Dashboard / visão analítica (KPIs, gráficos, drill-down, filtros de período, performance) | **Dashboards** | Frontend (rotas/layout base); Backend/API (agregações); UX (complexo); Auth (escopo); Supabase (view/índice se necessário). |
| **Listas, filtros, tabelas padronizadas** (DataTable, busca, período, colunas) | **Componentes** (definir/registrar) + **Frontend** (usar DataTable, BarraFiltrosPadrao, useColunasPersistidas). | Requisito: `.context/docs/requisitos/requisitos-listas-e-filtros-padronizados.md`. Nenhum módulo monta tabela própria. Em dashboards, a tabela de detalhe segue o mesmo padrão (**Dashboards** + Componentes/Frontend). |
| Criar/padronizar componente CPF, telefone, data, moeda, calendário, CEP, listas, mensagens | **Componentes** | Frontend (usa depois). |
| Testes unitários, E2E, edge cases em formulários | **QA / Tester** | — (testa o que Backend/Frontend fizeram). |
| Auditar RLS; dados sensíveis no client; N+1 | **Security & Performance** | Supabase/Backend/Frontend (implementar correções após reporte). |
| Mockup textual, copy, loading/empty, fluxo (antes de codar) | **UX / Designer** | Frontend (implementa depois). |
| Erro, bug, "não funciona"; causa raiz; registrar solução | **Debugger / Especialista em Erros** | QA (regressão); Supabase/Backend/Frontend (se causa for de outra skill). |
| Ideia bruta de negócio, processo novo, dor do usuário | **Consultoria / Analista de Processos** | Entidades/Integrações/UX/Backend/Supabase/Frontend (implementar conforme requisitos). |
| Trazer sistema legado para o KPI F3F; migrar sistema antigo | **Migração e Tradução de Legado** | Mapa de Tradução primeiro; depois Entidades → Supabase → Auth → Backend → UX/Frontend. |
| "O que falta fazer?", criar tasks de um plano, marcar concluído, listar urgente/atrasado | **ClickUp PM** | Usa MCP ClickUp; Consultoria (se plano vir de requisitos); Gerente (ordem técnica). |
| Relatório, auditoria ou parecer **por skills**; nota global e lacunas pós-implementação | **Relatório de módulo** | Entradas: resumo, `git diff --name-only`, opcional plano/requisitos; consulta [skills-map](.context/docs/skills-map.md). Não substitui **Security & Performance** para auditoria formal só de RLS (combinar quando necessário). |
| **Novo campo em pessoas ou tabela auditável** (Supabase altera coluna) | **Supabase** (DDL) + **Backend** (incluir em CAMPOS_AUDITAVEIS do chatbot) | Ao adicionar coluna em pessoas/educacional/pessoa_redes_sociais, Backend inclui em `src/modules/chatbot/services/chat-tools.ts` → `CAMPOS_AUDITAVEIS` e ajusta `auditarCampo` se origem for outra tabela. Não criar tool nova. Ver [ESTRATEGIA-AUDITORIAS-E-CONSULTAS.md](.context/docs/chatbot/ESTRATEGIA-AUDITORIAS-E-CONSULTAS.md). |

---

## Ordens multi-skill (resumo)

| Cenário | Ordem |
|---------|--------|
| **Modelo de dados / tabelas centrais** | Entidades centrais (define) → Supabase (schema/RLS) → Backend (services/repos). |
| **Novo módulo** | Novo módulo (orquestra) → Organizar (scaffold) → [Entidades + Integrações se necessário] → Supabase → Backend → Frontend → Auth → Documentação; QA em paralelo ou após. |
| **Integração módulo↔módulo ou satélite** | Integrações (contrato) → Backend (implementar); Supabase se precisar tabelas; Auth se precisar proteger webhook/API. |
| **Nova tela / fluxo** | UX (mockup, copy) → [Componentes se faltar campo] → Frontend. |
| **Novo campo reutilizável** | Componentes (definir/registrar) → Frontend (usar). |
| **Auditoria segurança/performance** | Security & Performance (reportar) → Supabase ou Backend ou Frontend (corrigir). |
| **Mudança de estrutura ou novo doc** | Organizar ou Documentação (criar) → Documentação (atualizar índice). |
| **PR / merge** | Build + test (QA); docs atualizados (Documentação); GitHub (commit/PR). |
| **Erro / bug** | Debugger (RCA, corrigir, log) → QA (regressão); Supabase/Backend/Frontend se causa for de outra skill. |
| **Ideia bruta de negócio** | Consultoria (requisitos primeiro) → Entidades/Integrações/UX/Backend/Supabase/Frontend conforme doc. |
| **Migrar sistema legado** | Migração (Mapa de Tradução, desdup, pessoa única) → Entidades → Supabase → Auth → Backend → UX/Frontend. |
| **Plano → Tarefas ClickUp** | Consultoria (gera plano/requisitos) → ClickUp PM (cria tasks no board). |
| **Check-in diário / backlog** | ClickUp PM (lista pendentes, urgente, em andamento). |
| **Relatório de módulo (governança)** | Relatório de módulo (lê evidências + repo, emite parecer escrito; não altera código). |

---

## Regras de fronteira (não invadir)

- **Supabase:** só esquema, RLS, migrations, MCP. Não services, não telas, não regras de pessoa/aluno (Entidades centrais define).
- **Backend:** só application layer (services, repos, entidades). Não tabelas/RLS (Supabase), não UI (Frontend).
- **Frontend:** só telas e uso de componentes. Não criar campos padronizados (Componentes), não esquema (Supabase).
- **Dashboards:** só padrões de dashboard (KPI, gráfico, drill-down, Query keys, performance de visualização). Não campos reutilizáveis (Componentes), não schema/RLS (Supabase), não regra de negócio pesada sem Backend.
- **Auth e Rotas:** só auth, middleware, proteção de rotas. Não esquema de perfil (Supabase), não telas (Frontend).
- **Entidades centrais:** só modelo e regras. Não migrations (Supabase), não código de service (Backend).
- **Integrações:** só contratos e documentação. Não implementar services/rotas (Backend).
- **Organizar:** só onde ficam arquivos. Não conteúdo (Limpeza).
- **Limpeza:** só conteúdo (morto, duplicação). Não onde colocar (Organizar).
- **Documentação:** só índice, quando documentar, ADR, glossário. Não conteúdo técnico das outras skills.
- **Security & Performance:** só auditar e reportar. Não implementar RLS nem correções (Supabase/Backend/Frontend).
- **UX:** só especificar (mockup, copy). Não codificar (Frontend/Componentes).
- **QA:** só testes. Não código de produção.
- **Debugger / Especialista em Erros:** RCA, correção e log; pode delegar implementação. Não substitui QA (regressão).
- **Consultoria / Analista de Processos:** só requisitos. Não implementa (Entidades, Backend, Supabase, Frontend).
- **Migração e Tradução de Legado:** analisa e produz mapa; orquestra. Não implementa schema/services/telas (delega às skills da matriz).
- **ClickUp PM:** só gestão do board (criar/atualizar/listar tasks via MCP). Não implementa código; não define requisitos (Consultoria). Sincroniza; não codifica.
- **Relatório de módulo:** só documento de auditoria/parecer; não altera código. Complementa (não substitui) **Security & Performance** quando o objetivo for relatório holístico por skills.

---

## Regras transversais (multi-skill)

| Regra | Skills envolvidas |
|-------|-------------------|
| **Supabase – projeto obrigatório** | A skill **Supabase / Engenheiro de dados** opera **exclusivamente** no projeto `ulikfkemdawinetjyhok`. Ao delegar qualquer tarefa de banco/RLS/migrations ao MCP Supabase, usar sempre este projeto; sem exceção. Ferramentas MCP referenciadas na skill: list_tables, apply_migration, execute_sql, list_migrations, generate_typescript_types, get_advisors, get_project, get_project_url, get_logs, get_publishable_keys, edge functions, branches (detalhes em `.cursor/skills/kpi-supabase-data-engineer/SKILL.md` § 3). |
| **Chatbot – novos campos auditáveis** | Ao criar/alteger coluna em pessoas, educacional_matriculas, pessoa_redes_sociais (Supabase), o Backend deve incluir o campo em `CAMPOS_AUDITAVEIS` em `src/modules/chatbot/services/chat-tools.ts` e ajustar `auditarCampo` se a origem for outra tabela. Não criar tool nova para cada pergunta; reutilizar `auditar_campo`. Ver `.context/docs/chatbot/ESTRATEGIA-AUDITORIAS-E-CONSULTAS.md`. |

---

## Links

- [skills-map.md](.context/docs/skills-map.md) – lista e "Quando usar cada skill".
- [AGENTS.md](AGENTS.md) – mandato, repo map, PR, testes, docs.
- Skills individuais: `.context/skills/<nome-skill>/SKILL.md` e `reference.md`; ativas no Cursor: `.cursor/skills/<nome-skill>/`.
