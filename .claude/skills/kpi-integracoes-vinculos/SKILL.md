---
name: kpi-integracoes-vinculos
description: "Integrations and links in KPI F3F. Communication between modules (who accesses which tables, internal APIs), use of aluno_id and user_id, contracts between modules and with satellite systems (webhooks, events). Defines and documents contracts; Backend implements services. Use when defining integration between modules, internal API contract, or external system integration."
---

# KPI F3F Integrações e vínculos

Responsável por **comunicação entre módulos**, **vínculos por ID** (`aluno_id`, `user_id`, `pessoa_id`) e **contratos** (quem lê/escreve o quê; APIs internas; sistemas satélites). Define as regras de integração e documenta; a **implementação** (services, rotas, consumo de webhook) fica com as skills Backend e Auth quando aplicável.

**Documento oficial desta skill (obrigatório manter atualizado):** [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md). Esse doc é **mutável**: sempre que um módulo for implementado ou uma integração for definida, **esta skill atualiza** o documento — quem fala com quem, quais campos fazem a integração, quais campos são comuns entre módulos, contratos. A skill Documentação mantém o índice e "Onde buscar"; esta skill mantém o **conteúdo** do doc de integração. Referências: [data-flow.md](.context/docs/data-flow.md), [project-plan.md](.context/docs/project-plan.md) (sistemas satélites).

## Regra de ouro

- **Documento de integração e vínculos** [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md) → **esta skill é dona e deve mantê-lo atualizado.** Ao implementar ou definir um módulo, atualizar: quem fala com quem, quais campos fazem a integração, quais campos são comuns entre módulos.
- **Contrato entre módulos** (quem acessa quais tabelas; quem chama qual service; formato de dados) → esta skill.
- **Campos de integração** (ex.: `pessoa_id`, `aluno_id`, `user_id`) e **campos comuns entre módulos** (o que é compartilhado vs o que é só do módulo) → esta skill define e documenta no doc de integração e no [reference.md](reference.md).
- **Uso consistente de `aluno_id` e `user_id`** como vínculo (sem cadastros duplicados) → esta skill define a regra; implementação nas skills Backend e Entidades centrais.
- **APIs internas** (módulo A expõe endpoint ou service para módulo B) → esta skill define o contrato; Backend implementa.
- **Sistemas satélites** (webhook, evento externo → KPI F3F reage) → esta skill define o contrato (payload, evento, quem consome); Backend implementa o handler.
- **Esquema e RLS** (tabelas, políticas) → skill Supabase; **código** dos services que expõem/consomem → skill Backend; esta skill **define o quê** e **documenta**.

## Quando usar esta skill

- **Definir** como dois módulos se comunicam (ex.: Comercial envia aluno_id para Educacional; Educacional lê tabela de contratos ou recebe evento).
- **Definir contrato** de API interna (ex.: módulo X expõe GET /api/internal/alunos/:id para módulo Y; formato de resposta).
- **Integrar sistema satélite** (ex.: contrato assinado via webhook): definir evento/payload que o KPI F3F recebe, quem consome (service), o que o KPI F3F faz em resposta; documentar no [reference.md](reference.md) e em data-flow.
- **Garantir** que nenhum módulo duplique cadastro (sempre `aluno_id`/`user_id`; pessoa única); esta skill reforça a regra e documenta onde cada módulo obtém o ID.
- **Documentar** fluxo de dados entre módulos: **sempre atualizar** [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md) quando um módulo for implementado ou uma integração for definida (quem fala com quem; campos de integração; campos comuns). Atualizar data-flow.md ou ADR quando for fluxo geral ou decisão de arquitetura.
- **Dúvida** "o módulo A pode acessar a tabela do módulo B?" ou "como o Educacional sabe que o contrato foi assinado?" → consultar ou definir via esta skill.

## Regras

- **Um contrato por integração:** cada integração (módulo↔módulo ou satélite→KPI F3F) deve ter contrato documentado: quem inicia, com que dados, em que formato, e quem reage. Registrar no [reference.md](reference.md) ou em data-flow/ADR.
- **IDs centrais:** sempre `aluno_id`, `user_id` (ou `pessoa_id` quando for a entidade única); nunca chave duplicada (ex.: "aluno do Comercial" vs "aluno do Educacional" como dois registros); um único cadastro referenciado por ID. Esta skill valida que os contratos e fluxos respeitam isso.
- **Sistemas satélites:** padrão "evento/dado chega → KPI F3F atualiza estado e dispara fluxo"; documentar origem (webhook URL, fila, API), payload esperado e responsável no KPI F3F (qual service ou rota consome).
- **APIs internas:** quando um módulo precisar chamar outro (em vez de ler no mesmo banco), definir método (HTTP interno, ou chamada direta a service no mesmo processo), autenticação (se houver) e formato; Backend implementa.
- **Registro progressivo:** cada integração ou satélite adotado deve ser listado no [reference.md](reference.md) com contrato resumido.

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Padrões de vínculo:** uso de `aluno_id`, `user_id`; tabelas compartilhadas vs tabelas por módulo; quem pode ler/escrever o quê.
- **Contratos entre módulos:** formato (tabela acessada, colunas, ou API interna com request/response); onde documentar (data-flow, reference, ADR).
- **Sistemas satélites:** lista (ex.: Contratos); evento/payload; quem no KPI F3F consome; registro progressivo.
- **APIs internas:** quando usar (evitar quando o mesmo banco + RLS bastar); formato do contrato.

## Integração com outras skills

- **Backend:** implementa os services e rotas que expõem ou consomem; esta skill define o **contrato** (entrada, saída, quem chama).
- **Supabase:** tabelas e RLS permitem ou restringem acesso; esta skill define **quais** tabelas um módulo pode acessar e como se vinculam (IDs); Supabase implementa o esquema.
- **Auth e Rotas:** rotas de webhook ou API interna podem precisar de auth (service key, header); esta skill define "quem pode chamar"; Auth define como validar.
- **Documentação:** esta skill mantém o **conteúdo** de [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md); a skill Documentação mantém o índice (.context/docs/README.md) e a entrada "Onde buscar" para esse doc. Contratos e fluxos também em data-flow.md ou ADR quando aplicável.

## Referência adicional

- Padrões de vínculo, contratos, satélites e APIs internas: [reference.md](reference.md) (neste diretório).
- Fluxo de dados do projeto: [data-flow.md](.context/docs/data-flow.md). Sistemas satélites: [project-plan.md](.context/docs/project-plan.md) (seção 3).
