---
name: kpi-backend
description: Owns the KPI F3F application layer in OOP. Services (use cases), Repositories (Supabase access), domain entities. Single pattern per module; dependency injection for testability. Use when creating or changing business logic, services, repositories, or Supabase integration in the application layer.
---

# KPI F3F Backend

Responsável pela **camada de aplicação** do KPI F3F: regras de negócio, serviços (casos de uso), repositórios (acesso a dados) e entidades de domínio. Stack e paradigma definidos em [project-plan.md](.context/docs/project-plan.md). O frontend e as API routes **chamam** essa camada; esta skill não mexe em tabelas nem RLS (skill Supabase) nem em telas (skill Frontend).

## Regra de ouro

- **Services (casos de uso)** → esta skill.
- **Repositories (acesso Supabase)** → esta skill.
- **Entidades de domínio** com comportamento quando fizer sentido → esta skill.
- **Esquema, RLS e migrations** → skill [KPI F3F Supabase / Engenheiro de dados](.claude/skills/kpi-supabase-data-engineer/SKILL.md).
- **Telas, rotas e componentes de UI** → skills [Frontend](.claude/skills/kpi-frontend/SKILL.md) e Componentes.

## Stack (aprovada)

- **Paradigma:** OOP (programação orientada a objetos) para domínio, regras de negócio e acesso a dados.
- **Camadas:** Entidades de domínio; Services (orquestram casos de uso); Repositories (encapsulam cliente Supabase).
- **Supabase:** cliente `@supabase/supabase-js` usado apenas dentro de Repositories (ou factory/infra); tipos gerados pela skill Supabase.
- **Testabilidade:** injeção de dependência (repositórios injetados em services) para permitir mocks em testes.
- **Linguagem:** TypeScript.

## Quando usar esta skill

- Criar ou alterar **services** (casos de uso) de um módulo.
- Criar ou alterar **repositories** (leitura/escrita no Supabase).
- Definir ou alterar **entidades de domínio** (Pessoa, membro, Contrato, etc.) com comportamento.
- Expor dados ou ações para o frontend (API routes, Server Actions) que delegam à camada de services.
- Integrar com **sistemas satélites** (ex.: receber evento "contrato assinado" e chamar service que matricula membro e dispara onboarding).
- Definir ou padronizar **contratos** entre módulos (quem chama qual service; DTOs de entrada/saída) – em conjunto com a skill Integrações quando houver.

## Regras

- **Um padrão por projeto:** estrutura de pastas e convenções de nomes únicas; ver [reference.md](reference.md). Novos módulos seguem o mesmo padrão.
- **Repositories encapsulam Supabase:** nenhum service importa o cliente Supabase diretamente; usa apenas o repositório injetado.
- **Services sem UI:** services não conhecem React nem componentes; recebem e retornam dados (tipos, DTOs com sufixo `Dto` em `src/lib/<modulo>/dtos/`).
- **Erros:** usar classe **AppError** (código + status HTTP); não lançar strings nem `Error` genérico. Ver [reference.md](reference.md).
- **Entidades centrais:** usar sempre por ID (`user_id`, `pessoa_id`/`member_id`); não duplicar cadastros; alinhar à skill Entidades centrais quando existir.
- **Registro progressivo:** ao adotar um padrão novo (ex.: formato de erro, base service, DTOs), documentar no [reference.md](reference.md) para todo o backend seguir.

## Estrutura de pastas (referência)

- `src/lib/<modulo>/` – services, repositories, entidades e DTOs (`dtos/`) do módulo.
- `src/lib/` ou `src/lib/` – entidades e tipos compartilhados entre módulos (ex.: Pessoa, membro) quando fizer sentido centralizar.
- `src/lib/` – cliente Supabase, factory de repositórios, config; não colocar regras de negócio aqui.
- Detalhes e exemplos de nomenclatura em [reference.md](reference.md) (neste diretório).

## Criar Service, Repository e Entity (script)

Para gerar a trindade de um módulo a partir da raiz do repositório:

```bash
bash .claude/skills/kpi-backend/scripts/create-layer.sh <modulo> <Entidade>
```

Ex.: `bash .claude/skills/kpi-backend/scripts/create-layer.sh educacional Matricula` gera `entities/Matricula.ts`, `repositories/MatriculaRepository.ts` e `services/MatriculaService.ts`. Em seguida ajustar tabela no repository e adicionar DTOs em `dtos/` conforme [reference.md](reference.md).

## Integração com outras skills

- **Supabase:** não criar tabelas nem RLS aqui; consumir tipos gerados e acessar dados via repositories. Esquema é responsabilidade da skill Supabase.
- **Frontend:** páginas e API routes chamam services (ou repositórios apenas em casos simples); esta skill define a interface (métodos, parâmetros, retorno).
- **Auth:** obter `user_id` da sessão (Supabase Auth) e passar para services quando a operação for por usuário; proteção de rotas é da skill Auth.
- **Integrações e vínculos:** quando houver comunicação entre módulos (APIs internas, eventos), esta skill implementa os services que expõem ou consomem; contratos podem ser documentados em conjunto com a skill Integrações.

## Referência adicional

- Estrutura de pastas, convenções (services, repositories, entidades), injeção de dependência e padrões adotados: [reference.md](reference.md) (neste diretório).
- Stack e paradigma: [project-plan.md](.context/docs/project-plan.md).
