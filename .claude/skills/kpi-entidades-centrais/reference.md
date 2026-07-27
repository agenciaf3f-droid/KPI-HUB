# Referência – KPI F3F Entidades centrais

Modelo de usuário e pessoa/aluno, tabelas centrais e regras de referência por ID. **Registro progressivo:** decisões sobre nomes de tabelas, campos e convenções documentar aqui.

---

## Modelo das entidades

### Usuário (Auth + perfil)

- **Identidade:** Supabase Auth → `user_id` (UUID). Um login para todo o HUB.
- **Este HUB é interno:** quem loga são **usuários internos** (comercial, admin, educacional, etc.). O **aluno não acessa este sistema**; o aluno acessa os **portais** (outro contexto).
- **Perfil:** tabela `profiles` com papel (role) e, quando aplicável, vínculo `pessoa_id` (ex.: usuário interno ligado a uma pessoa para contexto cliente/aluno).
- **Uso:** em todo módulo, operações usam `auth.uid()`; RLS filtra por `user_id` e por role. Não há "aluno logado" neste HUB.
- **Responsável por cadastrar:** fluxo de signup/convite para **equipe**; perfil criado ou atualizado conforme Configurações.

### Pessoa / Cliente / Aluno (entidade única)

- **Conceito:** uma única entidade no banco que representa a pessoa física. No **Comercial** é **cliente** (lead, contato, contrato); no **Educacional** é **aluno** (matrícula, cursos). Mesmo registro em `pessoas`, contextos diferentes.
- **Dono do cadastro:** o **módulo Comercial** é o ponto de entrada: **cadastra a pessoa** (ou importa). Quando a pessoa **assina o contrato**, passa a ser **cliente**. Esse cliente, nos processos internos, **vira aluno**; a informação centralizada em `pessoas` é **compartilhada** entre Comercial (clientes) e Educacional (alunos). O Comercial **envia / disponibiliza** os dados ao Educacional (não duplicar cadastro).
- **Cadastro:** Comercial cria o registro em `pessoas`; Educacional e outros módulos referenciam por `pessoa_id` e têm tabelas de contexto (ex.: matrículas com FK para `pessoa_id`). Nunca duplicar pessoa por módulo.

---

## Tabelas centrais (convenção)

Definir e manter aqui os nomes e responsabilidades. Ajustar quando o projeto adotar esquema no Supabase.

| Entidade | Tabela | Responsabilidade |
|----------|--------|-------------------|
| **Usuário / Perfil** | `profiles` (ou extensão de Auth) | Dados do usuário logado; papel; vínculo com pessoa quando for aluno/funcionário. |
| **Pessoa / Cliente / Aluno** | **`pessoas`** | Dados cadastrais (nome, documento, contato); um registro por pessoa física. **Dono do cadastro:** Comercial (cadastra/envia ao Educacional quando vira aluno). "Aluno" e "cliente" são contextos, não nome da tabela. |

- **RLS:** políticas garantem que cada usuário só acessa os dados permitidos pelo perfil (ex.: aluno vê só seus dados; admin vê o que a política permitir). Definir na skill Supabase conforme modelo desta skill.
- **Módulos:** tabelas de módulo (ex.: `comercial_contratos`, `educacional_matriculas`) têm FK para a tabela central (ex.: `pessoa_id`), nunca cópia de nome/CPF como "cadastro do módulo".

---

## Como referenciar (user_id, pessoa_id, aluno_id)

| ID | Uso |
|----|-----|
| **user_id** | Operações do usuário logado; RLS; "quem fez"; vínculo perfil ↔ pessoa (ex.: aluno tem user_id no perfil apontando para sua pessoa). |
| **pessoa_id** | Registro único da pessoa (tabela `pessoas`). Convenção do projeto: sempre `pessoa_id`. |

- Em **queries e tipos:** sempre usar o ID; buscar dados da pessoa quando precisar (join ou service). Não armazenar nome/CPF em tabela de módulo "por conveniência".
- **Unicidade:** a tabela central de pessoas **DEVE** ter constraint UNIQUE no campo de documento (ex.: CPF). Verificar existência do documento antes de `INSERT`; fluxo de merge ou deduplicação se houver legado.

### Documento PF vs CNPJ fiscal (checkout Hubla / MEI)

| Campo | Uso |
|-------|-----|
| `documento_tipo` / `documento_valor` | Identidade pessoal: CPF (11 dígitos), passaporte, RNM ou `OUTRO`. Constraint `pessoas_documento_tipo_check` **não** aceita `CNPJ`. |
| `cnpj` | CNPJ fiscal (14 dígitos) informado no checkout quando o aluno permanece **PF** (`natureza = PF`), ex.: MEI. Não preencher `documento_tipo = CNPJ`. |
| `natureza` | `PF` para aluno educacional; `PJ` só quando cadastro empresarial completo (razão social, etc.). |

Integração Hubla: ver mapa De→Para em [integracao-hubla-educacional.md](.context/docs/requisitos/integracao-hubla-educacional.md).

---

## Fluxo cliente → aluno

1. Pessoa é cadastrada no **Comercial** como cliente (um registro em `pessoas`).
2. Contrato é gerado/assinado em **sistema satélite** (fora do KPI F3F).
3. KPI F3F **recebe** o evento (webhook/API) de "contrato assinado" com identificador da pessoa (ex.: `pessoa_id` ou documento).
4. KPI F3F **atualiza** estado (ex.: "cliente ativo como aluno", data de ativação) e **dispara** fluxos (ex.: criar vínculo user_id–pessoa_id para login do aluno; iniciar onboarding no Guia do Aluno). **Não** cria nova pessoa; usa o mesmo `pessoa_id`.
5. **Educacional** e outros módulos referenciam essa pessoa por `pessoa_id`.

Contrato do evento (payload, quem consome) documentar na skill [Integrações e vínculos](.context/skills/kpi-integracoes-vinculos/reference.md).

---

## Código (shared / domain)

- **Tipos e entidades** de pessoa e usuário (interfaces, tipos TypeScript ou classes) que são usados em mais de um módulo devem ficar em **`src/shared/types/`** ou **`src/domain/`** (conforme convenção do projeto), não duplicados em cada módulo.
- **Services/repositories** que criam ou alteram a entidade central (ex.: PessoaService, AlunoRepository) podem ficar em um módulo "dono" (ex.: Comercial para primeiro cadastro) ou em **shared/domain** se forem usados por vários módulos. Manter um único ponto de escrita para a tabela central; leitura pode ser feita por qualquer módulo via repository com RLS.
- Alinhar com a skill [Backend](.context/skills/kpi-backend/reference.md) para estrutura de pastas e injeção de dependência.

---

## Decisão de nomenclatura (fechada)

| Decisão | Valor final |
|---------|-------------|
| **Nome da tabela** | `pessoas` |
| **FK padrão** | `pessoa_id` |
| **Identificador Auth** | `user_id` |

"Aluno" é papel ou estado da pessoa, não o nome da tabela central. Outras decisões (ex.: campos de `profiles`) documentar abaixo quando definidas.

---

## Registro – Fundação Fase 1

Modelo validado para a fundação: tabelas `profiles` e `pessoas`; referência por `user_id` e `pessoa_id`. Criação física das tabelas e RLS será feita pela skill **Supabase / Engenheiro de dados** (migrations), conforme [requisitos-fundacao-fase1.md](.context/docs/requisitos/requisitos-fundacao-fase1.md). Nenhuma migration foi criada neste passo.

---

## Registro – Agenda de Massagem v1.2 (2026-07-21)

**Parecer:** aprovado usar **somente `user_id`** no domínio `ge_massagem_*` (v1.2).

| Campo / conceito | Entidade | Decisão |
|------------------|----------|----------|
| Quem reserva | `ge_massagem_reserva.user_id` | Auth — já existente |
| Nome na grade / lista | `reservado_nome` | Snapshot de exibição; não é cadastro paralelo |
| Responsável operacional | `ge_massagem_config.responsavel_user_id` | FK lógica → `auth.users` / `profiles.id` |
| Quem registrou comparecimento | `comparecimento_por` | `user_id` |
| Bloqueio (penalidade) | `ge_massagem_bloqueio.user_id` | `user_id` |

**Proibido:** criar tabela de “massagista”, “cliente massagem” ou copiar dados de `pessoas` para o módulo.  
**UI de escolha do responsável:** selecionar **usuário HUB** (`user_id`); label pode ler `pessoas.nome_completo` via `profiles.pessoa_id` só para exibição. Não usar fluxo de cadastro de pessoa.  
**Doc:** [gestao-eventos-agenda-massagem.md](../../../.context/docs/requisitos/gestao-eventos-agenda-massagem.md).

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – pessoa única, cliente/aluno, configurações e perfil.
- [data-flow.md](.context/docs/data-flow.md) – entidades core e fluxo de dados.
- [kpi-integracoes-vinculos/reference.md](.context/skills/kpi-integracoes-vinculos/reference.md) – contrato do evento "contrato assinado" e integração com satélites.
- [kpi-backend/reference.md](.context/skills/kpi-backend/reference.md) – onde ficam services e repositories; entidades centrais (lembrete).
