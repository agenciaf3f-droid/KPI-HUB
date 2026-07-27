---
name: kpi-migracao-legado
description: Analisa sistemas legados/descentralizados e traduz para a arquitetura KPI F3F. Mapeia schema antigo para Supabase central, auth para login único, cadastros duplicados para entidade pessoas; refatora UI para Next.js/Tailwind/shadcn e lógica para Services/Repositories. Gera Mapa de Tradução antes de codar; não replica erros do legado.
---

# KPI F3F Migração e Tradução de Legado

Responsável por **absorver sistemas existentes** (legados ou descentralizados) no ecossistema KPI F3F. O foco não é "portar" o código tal como está, mas **extrair a lógica de negócio** e **implementá-la** usando as skills especialistas do KPI F3F, com schema centralizado, login único e entidade pessoa única. Esta skill **analisa**, produz o **Mapa de Tradução** (De: Legado → Para: KPI F3F) e **orquestra** a execução; a implementação concreta (tabelas, RLS, services, telas) fica com Supabase, Auth, Entidades centrais, Backend, Frontend e UX conforme a [matriz no reference.md](reference.md).

## Regra de ouro

- **Não replicar o erro:** Se o sistema antigo tinha tabelas de "alunos" ou "clientes" duplicadas por módulo, esta skill **deve** mapear esses dados para a **entidade central** `pessoas` (ou convenção adotada). Nunca criar no KPI F3F uma cópia do modelo fragmentado do legado. Alinhar à skill [Entidades centrais](../kpi-entidades-centrais/SKILL.md).
- **Análise antes da ação:** Antes de codar, a skill **deve** gerar um **Mapa de Tradução** (De: Legado → Para: KPI F3F): quais tabelas viram o quê, qual login vira Supabase Auth, quais telas viram quais rotas/componentes, qual lógica vira quais services/repositories. O mapa pode ser um doc em `.context/docs/` (ex.: `migracao-<sistema>.md` ou `requisitos/mapa-traducao-<sistema>.md`). Registrar no [reference.md](reference.md) quando houver migração em andamento.
- **Desduplicação obrigatória:** Ao migrar dados, verificar se o registro **já existe** no KPI F3F (ex.: mesma pessoa por CPF ou documento). Se sim, **vincular via ID** (pessoa_id, user_id); não criar novo cadastro. Checklist no [reference.md](reference.md).
- **Delegar implementação:** Esta skill **não** cria tabelas, RLS, services nem telas sozinha; usa a [matriz de tradução técnica](reference.md#matriz-de-tradução-técnica) para indicar **qual skill** faz cada parte e em que ordem.

## Quando usar esta skill

- **"Trazer o sistema X para o KPI F3F"**, **"migrar o Comercial/Educacional antigo para o HUB"**, **"absorver o legado Y"**.
- **Analisar** um projeto ou banco legado (Postgres, MySQL, outro) e definir **como** ele será absorvido pelo KPI F3F (schema, auth, entidades, UI, lógica).
- **Gerar o Mapa de Tradução** (documento De: Legado → Para: KPI F3F) antes de qualquer implementação de migração.
- **Planejar migração de dados:** scripts SQL ou ETL que preservem integridade referencial (pessoa_id, user_id) e desdupliquem quando necessário.
- **Dúvida** "como mapear a tabela antiga de alunos para o KPI F3F?" ou "o legado usa login próprio; como unificar com Supabase Auth?" → consultar ou produzir via esta skill (e [reference.md](reference.md)).

## Fluxo de trabalho

1. **Análise de schema:** Mapear tabelas antigas para o schema centralizado do Supabase; identificar entidades que viram `pessoas`/perfil; tabelas que viram módulos (ex.: `comercial_contratos`) com FK para pessoa_id. Skill responsável: **Entidades centrais** (modelo) + **Supabase** (criar tabelas/RLS).
2. **Análise de auth/sessão:** Login/sessão própria do legado → Supabase Auth (login único). Skill responsável: **Auth e Rotas** (+ Supabase para tabela de perfil).
3. **Mapeamento de UI:** Telas e componentes antigos (HTML/CSS, Bootstrap, etc.) → Next.js App Router + Tailwind + shadcn/ui. Especificar rotas e componentes; skill responsável: **UX** (mockup/copy) + **Frontend** (implementar) + **Componentes** (campos padronizados).
4. **Refatoração de lógica:** Scripts, controllers com queries diretas, regras espalhadas → **Services** e **Repositories** no padrão KPI F3F Backend. Skill responsável: **Backend**.
5. **Plano de dados:** Scripts SQL (ou etapas) para migrar dados preservando integridade referencial (pessoa_id); desduplicar antes de inserir quando o KPI F3F já tiver a pessoa. Skill responsável: **Supabase** (migrations/scripts) com regras definidas por esta skill e **Entidades centrais**.
6. **Checklist pós-mapa:** Desduplicação, RLS cobrindo permissões do antigo, limpeza (não trazer código morto nem libs obsoletas). Ver [reference.md](reference.md).

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Matriz de tradução técnica:** Elemento legado → Destino no KPI F3F → Skill responsável (banco, login, cadastro aluno, UI, queries, etc.).
- **Checklist de migração:** Desduplicação (já existe no KPI F3F? vincular por ID); Segurança (RLS cobre permissões do antigo?); Limpeza (código morto e libs obsoletas descartados).
- **Onde salvar o Mapa de Tradução:** convenção (ex.: `.context/docs/migracao/` ou `requisitos/`); Documentação atualiza o índice.

## Integração com outras skills

- **Entidades centrais:** Garantir que cadastros duplicados do legado (aluno por sistema) viram um único registro em `pessoas` e referências por ID. Esta skill define o mapeamento; Entidades valida o modelo; Supabase implementa.
- **Supabase:** Schema central, RLS, migrations e scripts de carga. Esta skill produz o mapa (tabela antiga → tabela KPI F3F); Supabase executa.
- **Auth e Rotas:** Login único; mapear usuários legados para Supabase Auth e perfil. Esta skill define "como" (ex.: migrar usuários, vincular a pessoa_id); Auth implementa.
- **Backend:** Lógica legada → Services e Repositories. Esta skill identifica o que migrar e para qual módulo; Backend implementa.
- **Frontend / UX / Componentes:** UI legada → Next.js + Tailwind + shadcn. Esta skill mapeia tela antiga → rota/componente; UX/Frontend/Componentes implementam.
- **Consultoria / Analista de Processos:** Se o legado for confuso em regras de negócio, acionar Consultoria primeiro para extrair requisitos; depois esta skill produz o mapa técnico.
- **Limpeza de código:** Não trazer código morto nem dependências obsoletas do legado; após migração, Limpeza pode ser acionada para remover resquícios.
- **Documentação:** Mapa de Tradução e docs de migração devem ser listados no índice (`.context/docs/README.md`). Esta skill produz o conteúdo; Documentação atualiza o índice.

## Referência

- Matriz de tradução, checklist e onde salvar: [reference.md](reference.md).
- Modelo central (pessoa única): [Entidades centrais](../kpi-entidades-centrais/SKILL.md). Schema e RLS: [Supabase](../kpi-supabase-data-engineer/SKILL.md).
