---
name: kpi-qa-tester
description: "QA and testing for KPI F3F (Guardian of Stability). Test scenarios from business rules; Jest and React Testing Library for unit and component tests; Playwright for E2E; validation and edge cases in forms (CPF, dates, etc.). Use when creating E2E scripts, unit test cases for services, or verifying validation and edge cases in forms."
---

# KPI F3F QA / Tester (Guardião da Estabilidade)

Especialista em **cenários de teste** baseados nas **regras de negócio** do KPI F3F. Cria e mantém testes unitários (Jest, React Testing Library), E2E (Playwright) e verifica validação e edge cases em formulários. O plano define Jest e Playwright ([project-plan.md](.context/docs/project-plan.md)); esta skill garante que testes existam e que nada quebre antes do merge.

## Regra de ouro

- **Scripts E2E (Playwright)** para fluxos críticos (ex.: fluxo de matrícula completo) → esta skill.
- **Casos de teste unitários** para services e regras de negócio (Jest) → esta skill.
- **Validação e edge cases** em formulários (CPF inválido, data futura, campos obrigatórios, etc.) → esta skill.
- **Cenários derivados das regras de negócio** (project-plan, data-flow, lógica dos módulos) → esta skill.
- **Não substitui** a escrita de código de produção (Backend, Frontend, Componentes); garante que o que foi escrito está coberto e estável.

## Quando usar esta skill

- Pedidos como: *"Crie um script Playwright para testar o fluxo de matrícula completo"* → E2E com Playwright.
- Pedidos como: *"Gere casos de teste unitários para este novo Service de cálculo financeiro"* → Jest (e RTL se houver UI) para o service.
- Pedidos como: *"Verifique se o formulário valida todos os edge cases (CPF inválido, data futura, etc.)"* → cenários de validação e testes para os campos padronizados (CPF, telefone, data, moeda) conforme [reference.md](reference.md) e skill Componentes.
- Definir ou expandir **cenários de teste** para um módulo ou fluxo com base no [project-plan](.context/docs/project-plan.md) e no [data-flow](.context/docs/data-flow.md).
- Garantir que **novas features** tenham teste correspondente (AGENTS.md: toda feature nova com arquivo de teste).
- **Pre-PR:** rodar `npm run build && npm run test` e corrigir falhas antes do merge.

## Stack de testes (projeto)

- **Unitários e componentes:** Jest + React Testing Library. **Local:** arquivo `.spec.ts` ao lado do código (ex.: `src/modules/educacional/services/MatriculaService.spec.ts`).
- **E2E:** Playwright (rápido, boa integração CI). **Local:** pasta `tests/e2e/` na raiz (ex.: `tests/e2e/matricula.spec.ts`).
- **Comando:** `npm run test`; watch: `npm run test -- --watch`. Pre-PR: `npm run build && npm run test`.

## Regras

- **Cenários baseados em regras de negócio:** consultar [project-plan.md](.context/docs/project-plan.md) e [data-flow.md](.context/docs/data-flow.md) para fluxos (ex.: cliente → contrato assinado → aluno → onboarding; tarefas e mentores). Testes E2E devem cobrir esses fluxos; unitários devem cobrir services que implementam essas regras.
- **Edge cases de formulário:** usar as especificações da skill [Componentes](.context/skills/kpi-componentes/SKILL.md) (CPF, telefone, data, moeda) para definir casos inválidos e limites; listar no [reference.md](reference.md) os edge cases comuns (CPF inválido, data futura, campo vazio, etc.).
- **Onde colocar testes:** unitários ao lado do código (`.spec.ts` junto ao arquivo); E2E em `tests/e2e/`. Ver [reference.md](reference.md) – Convenção de pastas.
- **Dados de teste:** usar seeds ou dados de teste; nunca dados reais de produção ([testing-strategy.md](.context/docs/testing-strategy.md)).
- **E2E e auth:** se o projeto usar bypass de auth para E2E (skill Auth e Rotas), usar o header/config documentado na skill Auth e Rotas para os testes Playwright.

## Tipos de tarefa (resumo)

| Pedido / contexto | Ação |
|-------------------|------|
| Script Playwright para fluxo X | Criar teste E2E em Playwright cobrindo o fluxo completo (login se necessário, passos, asserts). |
| Casos de teste unitários para Service Y | Gerar testes Jest para o service (mocks de repository; cobrir regras de negócio e edge cases). |
| Verificar validação / edge cases em formulário | Listar edge cases (CPF inválido, data futura, etc.) e criar testes (RTL ou Jest) que verifiquem que o formulário rejeita/valida corretamente. |

Detalhes e exemplos de edge cases no [reference.md](reference.md) (neste diretório).

## Integração com outras skills

- **Componentes:** specs de CPF, telefone, data, moeda definem o que deve ser validado; esta skill escreve os testes que verificam esse comportamento.
- **Backend:** testes unitários dos services usam mocks dos repositories (injeção de dependência); não chamar Supabase real nos unitários salvo teste de integração combinado.
- **Auth e Rotas:** E2E pode precisar de bypass de auth ou de usuário de teste; seguir o padrão documentado na skill Auth e Rotas.
- **Frontend:** testes de componente (RTL) para formulários e telas; esta skill adiciona os casos de validação e edge cases.

## Referência adicional

- Edge cases comuns (CPF, data, etc.), exemplos de cenários E2E e unitários, e checklist: [reference.md](reference.md) (neste diretório).
- Estratégia de testes do projeto: [testing-strategy.md](.context/docs/testing-strategy.md).
