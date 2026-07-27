---
name: kpi-github-vercel
description: "GitHub and Vercel for KPI F3F. Commits (Conventional Commits), push, PR, merge, branch strategy, conflict resolution; Vercel integration (deploy, preview, env vars). Use when committing/PR, configuring or debugging deploy, or defining branch strategy."
---

# KPI F3F GitHub + Vercel

Responsável por **fluxo Git** (commits, branches, PR, merge), **resolução de conflitos** e **integração Vercel** (deploy, preview, env). Alinha ao [AGENTS.md](AGENTS.md) (PR & Commit Guidelines) e ao development-workflow.md quando existir. Esta skill **orienta e executa** comandos e passos; não altera secrets ou produção sem confirmação.

## Regra de ouro

- **Commits:** sempre Conventional Commits (`feat(scope): description`); escopo opcional mas recomendado (ex.: `feat(auth): login com redirect`). Esta skill sugere mensagem e valida formato.
- **PR:** antes do merge, rodar `npm run build && npm run test`; documentação e índice atualizados se houver mudança em estrutura ou scaffolding. Se houve DDL: validar `npx supabase migration list --linked` (Local == Remote) conforme migrations-workflow.md. Anexar amostras (CLI, captura) quando mudança afetar UI/comportamento visível.
- **Branch strategy:** definir e documentar no [reference.md](reference.md); padrão comum é `main` (produção) e branches de feature/fix a partir de `main` ou de `develop` se o time adotar. Esta skill segue a estratégia documentada.
- **Vercel:** deploy automático a partir do repo (branch principal = production; demais = preview). **Produção (site oficial):** `https://personalglobal.app`. Variáveis de ambiente e configuração de projeto: esta skill orienta onde configurar; **nunca** sobrescrever env de produção sem confirmação explícita.
- **Conflitos:** esta skill guia a resolução (identificar arquivos, manter intenção de ambas as partes, testar após merge); não faz force-push em branch compartilhada sem confirmação.

## Quando usar esta skill

- **Fazer commit:** gerar ou revisar mensagem no padrão Conventional Commits; checar se arquivos sensíveis (`.env`, secrets) não vão no commit.
- **Abrir ou revisar PR:** checklist (build, test, docs); descrição do PR; sugerir título no padrão do projeto.
- **Merge:** garantir que branch está atualizada (rebase ou merge da base); resolver conflitos se houver.
- **Resolver conflitos:** identificar conflitos, orientar resolução por arquivo, lembrar de rodar build/test após.
- **Branch strategy:** definir ou consultar regras (ex.: `feature/nome`, `fix/nome`, proteção de `main`); documentar no reference.
- **Vercel:** configurar projeto (conectar repo, branch de produção); variáveis de ambiente (preview vs production); debugar deploy falho (logs, build); entender preview URLs.
- **Revert / desfazer:** reverter commit ou PR com segurança; esta skill indica comandos e impacto.

## Regras

- **Não fazer:** force-push em `main` ou em branch que outros usam; alterar variáveis de ambiente de produção sem confirmação; commitar `.env` ou chaves.
- **Sempre:** Conventional Commits; rodar build + test antes de marcar PR pronto; atualizar `.context/docs/README.md` (e índice) se mudar scaffolding ou adicionar doc.
- **Sem mojibakes:** Mensagens de commit e corpo/título de PR gerados por agente ou via CLI (`git commit -m`, `gh pr create`) **devem usar apenas ASCII** (a-z, A-Z, 0-9, hífen, parênteses, dois pontos, vírgula). No Windows/PowerShell o Git e o `gh` podem corromper acentos e gerar mojibakes (ex.: Número → NÃºmero). Escrever sem acento: Numero, Gestao, secao, etc.
- **Registro progressivo:** decisões de branch strategy, convenções de PR ou configuração Vercel adotadas devem ser anotadas no [reference.md](reference.md).

## Ferramentas GitHub (ecossistema KPI F3F)

| Ferramenta | Função | Uso pela skill/agente |
|------------|--------|------------------------|
| **GitHub CLI (`gh`)** | PR, issues, merge, releases via terminal. **Principal para automação.** | `gh pr create`, `gh pr list`, `gh auth status`. Usar quando PR via terminal for necessário. Exige `gh auth login` uma vez. |
| **GitHub Desktop** | Interface gráfica: commit, push, pull, branches, merge, histórico. | Não executa comandos; usuário visualiza e revisa. Complementar. |
| **Extensão GitHub Pull Requests** | PR e issues no VS Code/Cursor: listar, revisar, comentar, merge, checkout. | Revisão e navegação no editor. Complementar à skill. |
| **Extensão GitHub Actions** | Workflows e runs de CI/CD no editor. | Monitorar builds e deploys. Complementar à skill. |

**Requisito para PR via `gh`:** `gh` no PATH e autenticado (`gh auth login`). No Windows, o instalador adiciona ao PATH; se `gh` não for encontrado, reiniciar o terminal/Cursor ou incluir `C:\Program Files\GitHub CLI` no PATH manualmente.

## Comandos do Cursor

Para finalizar uma tarefa, utilizar preferencialmente o comando **/commit** (em `.cursor/commands/`) para garantir formatação correta (Conventional Commits, sem emojis, **texto em ASCII** para evitar mojibakes no GitHub). Ao concluir uma feature, utilizar o comando **/create-pr** para gerar título e descrição profissionais do PR. Para validar antes do PR, pode-se rodar o script `scripts/validate-build.sh` ou o comando **/pre-pr`.

**Criação de PR via CLI:** quando `gh` estiver autenticado, usar `gh pr create --title "..." --body "..."` para abrir PR diretamente do terminal (o comando **/create-pr** pode gerar o texto para colar ou chamar `gh`).

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Ferramentas GitHub:** GitHub CLI, Desktop, extensões; quando usar cada uma.
- **Conventional Commits:** formato, tipos (`feat`, `fix`, `docs`, `chore`, etc.), escopo sugerido para o KPI F3F.
- **Branch strategy:** ramos principais, naming (`feature/`, `fix/`), quando fazer merge/rebase.
- **Checklist de PR:** build, test, docs, descrição, anexos para UI.
- **Resolução de conflitos:** passos, quando pedir ajuda humana.
- **Vercel:** deploy por branch, preview vs production, env vars, onde ver logs; registro de decisões de config.

## Integração com outras skills

- **Documentação:** atualização de índice (`.context/docs/README.md`) e de `development-workflow.md` quando mudar workflow ou estrutura; esta skill aplica as regras de "atualizar docs ao mudar scaffolding".
- **QA / Tester:** PR deve passar em testes; esta skill exige `npm run test` (e build) antes do merge; não implementa os testes (skill QA).
- **Limpeza de código / Organizar repositório:** commits e PRs podem agrupar refatoração ou limpeza; mensagem de commit deve refletir (ex.: `refactor(auth): extrair validação para shared`).

## Referência adicional

- Convenções, branch strategy, conflitos e Vercel: [reference.md](reference.md) (neste diretório).
- Diretrizes de PR e commit no projeto: [AGENTS.md](AGENTS.md) (seção 6). Workflow de desenvolvimento: development-workflow.md (quando existir).
