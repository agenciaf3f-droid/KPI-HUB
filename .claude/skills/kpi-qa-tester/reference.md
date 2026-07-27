# Referência – KPI F3F QA / Tester

Cenários de teste baseados em regras de negócio, edge cases de formulários e padrões para Jest e Playwright. **Registro progressivo:** cenários E2E críticos e convenções de pasta podem ser documentados aqui quando definidos.

---

## Edge cases comuns em formulários

Usar como checklist ao verificar validação; os comportamentos esperados seguem a skill [Componentes](.context/skills/kpi-componentes/SKILL.md).

### CPF

- CPF inválido (dígitos verificadores errados).
- CPF com sequência inválida (ex.: 111.111.111-11).
- CPF com menos de 11 dígitos (ou mais).
- Campo vazio (obrigatório vs opcional conforme regra).
- Formato correto e válido (caso de sucesso).

### Data

- Data futura (quando o campo não deve aceitar).
- Data inválida (ex.: 31/02).
- Data em formato errado.
- Campo vazio (obrigatório vs opcional).
- Data válida no passado ou hoje (sucesso).

### Telefone

- Número incompleto (menos de 10 ou 11 dígitos).
- DDD inválido (ex.: 00).
- Campo vazio.
- Celular vs fixo (se a aplicação diferenciar).

### Moeda

- Valor negativo (quando não permitido).
- Campo vazio.
- Valor zero (quando não permitido).
- Valor válido (sucesso).

### Geral

- Campos obrigatórios vazios.
- Submit com um ou mais campos inválidos (formulário não deve submeter; mensagens de erro visíveis).
- Submit com todos os campos válidos (sucesso).

### Listas e filtros padronizados (DataTable, FiltroBuscaTexto, DateRangePicker)

Requisito e critérios de aceite: [requisitos-listas-e-filtros-padronizados.md](.context/docs/requisitos/requisitos-listas-e-filtros-padronizados.md).

- **FiltroBuscaTexto:** debounce 500 ms; ao mudar o termo, paginação (quando houver) reseta para página 1; Enter aplica busca na hora.
- **DateRangePicker:** presets pt-BR aplicam período correto; intervalo personalizado (from/to) envia YYYY-MM-DD; "usados recentemente" persiste no localStorage.
- **DataTable:** ordenação por coluna (clique no header alterna asc/desc); colunas redimensionáveis (arrastar borda); estados loading ("Carregando..."), empty ("Nenhum registro encontrado." + ação), erro (mensagem + "Tentar novamente").
- **Colunas:** visibilidade (menu Colunas) e persistência no localStorage (chave por módulo); após refresh, configuração mantida.
- **Integração:** toda listagem usa DataTable + BarraFiltrosPadrao + useColunasPersistidas; nenhum `<table>` próprio por módulo.

---

## Cenários E2E (Playwright) – exemplos

Baseados nas regras de negócio do [project-plan](.context/docs/project-plan.md) e [data-flow](.context/docs/data-flow.md).

### Fluxo de matrícula completo (exemplo)

- Acessar aplicação (e fazer login se rotas forem protegidas).
- Navegar até o fluxo de matrícula (ex.: Comercial → cliente → contrato ou tela de matrícula).
- Preencher dados obrigatórios com valores válidos (ou usar dados de teste).
- Submeter e verificar que o resultado esperado aparece (ex.: mensagem de sucesso, redirecionamento, aluno criado).
- (Opcional) Verificar que usuário não autenticado é redirecionado para login quando aplicável.

### Fluxo login → área protegida

- Acessar rota protegida sem sessão → redirect para login.
- Fazer login com credenciais de teste → redirect para área protegida ou home.
- Logout → redirect para login ou público.

### Fluxo contrato assinado → onboarding (quando implementado)

- Simular ou receber evento de contrato assinado (conforme sistema satélite).
- Verificar que o aluno aparece na área do Guia do Aluno ou que o onboarding foi disparado (conforme regra de negócio).

Cenários críticos adotados pelo projeto podem ser listados aqui (registro progressivo).

---

## Casos de teste unitários para Services (Jest)

- **Objetivo:** cobrir regras de negócio e edge cases do service sem chamar Supabase real.
- **Padrão:** injetar mocks dos repositories no service; testar retornos, exceções e chamadas esperadas aos repositories.
- **Exemplo de cenários para um Service de cálculo financeiro:**
  - Cálculo com valores válidos → resultado correto.
  - Valores negativos ou zero (quando não permitidos) → erro ou valor tratado conforme regra.
  - Valores que geram arredondamento → resultado conforme regra (ex.: 2 casas decimais).
  - Dependência (ex.: repositório) retorna vazio ou erro → service propaga ou trata conforme contrato.
  - Chamada ao repository com parâmetros corretos (ex.: user_id, org_id quando aplicável).

---

## Convenção de pastas (definida)

| Tipo | Local | Exemplo |
|------|--------|---------|
| **Unitários (Jest/RTL)** | Arquivo `.spec.ts` ao lado do arquivo de código | `src/modules/educacional/services/MatriculaService.spec.ts` |
| **E2E (Playwright)** | Pasta `tests/e2e/` na raiz do projeto | `tests/e2e/matricula.spec.ts`, `tests/e2e/login.spec.ts` |

- **Unitários:** preferir sempre o mesmo diretório do código (colocation); exceção: `__tests__/` no módulo quando o time adotar.
- **E2E:** todos os specs Playwright em `tests/e2e/`; subpastas por fluxo (ex.: `tests/e2e/auth/`, `tests/e2e/matricula/`) quando fizer sentido.

---

## Playwright – convenções

- **Localização:** `tests/e2e/` na raiz (ver tabela acima).
- **Auth em E2E:** usar bypass ou usuário de teste conforme [skill Auth e Rotas](.context/skills/kpi-auth-rotas/SKILL.md).
- **Comando:** `npx playwright test` ou script `npm run test:e2e` quando configurado no `package.json`.

---

## Jest / RTL – convenções

- **Padrão de nome:** `*.spec.ts`, `*.spec.tsx` (ou `*.test.ts` / `*.test.tsx`).
- **Onde colocar:** ao lado do arquivo testado (ex.: `PessoaService.spec.ts` ao lado de `PessoaService.ts` em `src/modules/<modulo>/services/`).
- **Mocks:** repositórios e clientes externos mockados; não depender de banco ou API real nos unitários.

---

## Registro progressivo

| Item | Status | Descrição |
|------|--------|------------|
| **Pasta unitários** | Definido | `.spec.ts` ao lado do código (ex.: `src/**/*.spec.ts`). |
| **Pasta E2E** | Definido | `tests/e2e/` na raiz. |
| **Comando E2E** | A definir | Ex.: `npm run test:e2e` (quando configurar no package.json). |
| **Bypass auth E2E** | Ver skill Auth e Rotas | Header ou config para Playwright. |
| **Fluxos E2E críticos** | A definir | Lista de fluxos que devem ter script (ex.: matrícula, login, onboarding). |

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – regras de negócio e fluxos.
- [data-flow.md](.context/docs/data-flow.md) – entidades e integração.
- [testing-strategy.md](.context/docs/testing-strategy.md) – estratégia de testes do KPI F3F.
- [KPI F3F Componentes](.context/skills/kpi-componentes/SKILL.md) – specs de campos (CPF, telefone, data, moeda).
- [KPI F3F Auth e Rotas](.context/skills/kpi-auth-rotas/SKILL.md) – bypass auth para E2E.
