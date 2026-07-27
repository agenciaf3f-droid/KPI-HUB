# Referência – KPI F3F Limpeza de código

Critérios e checklist para identificar código morto, duplicação e lixo. **Registro progressivo:** exceções ou regras adotadas pelo projeto (ex.: "não remover X") podem ser anotadas ao final.

---

## Código morto

### O que considerar morto

- **Exports não usados:** função, componente ou constante exportada que nenhum arquivo importa. Para identificar de forma programática, use **knip**: `npx knip` (projeto todo) ou `npx knip --directory src/modules/<modulo>` (um módulo). Script de conveniência: `bash .cursor/skills/kpi-limpeza-codigo/scripts/find-dead-code.sh [diretório]`. Verificar exceções abaixo antes de remover.

**Configuração do knip:** em monorepos ou quando houver muitos falsos positivos (ex.: entry points dinâmicos, libs que o knip não resolve), criar `knip.json` na raiz com entry points e `ignore`/`ignoreDependencies` conforme [documentação do knip](https://knip.dev/reference/configuration). O comando continua sendo `npx knip`; a config apenas refina o que é considerado usado.
- **Funções/ métodos nunca chamados:** inclusive em classes; se só há definição e nenhuma chamada, candidato a remoção.
- **Arquivos órfãos:** arquivo que não é importado por nenhum outro (ex.: componente antigo substituído, util abandonado). Cuidado com entry points (ex.: `src/app/page.tsx`) e arquivos carregados por nome dinâmico ou configuração.
- **Branches inacessíveis:** `if (false)`, `switch` com case que nunca é atingido (após refatoração anterior).
- **Parâmetros não usados:** em funções; pode remover ou prefixar com `_` se for obrigatório manter a assinatura (ex.: callback).

### Quando NÃO remover (ou confirmar antes)

- Código usado via **string dinâmica** (ex.: `import(modulo)` com variável) ou **reflection**.
- Código **comentado** com indicação explícita de "manter por enquanto" ou referência a ticket; perguntar ao time.
- **Exports** que podem ser usados por outro repositório, lib publicada ou contrato externo; verificar antes.
- **Stubs** ou implementações vazias mantidas de propósito para interface (ex.: método obrigatório de interface ainda não implementado).

---

## Duplicação

- **Lógica repetida:** mesmo bloco de código (validação, formatação, chamada a API) em dois ou mais arquivos → candidato a extrair para função em `shared/` ou para service/repository (conforme skill Backend ou Componentes).
- **Componentes muito parecidos:** dois componentes que fazem quase a mesma coisa → unificar com props ou extrair para componente compartilhado (skill Componentes se for UI).
- **Tipos/interfaces iguais:** definir em um único lugar (`types.ts`, `shared/types`) e importar onde precisar.
- **Constantes repetidas:** extrair para `constants.ts` ou config compartilhada.

---

## Reaproveitamento

- Ao extrair código para **shared**: colocar em `src/shared/` (ou equivalente do projeto); seguir nomenclatura e estrutura das skills Frontend, Componentes e Backend.
- **Hooks** duplicados → `src/shared/hooks/`.
- **Utilitários** (formatação, validação) → `src/shared/utils/` ou similar.
- **Componentes UI** reutilizáveis → skill Componentes (registrar no reference dela se for novo padrão).

---

## Lixo e ruído

- **Comentários obsoletos:** comentários que descrevem código que já mudou ou que não acrescentam informação; remover.
- **Código comentado** sem justificativa (ex.: "TODO", "reverter depois") → remover se não houver ticket ou aviso; caso contrário, deixar ou substituir por TODO com referência.
- **console.log / console.debug** deixados no código → remover (ou trocar por logger configurável se o projeto tiver).
- **Imports não usados** → remover (lint geralmente aponta).
- **Comentários em inglês/português misturados** sem necessidade: padronizar para pt-BR conforme AGENTS.md, se for só limpeza de comentário.

---

## Refatoração

- **Sem mudar comportamento:** refatorar estrutura (extrair função, renomear, reorganizar) mantendo o resultado igual; rodar testes após.
- **Nomenclatura:** nomes claros e consistentes com o resto do projeto (ver convenções nas skills de Backend, Frontend, Componentes).
- **Tamanho:** funções/componentes muito longos podem ser quebrados em menores; manter responsabilidade única.
- Se a refatoração for grande (muitos arquivos, mudança de contrato), considerar fazer em passos e documentar ou avisar no PR.

---

## Exceções e regras do projeto (registro progressivo)

Preencher quando o time definir algo específico (ex.: "não remover arquivo X porque é usado por script Y").

| Regra / Exceção | Descrição |
|-----------------|------------|
| *(vazio por enquanto)* | Adicionar aqui quando houver. |

---

## Links

- [AGENTS.md](AGENTS.md) – convenções e idioma (pt-BR).
- [project-plan.md](.context/docs/project-plan.md) – estrutura e stack.
- Skill **Organizar repositório** – quando existir, para movimentação de arquivos e pastas.
