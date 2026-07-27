# Referência – SGT ClickUp PM

Guia de execução, estratégia de quebra de tarefas e padrões de status.

---

## 1. Estrutura ClickUp (SGT Standard)

A skill assume que o ambiente ClickUp segue este padrão:

**Hierarquia:**
- **Folder:** SGT - SISTEMA GLOBAL TECH
- **Listas:** Uma por Módulo (ex.: EDUCACIONAL, FINANCEIRO, GESTÃO DE PESSOAS, BANCO DE DADOS).

**Status das Listas (Workflow):**
| Status ClickUp | Cor | Uso |
|----------------|-----|-----|
| `BACKLOG` | Cinza | Ideia / Futuro |
| `A FAZER` | Azul | Próxima Sprint |
| `EM DESENVOLVIMENTO` | Amarelo | Codando agora |
| `EM REVISÃO` | Roxo | Code Review / QA |
| `CONCLUÍDO` | Verde | Produção |

**Campos Personalizados (Custom Fields) – workspace SGT:**

Usar `clickup_get_custom_fields` na lista da task se IDs mudarem. Valores abaixo são os **mais usados** (validados em tasks da pasta PLATAFORMA EDUCACIONAL / PE - ERROS):

| Campo | field id | Uso |
|-------|----------|-----|
| **Tipo de Tarefa** (labels) | `b1f1be2e-d5a9-4ad5-9e66-6bc374b854bc` | `fix`, `Feature`, `refatpração`, `Infra`, `integração`, `documentação` (usar **id da opção**, não só o texto) |
| **Tipo de demanda** (dropdown) | `af5ebd3c-6b4d-455f-ba09-a8e60180b937` | `Educacional`, `SAAS`, `Interna`, `Serviço` |
| **Urgência** | `52c862e1-6109-4690-ba07-2fa5d37509f9` | `Baixa`, `Média`, `Alta` |
| **Departamento Solicitante** | `6803aaf7-de7c-4a5b-94fc-056598b3ab78` | ex.: `Operações`, `Produto` |
| **Link de Evidência** | `b368edad-4347-4be5-aeee-08fdcab5faa1` | URL da tela, preview ou rota (`/educacional/formularios`, link público do form) |
| **Responsável para Contato** | `86f3fe22-a440-4fcc-8c69-3ae3940e86fc` | user id de quem reportou (ex.: Denis) |

**Exemplo – Tipo de Tarefa = fix** (label id `cc7042e8-2955-4abd-b4a9-4a0621f4a4a4`):

```json
"custom_fields": [
  { "id": "b1f1be2e-d5a9-4ad5-9e66-6bc374b854bc", "value": ["cc7042e8-2955-4abd-b4a9-4a0621f4a4a4"] },
  { "id": "af5ebd3c-6b4d-455f-ba09-a8e60180b937", "value": "03206e27-b057-4989-b86e-eb4440d1afda" }
]
```

(`03206e27-…` = opção **Educacional** em Tipo de demanda.)

---

## 2. Integração MCP ClickUp e tools disponíveis

A skill usa o **MCP oficial do ClickUp** para comunicação com o board. No Cursor, o integração aparece como **"clickup"** (ou `user-clickup` no contexto do agente).

**Configuração do MCP:**
- **URL do servidor:** `https://mcp.clickup.com/mcp`
- **Comando de configuração (Cursor):** `npx -y mcp-remote https://mcp.clickup.com/mcp`

**Tools disponíveis (nome exato para invocação):** tabela resumida abaixo. **O que cada uma faz** (definição e exemplo de uso para o assistente) está na subseção seguinte.

| Categoria | Tool |
|-----------|------|
| **Busca** | `clickup_search` |
| **Hierarquia** | `clickup_get_workspace_hierarchy` |
| **Tarefas** | `clickup_create_task`, `clickup_get_task`, `clickup_update_task`, `clickup_create_bulk_tasks`, `clickup_update_bulk_tasks` |
| **Anexos e tags** | `clickup_attach_task_file`, `clickup_add_tag_to_task`, `clickup_remove_tag_from_task` |
| **Comentários** | `clickup_get_task_comments`, `clickup_create_task_comment` |
| **Time tracking** | `clickup_get_task_time_entries`, `clickup_start_time_tracking`, `clickup_stop_time_tracking`, `clickup_add_time_entry`, `clickup_get_current_time_entry` |
| **Listas** | `clickup_create_list`, `clickup_create_list_in_folder`, `clickup_get_list`, `clickup_update_list` |
| **Pastas** | `clickup_get_folder`, `clickup_create_folder`, `clickup_update_folder` |
| **Equipe e assignees** | `clickup_get_workspace_members`, `clickup_find_member_by_name`, `clickup_resolve_assignees` |
| **Chat** | `clickup_get_chat_channels`, `clickup_send_chat_message` |
| **Docs** | `clickup_create_document`, `clickup_list_document_pages`, `clickup_get_document_pages`, `clickup_create_document_page`, `clickup_update_document_page` |

### O que cada tool faz (definição e exemplo de uso)

O MCP combina várias tools em uma única chamada quando necessário. Use os exemplos abaixo para pedir ações ao assistente.

**Busca**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_search` | Busca itens em todo o Workspace: tarefas, Listas, Pastas e Docs. | "Encontre todas as tarefas relacionadas ao 'Lançamento Marketing Q4'." |

**Gestão de tarefas**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_create_task` | Cria uma nova tarefa em uma Lista específica (nome, descrição, assignees, due date, prioridade). | "Crie uma tarefa 'Rascunhar post do blog' na Lista 'Pipeline de Conteúdo', atribua a mim e defina entrega para sexta." |
| `clickup_get_task` | Retorna os detalhes completos de uma tarefa pelo ID. | "Quais são os detalhes da tarefa 'Design-123'?" |
| `clickup_update_task` | Altera propriedades de uma tarefa (nome, descrição, status, assignees, due date). | "Mude o status da tarefa 'Rascunhar post' para 'Em progresso' e adicione 'Revisão' como subtarefa." |
| `clickup_create_bulk_tasks` | Cria várias tarefas em uma Lista em uma única chamada. | "Adicione como novas tarefas na Lista 'Onboarding': 'Enviar email de boas-vindas', 'Agendar orientação' e 'Configurar hardware'." |
| `clickup_update_bulk_tasks` | Altera várias tarefas de uma vez (status, assignee, due date). | "Mova todas as tarefas da Lista 'Sprint 3' com status 'Pronto para revisão' para 'Em revisão'." |
| `clickup_attach_task_file` | Anexa um arquivo (documento, imagem, ZIP) a uma tarefa. | "Anexe este documento [arquivo] à tarefa 'Enviar relatório final'." |
| `clickup_add_tag_to_task` | Aplica uma tag (label) existente à tarefa. | "Adicione a tag 'Urgente' à tarefa 'Corrigir bug de login'." |
| `clickup_remove_tag_from_task` | Remove uma tag de uma tarefa. | "Remova a tag 'Backend' da tarefa 'Atualizar cor do botão'." |

**Comentários em tarefas**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_get_task_comments` | Retorna todos os comentários de uma tarefa. | "Qual a última atualização na tarefa 'Desenvolver nova feature'?" |
| `clickup_create_task_comment` | Adiciona comentário; com **`assignee`** vira **comentário atribuído** (Comentários atribuídos + Resolver). | "Na task PE-123, comente 'Denis, testa o link' e **atribua o comentário ao Denis** (assignee = user id)." |

**Time tracking**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_get_task_time_entries` | Retorna todas as entradas de tempo de uma tarefa. | "Quanto tempo foi registrado na tarefa 'Pesquisa de cliente'?" |
| `clickup_start_time_tracking` | Inicia o timer para uma tarefa (usuário atual). | "Comece a registrar tempo na tarefa 'Code Review'." |
| `clickup_stop_time_tracking` | Para o timer ativo do usuário. | "Pare o timer." |
| `clickup_add_time_entry` | Adiciona manualmente um bloco de tempo (início/fim ou duração). | "Registre 2 horas de trabalho na tarefa 'Otimização do banco' para ontem." |
| `clickup_get_current_time_entry` | Verifica se há timer ativo e retorna os detalhes. | "Em qual tarefa estou registrando tempo agora?" |

**Hierarquia do workspace**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_get_workspace_hierarchy` | Retorna a estrutura do Workspace (Spaces, Folders, Lists). | "Mostre todas as Listas no Space 'Engineering'." |
| `clickup_create_list` | Cria uma nova Lista em um Folder ou Space. | "Crie uma Lista 'Planejamento Sprint 4' na Pasta 'Produto'." |
| `clickup_create_list_in_folder` | Cria uma Lista dentro de um Folder específico. | "Dentro da Pasta 'Campanhas de Marketing', crie a Lista 'Conteúdo Redes Sociais'." |
| `clickup_get_list` | Retorna detalhes e configurações de uma Lista (ex.: status customizados). | "Quais são os status customizados da Lista 'Bugs'?" |
| `clickup_update_list` | Altera configurações da Lista (nome, cor). | "Renomeie a Lista 'Novas Ideias' para 'Ideias Aprovadas'." |
| `clickup_get_folder` | Retorna detalhes de uma Pasta e as Listas que contém. | "Liste todas as Listas dentro da Pasta 'Projetos do Cliente'." |
| `clickup_create_folder` | Cria uma Pasta em um Space. | "Crie a Pasta 'Projetos Q1' no Space 'Operações'." |
| `clickup_update_folder` | Altera configurações de uma Pasta (ex.: nome). | "Renomeie a Pasta 'Design' para 'Time de Design'." |

**Membros e assignees**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_get_workspace_members` | Retorna todos os membros e convidados do Workspace. | "Quem está no time 'Engineering'?" |
| `clickup_find_member_by_name` | Busca um membro por nome ou email. | "Qual o user ID do David Smith?" |
| `clickup_resolve_assignees` | Confirma e retorna os objetos de usuário para uma lista de assignees (útil antes de atribuir à tarefa). | "Quando disser 'Atribua esta tarefa ao Mark e à Sarah', esta tool encontra os IDs corretos." |

**Chat**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_get_chat_channels` | Retorna os canais (views) de Chat do Workspace. | "Liste todos os canais de Chat disponíveis." |
| `clickup_send_chat_message` | Envia mensagem para um canal de Chat. | "Envie no canal 'Geral': 'Almoço de time às 13h hoje.'" |

**Docs**
| Tool | Definição | Exemplo de uso (para o assistente) |
|------|------------|-------------------------------------|
| `clickup_create_document` | Cria um Doc no Workspace (em Space/Folder ou área privada). | "Crie o documento 'Notas de Kickoff do Projeto' no Space 'Projeto Phoenix'." |
| `clickup_list_document_pages` | Retorna a estrutura/índice de um Doc (páginas). | "Quais são as páginas do Doc 'Manual do Colaborador'?" |
| `clickup_get_document_pages` | Retorna o conteúdo de uma ou mais páginas de um Doc. | "Mostre o conteúdo da página 'Onboarding' do Doc 'Wiki do Time'." |
| `clickup_create_document_page` | Adiciona uma página (ou subpágina) a um Doc. | "Adicione a página 'Protocolos de Segurança' ao Doc 'Políticas da Empresa'." |
| `clickup_update_document_page` | Edita o conteúdo de uma página de um Doc. | "Na página 'Protocolos de Segurança', adicione a seção 'Gestão de senhas'." |

---

A interface do Cursor pode exibir mais tools; na dúvida, consulte o schema do servidor MCP ou a [documentação do ClickUp MCP](https://mcp.clickup.com/). Para listar tarefas de uma lista, use `clickup_search` com `list_ids` ou `clickup_get_list` para obter o `list_id`.

---

## 3. Estratégia de Criação (O Padrão SGT – 3 Fases)

Sempre que for solicitado o planejamento de um Módulo ou Feature grande, siga esta hierarquia:

### Fase 1: Levantamento
*Onde definimos as regras. Prioridade Máxima.*
- **Tarefa pai:** Nome exato **"Levantamento"**; todo o conteúdo fica em **subtarefas** (nunca criar tarefas soltas com prefixo `[LEVANTAMENTO]`).
- **Exemplos de subtarefas:** "Definir fluxo de matrícula", "Definir campos do Aluno", "Validar regras de cancelamento".
- **Entregável:** Documentos em `.context/docs/`.

### Fase 2: Cadastros (Substantivos)
*Onde criamos as estruturas base. Sem isso, o sistema não roda.*
- **Tarefa pai:** Nome exato **"Cadastros"**; todo o conteúdo fica em **subtarefas** (nunca criar tarefas soltas com prefixo `[CADASTRO]`).
- **Exemplos de subtarefas:** "Tabela de Alunos", "CRUD de Turmas", "Tela de Cadastro de Cursos".
- **Ordem:** Banco de Dados → Backend (Service) → Frontend (Tela).

### Fase 3: Processos (Verbos)
*Onde a mágica acontece. Ações que manipulam os cadastros.*
- **Tarefa pai:** Nome exato **"Processos"**; todo o conteúdo fica em **subtarefas** (nunca criar tarefas soltas com prefixo `[PROCESSO]`).
- **Exemplos de subtarefas:** "Realizar Matrícula", "Cancelar Contrato", "Transferir de Turma".
- **Dependência:** Só pode começar se os Cadastros relacionados estiverem prontos.

Regra detalhada (cadastro vs processo, pré-requisitos): [requisitos-padrao-desenvolvimento-cadastros-e-processos.md](../../../.context/docs/requisitos/requisitos-padrao-desenvolvimento-cadastros-e-processos.md).

---

## 4. Hierarquia Técnica (Pai e Filhos)

Nunca crie tarefas planas para features. Use o aninhamento **por fase**:

**Nível 0: Tarefa resumo do módulo**  
- **Uma** tarefa com o **nome da área** (ex.: "Educacional", "Gestão de Pessoas"). Descrição em linguagem não técnica: o que é a área, quem acessa, o que tem (telas/funcionalidades). Incluir ao final a seção "Estrutura desta lista (padrão SGT)" com os 3 blocos e link para doc de limpeza (se houver). Documento vivo – atualizar quando a área mudar.

**Nível 1: A Lista (O Módulo)**  
- Local: Lista ClickUp (ex.: `EDUCACIONAL`). Use a tabela "Listas SGT" abaixo.

**Nível 2: As 3 Tarefas Pai de Fase (containers)**  
- **Levantamento** – uma única tarefa pai; **todas** as atividades de levantamento (definir fluxo, validar regras, contratos) são **subtarefas** desta tarefa.
- **Cadastros** – uma única tarefa pai; **todos** os cadastros (telas, tabelas, CRUD) são **subtarefas** desta tarefa. Cadastros grandes (ex.: Gestão de Alunos, Estrutura Curricular) podem ter, por sua vez, subtarefas técnicas (Supabase, Backend, Frontend, QA).
- **Processos** – uma única tarefa pai; **todos** os processos (fluxos de negócio: matricular, editar, vincular, etc.) são **subtarefas** desta tarefa.

**Nível 3: Subtarefas de cada fase**  
- Dentro de **Levantamento:** "Definir fluxo aba Responsáveis", "Definir integração Contrato → Matrícula", etc.
- Dentro de **Cadastros:** "Gestão de Alunos" (com 4 sub-subtarefas: Supabase, Backend, Frontend, QA), "Filtro por status", "Estrutura Curricular" (com 4 sub-subtarefas), etc.
- Dentro de **Processos:** "Matricular aluno", "Editar aluno", "Vincular aluno à turma", etc.

Assim, em cada módulo aparecem **tarefa resumo** + **só 3 blocos** no primeiro nível (Levantamento, Cadastros, Processos); o detalhe fica dentro de cada um.

**Replicar em todas as listas de módulo:** Ao aplicar o padrão em uma lista (ex.: Educacional, Gestão de Pessoas, Financeiro, Configurações): (1) Garantir tarefa resumo com descrição e "Estrutura desta lista". (2) Criar as 3 tarefas pai (Levantamento, Cadastros, Processos) e preencher subtarefas. (3) Se já existirem tarefas antigas/duplicadas, listar em `.context/docs/clickup-<modulo>-limpeza.md` (IDs e nomes a arquivar) e comentar na tarefa resumo; o usuário arquiva manualmente no ClickUp (menu ⋮ → Arquivar).

---

## 5. Mapeamento de Status

| Status SGT (Intenção) | Status ClickUp (Configuração) | Cor |
|-----------------------|-------------------------------|-----|
| Ideia / Futuro | `BACKLOG` | Cinza |
| Próxima Sprint | `A FAZER` | Azul |
| Codando agora | `EM DESENVOLVIMENTO` | Amarelo |
| Code Review / QA | `EM REVISÃO` | Roxo |
| Produção | `CONCLUÍDO` | Verde |

Equivalências ao ler status do ClickUp: to do, open, backlog → A FAZER; in progress, doing, development, **em andamento** → EM DESENVOLVIMENTO; review, qa, testing, **em revisão** → EM REVISÃO; done, complete, closed → CONCLUÍDO.

**Atenção:** listas como **PE - ERROS** podem usar status em minúsculas (`em andamento`, `em revisão`). Sempre `clickup_get_list` na lista da task e passar o **nome exato** do status em `clickup_update_task`.

---

## 6. Matriz de Tarefas (Exemplos de Prompt)

| O que o usuário diz | Ação (MCP) |
|---------------------|------------|
| **"Planeje o módulo Estoque"** | 1. `clickup_get_list` ("ESTOQUE") ou usar list_id da tabela.<br>2. Criar Tasks Pai seguindo Levantamento > Cadastro > Processo.<br>3. Preencher subtarefas técnicas. |
| **"O que falta no Educacional?"** | 1. Buscar tarefas da lista EDUCACIONAL com status != CONCLUÍDO.<br>2. Agrupar por fase (Falta Levantamento? Faltam Cadastros?). |
| **"Terminei o backend da Matrícula"** | 1. `clickup_search` ("backend matrícula").<br>2. `clickup_update_task` (status da lista: **EM REVISÃO** / `em revisão` + custom fields).<br>3. `clickup_create_task_comment` (curto, 1ª pessoa: *"subi o ajuste da matrícula — confere na tela X quando puder"*). |
| **"Atualize a task 86ahrjhgu"** | 1. `clickup_get_task`.<br>2. Status → **em revisão**; Tipo = fix; demanda = Educacional; tag `frontend`.<br>3. Comentário reptiliano para Denis/suporte. |
| **"Isso é um bug urgente"** | 1. `clickup_create_task` (Nome: `[BUG] ...`).<br>2. `clickup_update_task` (Priority: Urgent; Custom Field Tipo: Bug). |
| **"Crie as tarefas desse plano"** | Ler plano/requisito; criar tarefa pai (Feature) e subtasks por skill; usar list_id do módulo. |
| **"O que tenho pra fazer hoje?"** | `clickup_search` (lista da Sprint, status A FAZER ou EM DESENVOLVIMENTO, ordenar por prioridade). |

---

## 7. Listas SGT – IDs e links (mapeamento)

Usar estes `list_id` ao criar tarefas; não inventar IDs. Atualizar quando o usuário informar nova pasta. **Regra de organização (uma lista por módulo, tarefa resumo com descrição):** [requisitos-organizacao-clickup-por-modulo.md](../../../.context/docs/requisitos/requisitos-organizacao-clickup-por-modulo.md).

| Pasta / Lista | list_id | URL (visão lista) |
|---------------|---------|-------------------|
| **PLANEJAMENTO E MONITORAMENTO** | 901325457698 | (folder SGT – mesma categoria) |
| **BANCO DE DADOS** | 901325458441 | https://app.clickup.com/90132895453/v/li/901325458441 |
| **GESTÃO DE PESSOAS** | 901325457670 | https://app.clickup.com/90132895453/v/li/901325457670 |
| **FINANCEIRO** | 901325457587 | — |
| **EDUCACIONAL** | 901325457537 | https://app.clickup.com/90132895453/v/li/901325457537 |
| **PE - ERROS** (Plataforma Educacional) | 901327377563 | https://app.clickup.com/90132895453/v/li/901327377563 |
| **PE - CHAMADOS (Desafio)** (Plataforma Educacional) | 901327432761 | https://app.clickup.com/90132895453/v/l/li/901327432761 |

Setup (form público, status, automações): [.context/docs/clickup-pe-chamados-desafio-setup.md](../../../.context/docs/clickup-pe-chamados-desafio-setup.md).

---

## 8. Fluxos de Trabalho (Resumo)

- **Check-in diário:** Buscar tarefas da lista da Sprint com status A FAZER / EM DESENVOLVIMENTO; apresentar Urgente, Em Andamento, A Fazer.
- **De plano para ação:** Identificar lista (módulo) → Criar tarefa pai (Feature) → Criar subtarefas por skill → Tagging; preencher Tipo (e Complexidade se houver).
- **Finalização:** Buscar tarefa → Status **em revisão** → Custom fields → **Comentário atribuído** (`assignee` = criador/reportador) → Só **CONCLUÍDO** após o assignee marcar Resolver / validar.

---

## 10. Fechamento de entrega (código → ClickUp)

Checklist obrigatório ao encerrar trabalho em uma task (ex.: bug `86ahrjhgu`):

| # | Ação MCP | Detalhe |
|---|----------|---------|
| 1 | `clickup_get_task` | Confirmar lista, assignees, campos já preenchidos |
| 2 | `clickup_get_list` | Status válidos (copiar nome exato) |
| 3 | `clickup_update_task` | **Status → revisão** (`EM REVISÃO` ou `em revisão`) |
| 4 | `clickup_update_task` | **priority** se souber (urgent/high/normal/low) |
| 5 | `clickup_update_task` | **custom_fields:** Tipo de Tarefa, Tipo de demanda, Urgência, Link de Evidência |
| 6 | `clickup_add_tag_to_task` | `frontend`, `backend`, `fix`, `formularios`, etc. |
| 7 | `clickup_resolve_assignees` | Resolver username/e-mail → user ID (ex.: `["Denis"]`) |
| 8 | `clickup_create_task_comment` | Texto curto + **`assignee`** obrigatorio se pediu teste |
| 9 | `clickup_attach_task_file` | Opcional: print ou nota `.txt` para quem não usa repo |

**Modelo de comentário (bug PE - ERROS):**

> Denis, corrigi: no form escuro o texto da resposta não aparecia enquanto digitava. Testa de novo no mesmo link e me fala se ainda some.

**Modelo de comentário (feature Educacional):**

> Subi no ar o catálogo de formulários (duplicar e editar pergunta). Quando puderem, dá uma olhada em Educacional > Formulários.

**Não fazer ao fechar:** marcar Concluído sem passar por revisão; comentário longo com paths e stack; checklist de teste no lugar do checklist de entrega; comentário de “testa aí” **sem** `assignee` (vira só feed, não Comentários atribuídos).

---

## 11. Comentário atribuído (Assigned Comment)

Recurso da UI: **Comentários atribuídos** + “Atribuído a X por Magrelo” + checkbox **Resolver**. No MCP: `clickup_create_task_comment` com **`assignee`** (number = user ID).

### Regra

- **Sempre** usar `assignee` quando o comentário pede que **alguém** teste, valide ou responda (fechamento em **em revisão**, PE - ERROS, bugs).
- **Não** usar `assignee` em comentários informativos sem ação (ex.: “subi doc no repo” sem pedido de teste).

### Quem é o assignee

| Prioridade | Fonte |
|------------|--------|
| 1 (padrao) | `creator.id` de `clickup_get_task` (quem abriu a task) |
| 2 | Ultimo autor em `clickup_get_task_comments` que nao seja Magrelo/Gustavo (quem reportou) |
| 3 | Nome/e-mail indicado pelo usuario |

### Exemplo (task PE `86ahrjhgu`, criador Denis)

```json
{
  "task_id": "86ahrjhgu",
  "comment_text": "Denis, corrigi o form escuro: ao digitar a resposta o texto nao aparecia. Testa de novo no mesmo link e me avisa.",
  "assignee": 118032821,
  "notify_all": true
}
```

`118032821` = Denis (exemplo; sempre confirmar com `get_task` ou `clickup_resolve_assignees`).

### Resolver assignee por nome

```text
clickup_resolve_assignees({ "assignees": ["Denis"] })
→ usar o ID retornado em assignee
```

### Auditoria de pendencias

`clickup_search_reminders` com filtro `ASSIGNED_COMMENT` — lembretes de comentarios atribuidos nao resolvidos (para o PM ou para o assignee autenticado).

### Limitacoes

- Nao atribuir comentario **ja publicado**; criar novo com `assignee` ou o usuario atribui na UI.
- Marcar **Resolver** so na UI do assignee (sem tool MCP dedicada na lista atual).

---

## 12. Dicas para o MCP ClickUp

- **Encontrar Listas:** Use a tabela "Listas SGT" primeiro; ou `clickup_search` e extrair `list_id` do resultado.
- **Descrições de task (planejamento):** Markdown ok para subtarefas técnicas; para **comentários de fechamento** use só a voz Gustavo (curto, sem `src/...`).
- **Anexos:** Se o usuário mandar print de erro, use URL da imagem ou cole o texto na descrição da task de Bug.
- **Tags:** Use para filtros: `frontend`, `backend`, `supabase`, `v1`, `bug`, `debt`.
