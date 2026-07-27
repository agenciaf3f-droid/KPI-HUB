---
name: kpi-obsidian-processos
description: "Cuida do vault Obsidian Status Report: diário, Git/Vercel/ClickUp, docs simples. Plugins Calendar/Dataview/Bases. UTF-8 sem mojibake. MCP user-obsidian-status-report. Linguagem fácil. Sem segredos/PII."
---

# KPI F3F Obsidian Processos

Você cuida do **vault Status Report** no Obsidian.

Objetivo simples: qualquer pessoa do time deve entender **o que foi feito em cada dia**, em cada projeto, sem precisar ser técnica.

## Tom de escrita (obrigatório)

Escreva sempre em **português simples**:

- Frases curtas.
- Palavras do dia a dia.
- Explique o **efeito** (“agora dá para baixar a parcela”) em vez de nomes de arquivo ou termos de programação.
- Evite jargão: migration, RLS, RPC, webhook, payload, etc. Se precisar citar, use no máximo uma linha e diga o que isso muda na prática.
- Prefira “eu fiz / ficou pronto / ainda falta” a tom de relatório corporativo.

**Ruim:** “Implementada a camada de baixa auditável no ledger financeiro.”  
**Bom:** “Agora a baixa da parcela fica registrada com quem fez e quando.”

## Vault certo

- Caminho: `C:\Users\House\Documents\Obsidian\Status Report`
- MCP no Cursor: **`user-obsidian-status-report`** (só esse)
- Só um vault aberto no Obsidian. Vaults antigos foram arquivados.

Se a API não responder, peça para abrir o Status Report e conferir o Local REST API (check verde).

## Plugins do Obsidian (vault Status Report)

### Já instalados e ativos

| Plugin | Tipo | Para quê |
|--------|------|----------|
| **Local REST API** | Community | MCP Cursor (`user-obsidian-status-report`) |
| **Calendar** | Community | Calendário do mês |
| **Dataview** | Community | KPIs no HOME |
| **Style Settings** | Community | Calibrar Minimal |
| **Homepage** | Community | Abre o cockpit no startup |
| **Periodic Notes** | Community | Semana/mês/ano |
| **Charts** | Community | Tendência no HOME |
| **Iconize** | Community | Ícones de pastas |
| **Meta Bind** | Community | Editar properties |
| **Templater** | Community | Snippets MANUAL |
| **Omnisearch** | Community | Busca |
| **Advanced URI** | Community | Deep links |
| **Bases** | Core | Painéis `000_HOME/*.base` |

Doc: `07_OPERACAO/Plugins recomendados.md`.

### Formato de data

- **Arquivo e frontmatter:** sempre `YYYY-MM-DD` (ISO) — obrigatório para Calendar, Bases e automação.  
  Ex.: `01_DIARIO/2026/07/2026-07-12.md` e `date: 2026-07-12`.
- **Exibição na tela (Properties):** segue o Windows (Brasil / `dd/MM/yyyy`).
- **Templates (inserir data):** `DD/MM/YYYY`.
- **Não renomear** diários para `DD-MM-YYYY` — quebra sync e Calendar.

### Encoding e mojibake (obrigatório)

Sempre escrever notas e scripts em **UTF-8 sem BOM**. Cuidado com **mojibake** (texto quebrado tipo `Â·`, `â†`, `Ã§`, `Ã£`).

**Regras:**

1. Preferir separadores **ASCII** em textos gerados por script: ` | `, `-`, `->`, em vez de `·`, `←`, `—`, setas fancy.
2. Em PowerShell do vault, gravar com UTF-8 sem BOM (`Write-Utf8NoBom` / `[System.Text.UTF8Encoding]::new($false)`). Nunca salvar diário/rollup como ANSI/Windows-1252.
3. Evitar here-strings do PowerShell com aspas aninhadas `` "`n" `` e caracteres Unicode desnecessários — costumam corromper o arquivo.
4. Depois de gerar ou editar nota automática, **conferir no Obsidian** se aparece lixo (`Â`, `Ã`, setas estranhas). Se aparecer: corrigir a fonte e regenerar.
5. Acentos do português (`ç`, `ã`, `é`) podem ficar no texto **manual** e em títulos; o risco maior é misturar encoding ao gerar via script/MCP.

**Sinais de mojibake:** `Â·` no lugar de ponto médio, `â€™` no lugar de aspas, `Ã¡` no lugar de `á`.

## O que esta skill faz

1. **Diário por dia** (`01_DIARIO/...`) — fonte principal do que aconteceu.
2. **Resumos** de semana, mês e ano a partir dos dias.
3. **Docs do projeto** em `05_PROJETOS/` (KPI F3F, KPI F3F, PortalUploader): módulos, cadastros, processos, vínculos e fluxos ponta a ponta — sempre em linguagem clara.
4. **Ligar evidências:** Git (commits), Vercel (deploy), ClickUp (tarefas) e o que a pessoa complementar à mão.

## O que esta skill não faz

- Não altera código, banco ou deploy.
- Não inventa regra de negócio sem fonte.
- Não grava senha, token, `.env` ou dado pessoal real.

## Estrutura em uma frase

**O dia manda.** Semana, mês e ano só juntam os dias. Cada projeto tem sua pasta em `05_PROJETOS/`.

Pastas principais:

| Pasta | Para quê |
|-------|----------|
| `000_HOME/` | Porta de entrada e guias |
| `01_DIARIO/AAAA/MM/AAAA-MM-DD.md` | O que rolou no dia |
| `02_SEMANAL/` / `03_MENSAL/` / `04_ANUAL/` | Resumos |
| `05_PROJETOS/kpi` (e outros) | Docs do produto |
| `_automation/` | Script que puxa Git/docs |
| `_templates/` | Modelos de nota |

Detalhes: [reference.md](reference.md).

## Como fechar um dia (fluxo padrão)

1. **Gerar o dia (automático)**  
   Preferir o sync (Git + GitHub + Vercel). Às 23:50 roda sozinho via Task Scheduler `StatusReport-DailySync`.
   ```powershell
   cd "C:\Users\House\Documents\Obsidian\Status Report\_automation"
   .\sync-status-report.ps1
   # ou data específica:
   .\collect-status.ps1 -Date AAAA-MM-DD -ForceEmptyDays -RefreshCaches
   ```
   Dias sem evidência ficam `no_activity`. Se alguma fonte falhar → `partial` (nunca inventar “sem atividade”).

2. **Completar à mão** (só blocos `<!-- MANUAL:... -->`)  
   - O que isso mudou na prática  
   - Reuniões  
   - Travas / o que falta  
   - Trabalho sem commit  
   - Próximos passos

3. **ClickUp (MCP `user-clickup`)**  
   Busque tarefas tocadas no dia (atualizadas, concluídas ou comentadas). No diário, anote em linguagem simples:  
   - “Fechei a task de X”  
   - “Pedi pro Denis testar Y”  
   Não cole IDs longos sem necessidade; um link ou nome da task basta.

4. **Vercel**  
   No fechamento, anote se o deploy do projeto ficou ok, com erro, ou só preview — sem tokens.

5. **Marcar** `manual_review: done` no frontmatter quando o dia estiver fechado.

### Regras dos blocos

- **Não edite** `<!-- AUTO:... -->` (o script sobrescreve).
- **Edite só** `<!-- MANUAL:... -->`.

## Projetos ativos na coleta

Definidos em `_automation/projects.json`:

| Projeto | Pasta no vault | Repo | Vercel |
|---------|----------------|------|--------|
| KPI F3F | `05_PROJETOS/kpi` | agenciaf3f-droid/KPI-F3F | kpi |
| KPI F3F | `05_PROJETOS/kpi-f3f` | kpi-f3f | kpi-f3f |
| PortalUploader | `05_PROJETOS/portal-uploader` | portaluploaders | portaluploaders |

Não use pastas de `BackUps`.

## Docs de produto (KPI F3F e outros)

Quando o pedido for sobre **como o sistema funciona** (não só o diário):

1. Procure no vault antes de criar nota nova.
2. Atualize módulo → cadastro → processo → vínculo → fluxo completo (E2E), se fizer sentido.
3. Escreva para leigo: o que é, quando acontece, o que muda, o que dispara depois.
4. Linke as notas entre si com caminho completo quando houver risco de nome igual (`[[05_PROJETOS/kpi/...]]`).

HOME do KPI F3F migrado: `05_PROJETOS/kpi/000_HOME/000 - HOME (KPI F3F).md`.

## Ferramentas MCP Obsidian

Servidor: **`user-obsidian-status-report`**

- listar / buscar / ler notas  
- `obsidian_append_content` (cria nota se o caminho for novo)  
- `obsidian_patch_content` (ajuste pontual)  
- `obsidian_delete_file` quase nunca  

Não existe `create_note`: use `append` em caminho novo.

## Outras fontes (sem misturar responsabilidades)

| Fonte | Uso aqui | Quem manda na regra |
|-------|----------|---------------------|
| Git | Commits do dia no diário | Coletor + esta skill |
| Vercel | Status do deploy no fechamento | MCP Vercel / hint do coletor |
| ClickUp | Tasks feitas / pedidas no dia | Skill `kpi-clickup-pm` no board; esta skill só resume no Obsidian |
| Docs do repo (`.context/docs`) | Entregas e requisitos | Skill `kpi-documentacao`; espelho claro no vault quando pedir |

## Segurança

Nunca grave:

- senhas, tokens, chaves, `.env`  
- CPF, telefone, e-mail real de cliente  

Se precisar citar algo sensível, use:

- `[[TOKEN:REDACTED]]`  
- `[[SECRET:REDACTED]]`  
- `[[PII:REDACTED]]`  
- `[[URL:REDACTED]]`

## Checklist rápido de entrega

- [ ] Diário do dia atualizado (auto + manual, se for o caso)
- [ ] Texto legível por não técnico
- [ ] Projetos/módulos certos no dia
- [ ] ClickUp resumido quando houver task relevante
- [ ] Docs de produto atualizados quando a regra mudou
- [ ] Links ok (HOME/MOCs se mudou algo grande)
- [ ] Sem segredo / sem dado pessoal
- [ ] Sem mojibake (`Â`, `Ã`, setas quebradas) — UTF-8 ok
- [ ] Pendências escritas com clareza (“ainda falta X porque Y”)

## Ordem com outras skills

- `kpi-skill-gerente` — quem chama quem  
- `kpi-clickup-pm` — board e comentários no ClickUp  
- `kpi-consultoria-processos` — regra de negócio nova  
- `kpi-integracoes-vinculos` — contrato entre módulos (você documenta no vault em linguagem simples)  
- `kpi-documentacao` — docs no repositório Git  

## Referência

Pastas, nomes de arquivo, modelos de nota e exemplos: [reference.md](reference.md).
