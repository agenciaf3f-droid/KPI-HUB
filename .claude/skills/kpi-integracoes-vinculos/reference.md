# Referência – KPI F3F Integrações e vínculos

Padrões de vínculo entre módulos, contratos e sistemas satélites. **Registro progressivo:** cada integração ou satélite adotado deve ser listado aqui (e em data-flow quando for fluxo de dados).

**Documento oficial que esta skill mantém atualizado:** [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md). Esse doc é **mutável**: sempre que um módulo for implementado ou uma integração for definida, a skill Integrações e vínculos atualiza esse documento com: quem fala com quem, quais campos fazem a integração, quais campos são comuns entre módulos, e a tabela de módulos e vínculos. A skill Documentação mantém o índice e "Onde buscar"; esta skill é responsável pelo **conteúdo** do doc de integração.

---

## Padrões de vínculo (aluno_id, user_id, pessoa_id)

- **Entidade única:** Pessoa (cliente/aluno) é uma só; módulos referenciam por `pessoa_id` ou `aluno_id` conforme o modelo. Usuário (Auth) por `user_id`.
- **Sem duplicar cadastro:** Comercial não cria "seu" aluno; Educacional não cria "seu" aluno; ambos usam o mesmo registro de pessoa/aluno e referenciam por ID.
- **Tabelas por módulo:** cada módulo pode ter tabelas próprias (ex.: `comercial_contratos`, `educacional_matriculas`) com FK para `aluno_id` ou `pessoa_id`; acesso entre módulos via leitura nas tabelas permitidas por RLS ou via API interna quando definido.
- **Quem pode acessar o quê:** regra geral: módulo acessa suas próprias tabelas e tabelas centrais (pessoa, aluno, perfil) conforme RLS. Acesso à tabela de **outro** módulo só se houver contrato explícito (ex.: Educacional pode ler `comercial_contratos` para saber se contrato foi assinado) e RLS/visão que permita. Documentar no contrato.

---

## Campos de integração e campos comuns entre módulos

- **Campos de integração:** são os que **ligam** um módulo ao outro (ou à entidade central). Ex.: `pessoa_id`, `aluno_id`, `user_id` em tabelas de módulo; ao definir uma integração, esta skill documenta no [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md) e aqui quais campos fazem a ponte.
- **Campos comuns entre módulos:** são os que **vários módulos usam** (ex.: nome, email, telefone em pessoa; status de contrato lido por Comercial e Educacional). Ficam em tabelas centrais ou em tabelas de um módulo com contrato de leitura pelo outro; esta skill define o que é comum e onde vive, e registra no doc de integração.
- Ao implementar cada módulo novo, atualizar o doc de integração com: (1) tabela "Módulos e vínculos"; (2) campos de integração usados por esse módulo; (3) campos comuns que ele consome ou expõe.

---

## Contratos entre módulos

Para cada integração entre dois módulos (ou entre satélite e KPI F3F), registrar:

| Campo | Descrição |
|-------|-----------|
| **De / Para** | Ex.: "Comercial → Educacional" ou "Sistema Contratos (satélite) → KPI F3F". |
| **Gatilho** | O que inicia (ex.: contrato assinado; usuário clica em 'Matricular'). |
| **Dados** | O que é enviado (ex.: aluno_id, contract_id, payload do webhook). |
| **Quem consome no KPI F3F** | Service ou rota (ex.: MatriculaService.registrarAlunoPorContratoAssinado). |
| **Onde documentar** | data-flow.md, este reference, ou ADR. |

Exemplo (Contratos → KPI F3F):

- **De/Para:** Sistema de Contratos (satélite) → KPI F3F.
- **Gatilho:** Contrato assinado (webhook ou polling).
- **Dados:** contract_id, pessoa_id (ou aluno_id), status "signed", metadados acordados.
- **Consumidor KPI F3F:** API route ou Edge Function que chama service (ex.: AlunoService.ativarAlunoPorContrato + disparar onboarding).
- **Documentar em:** data-flow.md (seção Fontes externas) e neste reference (tabela de satélites).

---

## Sistemas satélites (registro progressivo)

Listar cada sistema externo que envia dados ou eventos para o KPI F3F.

| Satélite | Evento / Entrada | Payload (resumo) | Consumidor no KPI F3F | Status |
|----------|------------------|------------------|-------------------|--------|
| **Contratos** | Contrato assinado | contract_id, pessoa_id, status | Service que matricula aluno e dispara onboarding (Guia do Aluno) | Definido no project-plan; implementar quando houver rota. |
| *(outros)* | | | | Preencher quando adotar. |

---

## APIs internas (módulo → módulo)

Quando **não** bastar ler no mesmo banco (ex.: necessidade de lógica encapsulada ou serviço em outro processo):

- **Contrato:** método (GET/POST), path (ex.: `/api/internal/alunos/:id/dados-comercial`), request/response (DTO), quem pode chamar (auth: service key, ou mesmo processo).
- **Implementação:** Backend (service + rota); esta skill mantém o contrato documentado.
- **Quando evitar:** se o módulo B só precisa ler dados que já estão em tabela acessível por RLS, preferir leitura direta (repository) em vez de API interna; reduz acoplamento e latência.

Registrar APIs internas aqui quando forem criadas (nome, path, propósito, consumidor).

---

## Onde documentar

- **Documento principal (obrigatório esta skill atualizar):** [integracao-e-vinculos-modulos.md](.context/docs/integracao-e-vinculos-modulos.md) – tabela de módulos e vínculos; quem fala com quem; campos de integração e campos comuns; atualizar sempre que um módulo for implementado ou uma integração for definida.
- **Fluxo de dados geral (quem lê/escreve o quê):** [data-flow.md](.context/docs/data-flow.md) – seção Integração entre módulos e Fontes e destinos externos.
- **Contrato detalhado (payload, rota, service):** este reference (tabelas acima) ou ADR se for decisão de arquitetura.
- **Novo satélite ou nova API interna:** adicionar na tabela correspondente neste reference; atualizar o doc integracao-e-vinculos-modulos.md (tabela e vínculos); atualizar data-flow se alterar fluxo geral.

---

## Links

- [data-flow.md](.context/docs/data-flow.md) – fluxo de dados e integração.
- [project-plan.md](.context/docs/project-plan.md) – sistemas satélites (seção 3).
- [architecture.md](.context/docs/architecture.md) – princípios e componentes do HUB.
- [KPI F3F Backend](.context/skills/kpi-backend/SKILL.md) – implementação de services e rotas.
