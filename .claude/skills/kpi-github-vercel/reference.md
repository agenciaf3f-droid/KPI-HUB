# Referência – KPI F3F GitHub + Vercel

Convenções de commit, branch strategy, PR e Vercel. **Registro progressivo:** decisões de workflow e configuração adotadas devem ser anotadas aqui.

---

## Ferramentas GitHub (ecossistema KPI F3F)

| Ferramenta | O que faz | Uso pela skill |
|------------|-----------|----------------|
| **GitHub CLI (`gh`)** | PR, issues, merge, gists, releases via terminal. Comandos: `gh pr create`, `gh pr list`, `gh auth status`. | **Principal para automação.** Usar para criar PR, ver status, merge quando agente/script precisar. Exige `gh auth login` uma vez. |
| **GitHub Desktop** | Interface gráfica: commit, push, pull, branches, merge, diff, histórico. | Usuário visualiza e revisa. Não expõe API para agentes; complementar. |
| **Extensão GitHub Pull Requests** | PR e issues no Cursor/VS Code: listar, abrir, revisar, comentar, merge, checkout de branch de PR. | Revisão e navegação no editor. Complementar à skill. |
| **Extensão GitHub Actions** | Workflows e runs de CI/CD no editor: status, logs, reexecutar jobs. | Monitorar builds e deploys. Complementar à skill. |

**Requisitos para `gh` funcionar:**
- `gh` no PATH (Windows: `C:\Program Files\GitHub CLI` — instalador geralmente adiciona; se não, reiniciar terminal ou incluir manualmente).
- Autenticado: `gh auth login` (web ou token). Verificar com `gh auth status`.

**Comandos úteis `gh`:** `gh pr create`, `gh pr list`, `gh pr merge`, `gh repo view`.

---

## Repositório e projeto (canonical)

**Usar sempre estes identificadores.** Ao orientar commits, PR, merge ou deploy, referenciar este repositório e este projeto Vercel; não criar ou apontar para outro repo/projeto.

| Serviço | Identificador |
|---------|----------------|
| **GitHub** | Repo: `https://github.com/agenciaf3f-droid/KPI-HUB`. Org: `agenciaf3f-droid`. Repo name: `KPI F3F`. |
| **Vercel** | Projeto: `kpi`. **Produção (site oficial):** `https://personalglobal.app`. Previews: `kpi-*.vercel.app` por branch/commit. |

Fonte de verdade também em [AGENTS.md](AGENTS.md) (seção 1 – Repository & deployment). Ao configurar Vercel (conectar repo, env vars), usar o repo acima; ao falar de "origin", "push", "PR", tratar deste repositório.

---

## Conventional Commits

Formato: `tipo(escopo): descrição` (escopo opcional).

- **Tipos comuns:** `feat` (feature), `fix` (bugfix), `docs` (documentação), `chore` (manutenção, deps, config), `refactor` (refatoração sem mudar comportamento), `test` (testes), `style` (formatação, sem mudança de lógica).
- **Escopo (sugestão KPI F3F):** módulo ou área, ex.: `auth`, `comercial`, `educacional`, `supabase`, `shared`, `frontend`, `backend`.
- **Exemplos:**
  - `feat(auth): login com redirect após sucesso`
  - `fix(comercial): validação de CPF no formulário`
  - `docs: adicionar skill GitHub + Vercel ao skills-map`
  - `chore(deps): atualizar next para 14.x`

Quebra de linha opcional para corpo do commit; primeira linha deve ser ≤72 caracteres quando possível.

### Encoding (evitar mojibakes)

**Regra obrigatória para mensagens geradas por agente ou via CLI:** usar **apenas ASCII** (sem acentos, sem cedilha). No Windows, `git commit -m` e `gh pr create --body` podem corromper UTF-8 e exibir no GitHub como mojibake (ex.: Número → NÃºmero).**

- Escrever: `Numero`, `Gestao`, `secao`, `remocao`, `configuracoes`, etc.
- Sem emojis, sem aspas curvas, sem símbolos Unicode.
- Comando /commit e /create-pr já seguem essa regra; ao gerar mensagem manualmente, manter ASCII.

---

## Branch strategy (registro progressivo)

Definir e manter aqui as regras adotadas pelo time.

| Item | Convenção atual (preencher/ajustar) |
|------|-------------------------------------|
| **Branch principal (produção)** | `main` – deploy Vercel production. |
| **Branch de desenvolvimento** | Opcional: `develop`; se não houver, features saem de `main`. |
| **Feature** | `feature/nome-curto` ou `feat/nome-curto` (ex.: `feature/auth-login`). |
| **Bugfix** | `fix/nome-curto` ou `fix/issue-123`. |
| **Proteção** | `main` protegida (PR obrigatório, build verde)? A definir no GitHub. |
| **Merge** | Merge commit ou squash? Rebase antes do merge? A definir. |

Ao adotar regras, preencher a tabela e referenciar em development-workflow.md se existir.

---

## Checklist de PR

Antes de marcar PR como pronto para review:

- [ ] `npm run build` passa.
- [ ] `npm run test` passa.
- [ ] Commits no padrão Conventional Commits.
- [ ] Se houve mudanca de schema: migration aplicada via CLI (`db push --linked`); `npx supabase migration list --linked` mostra Local == Remote (sem drift). Runbook: 
- [ ] Se mudou scaffolding ou adicionou doc em `.context/docs/`: indice (README.md de .context/docs) atualizado.
- [ ] Se mudança afeta UI ou comportamento visível: anexar amostra (captura, output CLI) no PR quando útil.
- [ ] Descrição do PR explica o quê e o porquê; link para issue se houver.

**Validação local:** rodar `bash .claude/skills/kpi-github-vercel/scripts/validate-build.sh` (na raiz do repo) ou usar o comando **/pre-pr** no chat.

---

## Resolução de conflitos

1. **Atualizar branch:** `git fetch origin` e `git merge origin/main` (ou `git rebase origin/main`) na sua branch.
2. **Conflitos listados:** `git status` mostra arquivos em conflito.
3. **Resolver por arquivo:** abrir cada arquivo, remover marcadores `<<<<<<<`, `=======`, `>>>>>>>`, manter a versão correta (ou mesclar trechos).
4. **Marcar resolvido:** `git add <arquivo>` para cada arquivo resolvido.
5. **Continuar:** se fez merge, `git commit`; se fez rebase, `git rebase --continue`.
6. **Validar:** rodar `npm run build && npm run test` após resolver tudo.
7. **Push:** se usou rebase, pode ser necessário `git push --force-with-lease` (apenas na **sua** branch de feature, nunca em `main`).

Em dúvida sobre qual código manter, preferir pedir revisão humana em vez de escolher aleatoriamente.

---

## Vercel (registro progressivo)

- **Deploy:** conectado ao repositório GitHub; push na branch principal = deploy de **production**; push em outras branches = deploy de **preview** (URL única por branch/commit).
- **Variáveis de ambiente:** configurar no dashboard Vercel (Project → Settings → Environment Variables). Separar Production / Preview / Development quando necessário. **Nunca** commitar valores de produção; esta skill não altera env sem confirmação.
- **Build:** comando e output directory definidos em configuração do projeto (ex.: `npm run build`, output `out/` ou `.next` conforme framework). Falha de build: ver logs no Vercel (Deployments → clique no deploy → Build Logs).
- **Decisões de config:** (ex.: Node version, region, rewrites) documentar aqui quando definidas.

| Config / Decisão | Valor ou nota |
|------------------|----------------|
| **Projeto Vercel (nome)** | `kpi` (team: Global Tech). |
| **URL de produção (site oficial)** | `https://personalglobal.app` — domínio customizado; configurar no Vercel (Project → Settings → Domains) se ainda não estiver. |
| Branch de produção | `main`. |
| Build command | `npm run build`. |
| Install command | `npm install` (projeto usa npm). |
| Output directory | `.next` (Next.js). |
| **Variável útil** | `VERCEL_PROJECT_PRODUCTION_URL` (e opcionalmente `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`) — Vercel preenche com o domínio de produção (ex.: `personalglobal.app`); útil em previews para gerar links que apontam para produção. |

### MCP Vercel (benefícios para o KPI F3F)

Com o MCP Vercel configurado para o time/projeto, agentes podem:

- **Listar projetos e deployments** — confirmar projeto `kpi`, ver últimos deploys (production vs preview).
- **Ver build logs** — debugar falha de deploy (ex.: `get_deployment_build_logs` por deployment ID ou URL).
- **Ver runtime logs** — erros e `console.log` em produção/preview (api, serverless, edge).
- **Consultar documentação** — `search_vercel_documentation` (ex.: custom domain, env vars, Next.js).
- **Deploy via MCP** — `deploy_to_vercel` a partir do estado atual do repo (conforme config do MCP).
- **Acessar URL protegida** — `get_access_to_vercel_url` para link temporário de preview com auth; `web_fetch_vercel_url` para fetch autenticado em deployment protegido.

Fonte de verdade do projeto e domínio: [AGENTS.md](AGENTS.md) e esta seção. Team ID (Global Tech): `team_mQY54r5NjUBmtVAABYxTsTbx`; Project ID (kpi): `prj_6QaJknW0j5PPx4bXdqU29ADDaCQ0` (útil para chamadas MCP que exigem `projectId`/`teamId`).

---

## Links

- [AGENTS.md](AGENTS.md) – PR & Commit Guidelines (seção 6).
- development-workflow.md – branching e contribuição (quando existir).
- [KPI F3F Documentação](.claude/skills/kpi-documentacao/SKILL.md) – quando atualizar índice e docs.
