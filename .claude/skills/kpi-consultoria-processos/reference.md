# Referência – KPI F3F Consultoria / Analista de Processos

Template de requisitos, onde salvar e exemplo negócio → técnico. **Registro progressivo:** convenções de documento e pasta podem ser documentadas aqui.

---

## Template de documento de requisitos

Cada fluxo ou processo analisado pode gerar um documento (ou seção) com:

| Seção | Conteúdo |
|-------|----------|
| **Contexto de negócio** | Por que isso existe; dor do usuário ou regra de negócio; valor esperado. |
| **Atores** | Quem participa (aluno, mentor, financeiro, sistema externo). |
| **Fluxo (passos)** | Passos em linguagem de negócio; depois equivalente em "o que o sistema faz" (ex.: "Financeiro confirma pagamento" → "Update em financeiro_transacoes; disparar evento ou atualizar status do aluno"). |
| **Campos / dados necessários** | Quais dados o sistema precisa (ex.: status do aluno, data de liberação, vínculo pagamento–matrícula). Indicar se já existem nas entidades centrais ou se é novo. |
| **Estados e transições** | Estados possíveis (ex.: pendente_pagamento, pago, acesso_liberado) e o que causa cada transição (evento, ação do usuário, job). |
| **Eventos / integrações** | Se há sistema externo (pagamento, contrato): evento recebido, payload esperado, quem no KPI F3F consome. Alinhar à skill Integrações para contrato formal. |
| **Regras de exceção** | O que fazer em caso de estorno, cancelamento, atraso; validações (ex.: não liberar acesso se matrícula cancelada). |
| **Critérios de aceite** | Lista de condições que devem ser verdadeiras para o processo ser considerado concluído com sucesso (ex.: "O aluno deve receber o e-mail de boas-vindas após o status mudar para ativo"). A skill **QA / Tester** usa essa lista para definir cenários de teste e validar que o processo foi atendido. |

---

## Onde salvar

- **Opção 1:** um arquivo por fluxo em `.context/docs/requisitos/` (ex.: `requisitos-liberacao-acesso-pagamento.md`). Listar no [.context/docs/README.md](.context/docs/README.md) (Documentação).
- **Opção 2:** seção ou anexo em [project-plan.md](.context/docs/project-plan.md) ou [data-flow.md](.context/docs/data-flow.md) quando o fluxo for central ao projeto.
- **Regra:** todo documento novo em `.context/docs/` deve ser **adicionado ao índice** (skill Documentação). Esta skill produz o conteúdo; não esquecer de pedir atualização do índice ao criar novo arquivo.

---

## Exemplo: negócio → técnico

**Input (negócio):**  
"O aluno paga a mensalidade e aí liberamos o acesso ao curso."

**Output (requisitos técnicos):**

- **Contexto:** Liberar acesso ao conteúdo do curso somente após confirmação de pagamento da mensalidade (valor de negócio: evitar acesso sem pagamento).
- **Atores:** Aluno, sistema de pagamento (satélite), módulo Financeiro, módulo Educacional.
- **Fluxo:**  
  1. Aluno tem matrícula e mensalidade gerada (Financeiro).  
  2. Pagamento confirmado (webhook ou atualização manual pelo financeiro).  
  3. Sistema atualiza status da transação e, em seguida, atualiza estado do aluno (ex.: `acesso_liberado = true` ou status equivalente).  
  4. Educacional/Portais passam a exibir conteúdo conforme esse estado.
- **Campos/dados:** `financeiro_transacoes` (ou equivalente) com status; vínculo transação–aluno/matrícula; campo ou tabela de estado do aluno (acesso liberado por curso/período). Usar `aluno_id`/`user_id` (entidades centrais).
- **Estados:** ex.: `pendente` → `pago` (transação); `sem_acesso` → `acesso_liberado` (aluno para aquele curso/período). Transição: evento "pagamento confirmado" ou ação "Confirmar pagamento" (financeiro).
- **Eventos/integrações:** Se pagamento for externo: webhook ou API com payload (identificador do aluno/matrícula, valor, status). Contrato documentado na skill Integrações; Backend implementa o handler que atualiza transação e dispara liberação de acesso.
- **Exceção:** Se matrícula for cancelada depois, revogar acesso (regra a detalhar).
- **Critérios de aceite:** Transação com status `pago`; aluno com estado de acesso liberado para o curso/período; conteúdo do curso visível no portal para esse aluno; (opcional) aluno recebe e-mail de confirmação ou boas-vindas após liberação. QA usa esses critérios para cenários de teste (unitários e E2E).

---

## O que esta skill entrega e quem consome

| Entrega | Consumidor |
|---------|------------|
| Requisitos (documento) | Todas as skills de implementação (leem o doc). |
| Campos e entidades sugeridos | Entidades centrais (valida modelo); Supabase (cria tabelas). |
| Eventos e integrações | Integrações e vínculos (contrato); Backend (implementar handler). |
| Fluxo e estados | Backend (services, máquina de estados); UX (telas, copy); Frontend (implementar). |
| Critérios de aceite | QA / Tester (cenários de teste; validar que o processo foi atendido com sucesso). |

Esta skill **não** implementa; só especifica. A Gerente usa o output para acionar na ordem correta: Entidades, Integrações, UX, Backend, Supabase, Frontend.

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – contexto de negócio e módulos.
- [data-flow.md](.context/docs/data-flow.md) – fluxo de dados e integração.
- [KPI F3F Integrações e vínculos](.context/skills/kpi-integracoes-vinculos/SKILL.md) – contratos e sistemas satélites.
- [KPI F3F Entidades centrais](.context/skills/kpi-entidades-centrais/SKILL.md) – modelo de pessoa/aluno e usuário.
