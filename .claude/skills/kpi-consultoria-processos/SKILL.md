---
name: kpi-consultoria-processos
description: "Consulting and process analysis for KPI F3F. Bridge between business language and system: translates routines, pains and rules into technical requirements, fields and state flows. First skill for the Gerente when input is raw business idea. Use when translating business idea into requirements, new process rule, or user pain into specs."
---

# KPI F3F Consultoria / Analista de Processos

Responsável por **traduzir** a linguagem "do mundo real" (rotinas do dia a dia, dores do usuário, regras de cobrança, processos) em **linguagem do sistema** (requisitos técnicos, campos necessários, fluxos de estado, integrações). É a **ponte** de engenharia de requisitos: deve ser a **primeira** a ser chamada pela **Skill Gerente** quando o usuário trouxer uma **ideia bruta de negócio** (ex.: "o membro paga a mensalidade e libera o acesso"). O output alimenta Entidades centrais, Integrações, Backend, Supabase e UX; garante que o desenvolvedor (e a IA) entendam o **valor de negócio** por trás de cada botão e de cada regra.

## Regra de ouro

- **Input:** rotina do dia a dia, dor do usuário, regra de negócio ou cobrança descrita em linguagem de negócio (ex.: "quando o contrato é assinado, o membro ganha acesso ao curso").
- **Output:** documento de requisitos técnicos (ou seção em doc existente) com: **o que** o sistema deve fazer; **quais campos/dados** são necessários; **fluxo de estados** (ex.: status do pedido, status do membro, status do contrato); **eventos** (ex.: pagamento confirmado → liberar acesso); **critérios de aceite** (condições para o processo ser considerado concluído com sucesso, para a QA testar). Tudo alinhado a [project-plan.md](.context/docs/project-plan.md) e data-flow.md.
- **Não implementa:** esta skill **não** cria tabelas, services nem telas; produz **especificação** que as outras skills usarão. Entidades centrais, Integrações, Backend, Supabase, UX e Frontend implementam.
- **Valor de negócio explícito:** cada requisito ou fluxo deve deixar claro **por que** existe (ex.: "botão 'Liberar acesso' existe porque o financeiro confirma o pagamento e o membro deve ver o conteúdo"; "campo status do membro existe para controlar se pode acessar o portal").

## Quando usar esta skill

- **Ideia bruta de negócio:** "precisamos que o membro pague a mensalidade e libere o acesso"; "quando o contrato for assinado, queremos disparar o onboarding"; "o mentor precisa ser notificado quando a tarefa está atrasada". A **Skill Gerente** deve acionar esta skill **primeiro** nesses casos.
- **Nova regra de processo** ou mudança em fluxo existente (ex.: nova etapa de aprovação, novo status de matrícula).
- **Dor do usuário** ou rotina que ainda não está no sistema: analisar e produzir requisitos (campos, estados, integrações) antes de qualquer implementação.
- **Dúvida** "o que o sistema precisa fazer para atender a esse processo?" ou "quais dados e estados são necessários?".

## Regras

- **Documentar o output:** requisitos técnicos em `.context/docs/` (ex.: novo doc `requisitos-<fluxo>.md` ou seção em project-plan/data-flow). A skill **Documentação** atualiza o índice; esta skill produz o **conteúdo** do requisito.
- **Alinhar ao modelo existente:** usar entidades centrais (membro/cliente, user_id) e contratos entre módulos (skill Integrações) já definidos; não inventar entidades duplicadas. Se o requisito exigir nova entidade ou novo contrato, indicar e deixar para Entidades centrais ou Integrações definir.
- **Estados e transições:** deixar explícito quais estados existem (ex.: pendente_pagamento, pago, acesso_liberado) e quais eventos ou ações causam a transição (ex.: webhook de pagamento → pago; job ou botão → acesso_liberado).
- **Registro progressivo:** decisões de formato de documento de requisitos (template, onde salvar) podem ser documentadas no [reference.md](reference.md).

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Template de documento de requisitos:** seções sugeridas (contexto de negócio, atores, fluxo, campos/dados, estados, eventos, integrações, regras de exceção, **critérios de aceite** para a QA testar).
- **Onde salvar:** convenção (ex.: `` ou seção em project-plan); referência ao índice (Documentação).
- **Exemplo:** de frase de negócio → requisitos técnicos (campos, tabela, trigger/evento).
- **Integração com outras skills:** o que esta skill entrega e quem consome (Entidades, Integrações, Backend, UX).

## Integração com outras skills

- **Skill Gerente:** aciona esta skill **primeiro** quando a entrada for ideia/dor de negócio ou processo novo. Depois: Consultoria (requisitos) → Entidades centrais / Integrações / UX / Backend / Supabase conforme o conteúdo do requisito.
- **Entidades centrais:** requisitos podem indicar necessidade de novo campo ou estado em membro/cliente; esta skill descreve o quê; Entidades define o modelo.
- **Integrações e vínculos:** requisitos podem indicar evento externo (ex.: pagamento, contrato assinado); esta skill descreve o fluxo; Integrações define o contrato (payload, quem consome).
- **Backend / Supabase / Frontend:** consomem o documento de requisitos para implementar (services, tabelas, telas). Esta skill não implementa.
- **UX / Designer:** pode usar o requisito (fluxo, atores, estados) para desenhar mockups e copy; Consultoria entrega "o que o sistema faz"; UX entrega "como a tela mostra".
- **Documentação:** novo doc de requisitos deve ser listado no índice (.context/docs/README.md); esta skill produz o conteúdo; Documentação mantém o índice.

## Referência adicional

- Template, onde salvar e exemplo: [reference.md](reference.md).
- Contexto de negócio e módulos: [project-plan.md](.context/docs/project-plan.md). Fluxo de dados: data-flow.md.
