# Referência – KPI F3F Backend (camada de aplicação)

Documento **progressivo**: padrões adotados (ex.: DTOs, tratamento de erro, base service) podem ser documentados aqui na medida em que forem definidos.

---

## Estrutura de pastas (padrão)

- **`src/modules/<modulo>/`** – por módulo (comercial, educacional, estoque, etc.):
  - `services/` – classes de serviço (casos de uso).
  - `repositories/` – classes que encapsulam acesso ao Supabase.
  - `entities/` ou `types/` – entidades ou tipos específicos do módulo (quando não forem compartilhados).
  - `dtos/` – DTOs de entrada/saída do módulo (sufixo `Dto`).
- **`src/shared/` ou `src/domain/`** – entidades e tipos compartilhados (ex.: Pessoa, Aluno) quando usados por mais de um módulo.
- **`src/infra/`** – cliente Supabase, criação de repositórios, config; sem regras de negócio.

Nomenclatura de arquivos: `PessoaService.ts`, `PessoaRepository.ts`, `Pessoa.ts` (entidade). Um service ou repository por arquivo.

---

## Convenções de nomenclatura

- **Services:** sufixo `Service` (ex.: `AlunoService`, `ContratoService`). Métodos que exprimem ação ou caso de uso (ex.: `matricularAluno`, `buscarPorId`).
- **Repositories:** sufixo `Repository` (ex.: `PessoaRepository`, `AlunoRepository`). Métodos que exprimem acesso a dados (ex.: `findById`, `insert`, `update`).
- **Entidades:** nome do domínio (ex.: `Pessoa`, `Aluno`, `Contrato`). Podem ter métodos de comportamento quando fizer sentido (ex.: `pessoa.estaComoAluno()`).
- **Módulos:** nome em minúsculo, singular ou conforme convenção do projeto (ex.: `comercial`, `educacional`).

---

## Repositories e Supabase

- O **cliente Supabase** é instanciado em `src/infra/` (ou recebido por factory). Repositories recebem o cliente (ou uma interface) no construtor.
- Repositories **não** expõem o cliente; apenas métodos que retornam dados ou executam operações (insert, update, delete, select).
- Usar **tipos gerados** pelo Supabase (skill Supabase / `generate_typescript_types`) para tipar retornos e parâmetros quando possível.
- RLS é aplicado pelo Supabase conforme políticas definidas na skill Supabase; o repository usa o cliente já configurado (ex.: com sessão do usuário quando necessário).

---

## Services e injeção de dependência

- Services recebem **repositories** (e eventualmente outros services) pelo construtor. Não instanciam repositórios diretamente no código do service (facilita testes com mocks).
- Services orquestram: validações, chamadas a um ou mais repositórios, regras de negócio, e retornam dados ou lançam erros tipados.
- Exemplo de assinatura: `constructor(private readonly pessoaRepository: PessoaRepository)` (ou equivalente em TypeScript).

---

## Padrões adotados (registro progressivo)

| Padrão | Status | Descrição / Referência |
|--------|--------|------------------------|
| **DTOs de entrada/saída** | Definido | Sufixo **Dto**. Local: `src/modules/<modulo>/dtos/`. Ex.: `MatricularAlunoDto`. Dados que entram no service (entrada de API ou de outro módulo) devem ser tipados com DTOs. |
| **Tratamento de erro** | Definido | Usar classe **AppError** com código e status HTTP (ver seção abaixo). Não lançar strings nem `Error` genérico. |
| **Base service / Base repository** | A definir | Avaliar após o primeiro módulo piloto. |

---

## Chatbot – auditorias (chat-tools)

O chatbot usa tools em `src/modules/chatbot/services/chat-tools.ts` para consultar dados. A tool `auditar_campo` é **genérica**: aceita qualquer campo do catálogo `CAMPOS_AUDITAVEIS`.

**Regra:** sempre que um novo campo for adicionado em pessoas, educacional_matriculas ou pessoa_redes_sociais (Supabase) e for relevante para auditoria via chat (ex.: "quantos sem X?"), incluir em `CAMPOS_AUDITAVEIS` e ajustar a lógica em `auditarCampo` se a origem for outra tabela (como instagram em pessoa_redes_sociais). Não criar tool nova.

Ver `.context/docs/chatbot/ESTRATEGIA-AUDITORIAS-E-CONSULTAS.md`.

---

## DTOs

- **Nomenclatura:** sufixo `Dto` (ex.: `MatricularAlunoDto`, `CriarContratoDto`).
- **Local:** `src/modules/<modulo>/dtos/`.
- **Uso:** tipar parâmetros de entrada dos services e, quando conveniente, o retorno de operações expostas à API ou a outros módulos.

---

## Tratamento de erro (AppError)

Usar uma classe base para erros da camada de aplicação, com código e status HTTP, em vez de strings ou `Error` genérico. Local sugerido: `src/shared/errors/AppError.ts` (ou `src/domain/errors/`).

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- **code:** identificador estável para o cliente (ex.: `PESSOA_NAO_ENCONTRADA`, `DOCUMENTO_DUPLICADO`).
- **status:** HTTP status (400, 404, 409, 422, etc.). Services lançam `AppError`; rotas de API convertem em resposta com o mesmo status e corpo padronizado (ex.: `{ code, message }`).

---

## Entidades centrais (lembrete)

- **Pessoa** (cliente/aluno): uma única entidade; referenciar por ID em todos os módulos.
- **Usuário** (Auth + perfil): `user_id` para operações vinculadas ao logado.
- Services e repositories que tocam em pessoa ou aluno devem usar sempre o mesmo identificador (ex.: `pessoa_id`, `aluno_id`) e não criar cadastros duplicados. Alinhar à skill Entidades centrais quando existir.

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – stack e paradigma (OOP, camadas).
- [KPI F3F Supabase / Engenheiro de dados](.context/skills/kpi-supabase-data-engineer/SKILL.md) – esquema, RLS, tipos gerados.
- [data-flow.md](.context/docs/data-flow.md) – fluxo de dados e entidades compartilhadas.
