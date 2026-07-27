---
name: kpi-entidades-centrais
description: "Central entities in KPI F3F: user (Auth + profile) and pessoa/aluno (single entity, seen as client or aluno by context). Always reference by ID; no duplicate records. Use when defining or changing user/aluno model, central tables, or rules for 'one person unique'."
---

# KPI F3F Entidades centrais

Responsável por **usuário** (Auth + perfil) e **pessoa/aluno** (entidade única: mesmo registro visto como cliente no Comercial e aluno no Educacional). Regra obrigatória: **sempre por ID**; **nunca duplicar cadastro**. Esta skill define o modelo, as tabelas centrais e as regras de uso; implementação de esquema no Supabase (skill Supabase), de services/repositories (skill Backend) e de auth/rotas (skill Auth) segue as definições daqui. Referências: [project-plan.md](.context/docs/project-plan.md) (pessoa única, cliente/aluno), [data-flow.md](.context/docs/data-flow.md).

## Regra de ouro

- **Uma pessoa no banco:** existe uma única entidade na tabela `pessoas`. Comercial chama de "cliente", Educacional de "aluno" – é o **mesmo registro**. Alterar endereço no Comercial altera no Educacional. Módulos referenciam por `pessoa_id`; não criam tabela própria de "cliente" ou "aluno" com cópia de dados.
- **Um usuário no HUB:** um login (Supabase Auth) → um `user_id`; perfil (aluno, mentor, admin, etc.) define o que acessa. Operações sempre vinculadas ao `user_id` quando for dado do logado.
- **Sem cadastros duplicados:** nunca ter "aluno do Comercial" e "aluno do Educacional" como dois registros para a mesma pessoa física; nunca "usuário do módulo X" e "usuário do módulo Y" como duas contas. Esta skill valida que o modelo e o código respeitam isso.
- **Tabelas centrais:** usuário/perfil e pessoa/aluno vivem em tabelas centrais (ou Auth + extensão em tabela); módulos têm apenas FKs. Definir e alterar esquema dessas tabelas é decisão desta skill; criar as migrations é com a skill Supabase.

## Quando usar esta skill

- **Implementar ou alterar** o modelo de usuário (Auth + perfil): campos, tabela de perfil, vínculo com Auth.
- **Implementar ou alterar** o modelo de pessoa/aluno: tabela única, campos (nome, CPF, endereço, etc.), quando "cliente" vira "aluno" (ex.: contrato assinado).
- **Garantir** que um novo fluxo ou módulo usa apenas IDs das entidades centrais (sem criar tabela paralela de pessoa ou usuário).
- **Migrar** ou consolidar cadastros duplicados existentes em um único registro por pessoa/usuário.
- **Dúvida** "onde cadastro o aluno?", "posso criar tabela cliente no Comercial?", "como referencio a pessoa no Educacional?" → consultar ou definir via esta skill.

## Regras

- **Referência por ID:** em tabelas de módulo, usar sempre `user_id` (Auth) ou `pessoa_id` (entidade pessoa); nunca chave "nome + CPF" ou cópia de dados para "evitar join".
- **Cadastro em um só lugar:** o primeiro cadastro de pessoa (ex.: no Comercial como cliente) cria o registro central; demais módulos apenas referenciam e eventualmente enriquecem (ex.: dados educacionais em tabela do módulo Educacional com FK para pessoa_id).
- **Cliente → Aluno:** pessoa já é uma; quando o contrato está assinado (evento externo ou fluxo interno), a mesma pessoa passa a ser tratada como "aluno" (ex.: liberar acesso ao Educacional, iniciar onboarding). Não criar novo registro; apenas atualizar estado ou vínculos conforme regra de negócio.
- **Registro progressivo:** decisões sobre nome da tabela central (pessoa vs aluno), campos obrigatórios e convenção de IDs devem ser documentadas no [reference.md](reference.md).
- **Prevenção de Duplicidade Física:** Toda tabela central de pessoas DEVE ter uma constraint UNIQUE no campo de documento (ex.: CPF). O Agente deve sempre verificar a existência do documento antes de tentar um novo `INSERT`.

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Modelo das entidades:** Usuário (Auth + perfil), Pessoa/Aluno (uma entidade); quem é responsável por cadastrar cada um.
- **Tabelas centrais:** onde vivem usuário/perfil e pessoa/aluno; convenção fechada: `profiles`, `pessoas`; FK `pessoa_id`; identificador Auth `user_id`.
- **Como referenciar:** uso de `user_id`, `pessoa_id`, `aluno_id` nas tabelas de módulos; quando usar cada um.
- **Fluxo cliente → aluno:** regra (contrato assinado, mesmo registro); onde documentar integração (Integrações e vínculos).
- **Código (shared/domain):** onde ficam tipos e entidades de domínio compartilhados; serviços centrais de pessoa/usuário (se houver).

## Integração com outras skills

- **Supabase:** tabelas centrais e RLS são definidas por esta skill (modelo); criação e alteração de schema e políticas ficam com a skill Supabase.
- **Backend:** services e repositories que criam/alteram pessoa ou usuário seguem o modelo desta skill; entidades e tipos centrais podem ficar em `shared` ou `domain`; Backend implementa a lógica.
- **Auth e Rotas:** usuário e perfil vêm do Auth; esta skill define "o que é usuário/perfil no modelo"; Auth implementa login, sessão e proteção de rotas.
- **Novo módulo:** novo módulo não cria entidade central; só referencia por ID; a skill Novo módulo remete a esta skill para o modelo de pessoa/usuário.
- **Integrações e vínculos:** contratos entre módulos usam aluno_id/user_id; esta skill define o significado desses IDs; Integrações documenta quem lê/escreve.

## Referência adicional

- Modelo, tabelas centrais, referência por ID e fluxo cliente→aluno: [reference.md](reference.md) (neste diretório).
- Regras de negócio (pessoa única): [project-plan.md](.context/docs/project-plan.md). Fluxo de dados: [data-flow.md](.context/docs/data-flow.md).
