# Referência – KPI F3F Migração e Tradução de Legado

Matriz de tradução técnica, checklist de migração e convenção para o Mapa de Tradução. **Registro progressivo:** migrações em andamento ou concluídas podem ser listadas ao final.

---

## Matriz de tradução técnica

| Elemento legado | Destino no KPI F3F | Skill responsável |
|-----------------|----------------|-------------------|
| Banco de dados (Postgres/MySQL/outro) | Supabase (schema central) | Supabase / Eng. de dados |
| Login / sessão própria | Supabase Auth (login único) | Auth e Rotas |
| Cadastro de "aluno" ou "cliente" local (por sistema) | Tabela central `pessoas` (ID único); referência por `pessoa_id` / `aluno_id` | Entidades centrais (modelo); Supabase (tabela/RLS) |
| Tabelas por módulo no legado | Tabelas no KPI F3F com FK para `pessoa_id`/`user_id` (ex.: `comercial_contratos`, `educacional_matriculas`) | Supabase + Entidades centrais |
| HTML/CSS/Bootstrap/jQuery | Next.js App Router + Tailwind + shadcn/ui | Frontend / UX / Componentes |
| Queries diretas no controller / script | Service → Repository (padrão Backend) | Backend |
| Regras de negócio em controller ou script | Services (casos de uso); entidades de domínio | Backend |
| Permissões/roles no legado | RLS (Supabase) + perfil (Auth/Configurações) | Supabase + Auth e Rotas |
| Dados a migrar (carga inicial) | Scripts SQL/migrations preservando `pessoa_id`, desduplicação | Supabase (executar); esta skill (definir plano) |

---

## Checklist de migração

Antes de dar por concluída uma migração (ou etapa de migração), conferir:

- [ ] **Desduplicação:** O dado que estou trazendo **já existe** no KPI F3F? (ex.: mesma pessoa por CPF/documento). Se sim, **vincular via ID** (pessoa_id, user_id); **não** criar novo registro.
- [ ] **Segurança:** O RLS do novo sistema **cobre** as permissões que existiam no antigo? (ex.: usuário A não vê dados do usuário B). Se necessário, acionar Security & Performance para auditoria após migração.
- [ ] **Limpeza:** Códigos mortos ou bibliotecas obsoletas do legado foram **descartados**? Não trazer para o repositório KPI F3F código que não será usado (ou acionar Limpeza de código após a migração para remover resquícios).
- [ ] **Mapa de Tradução:** O documento De: Legado → Para: KPI F3F foi produzido e salvo (ex.: `.context/docs/migracao/mapa-<sistema>.md`); índice atualizado (Documentação).
- [ ] **Entidade única:** Nenhuma tabela migrada replica "aluno" ou "cliente" como cadastro próprio; tudo referenciando a tabela central de pessoas.

---

## Onde salvar o Mapa de Tradução

- **Sugestão:** `.context/docs/migracao/` (ex.: `mapa-traducao-comercial-legado.md`) ou dentro de `requisitos/` se for um doc de requisitos da migração.
- **Conteúdo mínimo:**
  - Nome do sistema legado e escopo (módulo(s), banco, stack).
  - Tabelas legado → tabelas KPI F3F (e FKs para pessoa_id/user_id).
  - Login/usuários legado → estratégia Supabase Auth (ex.: migração de usuários, vínculo com pessoa_id).
  - Telas/fluxos legado → rotas e componentes KPI F3F (referência a UX/Frontend).
  - Lógica/scripts legado → services e repositories (referência a Backend).
  - Plano de dados: ordem de carga, desduplicação (ex.: por CPF), scripts ou migrations.
- **Índice:** Todo novo doc em `.context/docs/` deve ser listado no [.context/docs/README.md](.context/docs/README.md) (skill Documentação).

---

## Migrações (registro progressivo)

Listar aqui migrações em andamento ou concluídas para referência.

| Sistema legado | Escopo | Status | Mapa de Tradução (link) |
|----------------|--------|--------|--------------------------|
| PatrimonioGlobal | Módulo Patrimônio KPI F3F; Vite+React+Express+Supabase | Em andamento | [mapa-traducao-patrimonio-global.md](.context/docs/migracao/mapa-traducao-patrimonio-global.md) |
| *(outros)* | | | Preencher ao iniciar migração. |

---

## Links

- [Entidades centrais](../kpi-entidades-centrais/SKILL.md) – modelo pessoa único, sem cadastros duplicados.
- [Supabase / Eng. de dados](../kpi-supabase-data-engineer/SKILL.md) – schema, RLS, migrations.
- [Auth e Rotas](../kpi-auth-rotas/SKILL.md) – login único.
- [Backend](../kpi-backend/SKILL.md) – services e repositories.
- [skills-map.md](.context/docs/skills-map.md) – quando usar a skill Migração.
