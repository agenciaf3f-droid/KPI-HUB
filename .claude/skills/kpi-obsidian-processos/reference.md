# Referência — kpi-obsidian-processos

Guia prático do vault **Status Report**. Linguagem simples; o dia é a base de tudo.

## 1) Onde fica o vault

`C:\Users\House\Documents\Obsidian\Status Report`

MCP Cursor: `user-obsidian-status-report`

## 1.1) Plugins instalados

| Plugin | Uso |
|--------|-----|
| Local REST API | MCP |
| Calendar (`pt-br`, semana na segunda) | Navegar dias / ver lacunas |
| Dataview | Agregações opcionais |
| Bases (core) | `000_HOME/Diario.base`, `Projetos.base` |

### Data: o que é ISO vs Brasil

| Onde | Formato |
|------|--------|
| Nome do arquivo + `date:` no YAML | `YYYY-MM-DD` (não mudar) |
| Properties na tela | Locale do Windows (Brasil) |
| Templates → inserir data | `DD/MM/YYYY` |
| Calendar | `pt-br` |

Detalhe: `07_OPERACAO/Formato de data Brasil.md`.

## 1.2) Encoding / mojibake

- Arquivos do vault: **UTF-8 sem BOM**.
- Em geração automática, preferir ASCII (` | `, `-`) a símbolos Unicode (`·`, `←`, `—`).
- Se aparecer `Â·`, `â†`, `Ã§` etc.: encoding errado — corrigir e regravar.
- Helper do coletor: `Write-Utf8NoBom` em `_automation/lib/Common.ps1`.

## 2) Mapa de pastas

```text
000_HOME/
  000 - HOME (Status Report).md
  MOC - Projetos.md
  MOC - Como usar.md
  MOC - Convencoes Unificadas.md

01_DIARIO/AAAA/MM/AAAA-MM-DD.md
02_SEMANAL/AAAA/AAAA-Www.md
03_MENSAL/AAAA/AAAA-MM.md
04_ANUAL/AAAA.md

05_PROJETOS/
  kpi/                    # docs do ERP (módulos, processos…)
  kpi-f3f/
  portal-uploader/

06_REUNIOES/
07_OPERACAO/
08_INTEGRACOES/
_templates/
_automation/
  projects.json
  collect-status.ps1
  sync-status-report.ps1
  audit-coverage.ps1
  register-daily-sync-task.ps1
  cache/          # git.json, github.json, vercel.json, clickup.json (sem tokens)
  lib/            # Collect-*, Build-*, Import-ClickUp, Common
99_ARQUIVO/
```

## 3) O dia (fonte principal)

Arquivo: `01_DIARIO/AAAA/MM/AAAA-MM-DD.md`

### Frontmatter típico

```yaml
---
type: daily
date: AAAA-MM-DD
iso_week: AAAA-Www
activity_status: active   # active | no_activity | partial
evidence_status: verified # verified | partial
commit_count: 0
pr_count: 0
deploy_count: 0
clickup_count: 0
projects: [kpi, kpi-f3f]
modules: [financeiro, comercial]
sources: [git, github, vercel, clickup]
manual_review: pending   # ou done
created: AAAA-MM-DD
updated: AAAA-MM-DD
tags: [status-report, diario]
---
```

### O que vai em cada parte

| Parte | Quem preenche | Conteúdo |
|-------|---------------|----------|
| AUTO por projeto | Script | Commits, docs tocados, working tree, dica Vercel |
| MANUAL por projeto | Pessoa / agente | O que mudou na prática, contexto |
| Resumo / bloqueios / próximos | Pessoa / agente | Visão do dia |
| ClickUp | Agente no fechamento | Tasks feitas ou pedidas (texto simples) |

### Blocos sagrados

- `<!-- AUTO:START:nome -->` … `<!-- AUTO:END:nome -->` — não editar à mão  
- `<!-- MANUAL:START:nome -->` … `<!-- MANUAL:END:nome -->` — editar à vontade  

## 4) Coletor (Git + docs)

```powershell
cd "C:\Users\House\Documents\Obsidian\Status Report\_automation"
.\collect-status.ps1 -Date 2026-07-12 -IncludeVercelHint -ConfigPath .\projects.json

# Vários dias
.\collect-status.ps1 -From 2026-01-01 -To 2026-07-12 -IncludeVercelHint -ConfigPath .\projects.json
```

O script:

- lê commits dos seus nomes/e-mails em `projects.json`
- tenta achar o módulo pelo texto do commit e pastas
- lista docs alterados no dia (sem conteúdo sensível)
- atualiza semana / mês / ano
- **mantém** o que estiver nos blocos MANUAL

## 5) ClickUp no diário

Use o MCP `user-clickup` (a skill `kpi-clickup-pm` manda no board).

No Obsidian, só resuma:

```markdown
#### ClickUp
- Fechei: [nome curto da task]
- Pedi teste: [nome] — aguardando [pessoa]
- Ainda aberto: [nome] — trava: [motivo simples]
```

Não copie descrição técnica longa do card. Traduza o efeito.

## 6) Vercel no diário

No fechamento do dia (após o hint do script):

```markdown
#### Deploy
- KPI F3F: ok em produção (ou: deu erro / só preview)
- KPI F3F: …
- PortalUploader: …
```

Sem URL secreta, sem token.

## 7) Docs de produto (ex.: KPI F3F)

Dentro de `05_PROJETOS/kpi/` a estrutura antiga continua útil:

```text
000_HOME/
01_MODULOS/<Modulo>/
  010 - Modulo ….md
  Cadastros/
  Processos/
02_VINCULOS_E_INTEGRACOES/
03_PROCESSOS_E2E/
06_CHANGELOG/
```

### Nomes de arquivo

| Tipo | Padrão |
|------|--------|
| Módulo | `010 - Modulo <Nome>.md` |
| Cadastro | `CAD - <Entidade>.md` |
| Processo | `PROC - <Verbo + Objeto>.md` |
| Vínculo (arquivo) | `Vinculos - A - B.md` (no título interno pode usar `->`) |
| Fluxo completo | `E2E - <Historia>.md` |

### Frontmatter de doc de produto

```yaml
---
type: module   # ou cadastro, processo, vinculo, e2e, moc, home…
project: kpi   # ou kpi-f3f, portal-uploader, status-report
status: active
created: AAAA-MM-DD
updated: AAAA-MM-DD
tags: [kpi, modulo]
---
```

### Exemplo de processo (linguagem simples)

```markdown
# PROC - Baixar parcela

## Em uma frase
Registrar que a parcela foi paga (ou baixada) e deixar rastreável quem fez.

## Antes de começar
- A parcela precisa existir e estar em aberto.

## Passo a passo
1. Abrir a parcela.
2. Informar valor e data.
3. Confirmar a baixa.

## O que muda depois
- A parcela fica baixada (ou parcial).
- Fica o histórico da operação.

## Links
- [[05_PROJETOS/kpi/01_MODULOS/Financeiro/010 - Modulo Financeiro]]
```

## 8) Links

Depois da unificação, prefira **caminho completo** quando o nome puder repetir:

- `[[05_PROJETOS/kpi/000_HOME/000 - HOME (KPI F3F)]]`
- `[[01_DIARIO/2026/07/2026-07-12]]`

## 9) Segurança

Nunca gravar no vault:

- tokens, senhas, `.env`
- CPF / telefone / e-mail real de cliente

Placeholders: `[[TOKEN:REDACTED]]` `[[SECRET:REDACTED]]` `[[PII:REDACTED]]` `[[URL:REDACTED]]`

## 10) Checklist de um dia bem fechado

1. Script rodou (ou equivalente via agente).  
2. Commits batem com o que você lembra.  
3. Texto manual em português simples.  
4. ClickUp resumido, se houve task.  
5. Deploy anotado, se houve.  
6. `manual_review: done`.  
7. Semana/mês atualizados (o script já faz na maioria dos casos).  
8. Sem mojibake na nota (UTF-8; sem `Â·` / `â†`).
