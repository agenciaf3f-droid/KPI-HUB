# Referência – KPI F3F Auth e Rotas

Lições de projetos anteriores (problemas a evitar) e padrões para auth, perfis e rotas. **Registro progressivo:** ao definir estrutura de rotas, bypass E2E, cron ou contexto de tenant, documentar aqui.

---

## Problemas a evitar (lições de projetos anteriores)

Estes problemas já ocorreram em outro sistema; a skill Auth e Rotas existe para **não repeti-los** no KPI F3F.

### 1. Middleware incompatível com Next.js App Router

- **Problema:** HOF que retorna `(handler) => async (request) => response`. O App Router espera função direta `async (request) => response`. Uso como `export const GET = withCache(handler)` gerava `TypeError: r is not a function`.
- **Regra:** Não usar `export const GET = withCache(handler)` (ou equivalente). Usar `export async function GET(request) { return handler(request); }` e aplicar cache **dentro** do handler com getCache/setCache (ou padrão adotado pelo projeto). Se houver HOF/wrapper, ele deve ser compatível com a assinatura esperada pelo App Router.
- **Status:** Padrão a seguir em todo middleware e route handlers.

### 2. Risco de vazamento de dados (multi-tenant ou por usuário)

- **Problema:** Uso de `createAdminClient()` (ou service role) em rotas de API ignora RLS e pode expor dados de uma org/usuário para outro.
- **Regra:** Em rotas de API **nunca** usar cliente admin para dados que devem respeitar RLS. Sempre usar o cliente normal (`createClient()` com sessão), que respeita RLS (e, se multi-tenant, filtrar por org_id/contexto).
- **Padrão:** Resolver contexto com algo como `resolveRequestContext(request)` e filtrar queries com `.eq('org_id', ctx.org_id)` quando aplicável, além do que o RLS já garante.

### 3. Rotas públicas vs protegidas e tratamento de auth

- **Problema:** Rotas em `app/api/*` assumindo que o middleware já bloqueou usuário não autenticado; quando a suposição falha, comportamento inconsistente.
- **Regra:** Rotas de API devem tratar **usuário não autenticado** como caso padrão (verificar sessão no início da rota; retornar 401 ou resposta adequada quando não autenticado), exceto exceções documentadas (ex.: `/api/public/signup`, scripts de migração, jobs/cron autenticados por service key ou secret).
- **Padrão:** Rotas protegidas podem confiar no middleware para redirect no app; mesmo assim, o contexto (user_id, org_id se houver) é resolvido no início da rota e usado de forma consistente.

### 4. Redirects legados

- **Problema:** URLs antigas (ex.: `/students`, `/students/*`) deixaram de funcionar após mudança de estrutura; links quebrados.
- **Regra:** Quando houver mudança de estrutura de URLs (ex.: `/students` → `/app/students`), manter redirect 301 no middleware (ou em config do Next) de `/students` e `/students/*` para as novas URLs, até que links legados não sejam mais usados. Documentar aqui qual redirect legado existe.

### 5. Contexto de organização/tenant (org_id) – quando aplicável

- **Problema:** Usuário sem org_id (sem organização associada) acessando áreas que exigem org; comportamento indefinido.
- **Regra:** Se o projeto for multi-tenant com org_id: usuário sem org_id não pode acessar `/app` (área autenticada), exceto ex.: `/app/settings` para configurar. O middleware redireciona para `/app/settings` quando não há org_id. Para rotas `/api/*`, o org_id é resolvido via cookie (ex.: `pg.active_org`) e membership, com fallback para a primeira membership. Documentar no projeto quando esse modelo for adotado.

### 6. E2E e bypass de auth

- **Problema:** Testes E2E (ex.: Playwright) precisam acessar `/app` e `/api` sem sessão real.
- **Regra:** Middleware pode aceitar um header controlado (ex.: `x-e2e-bypass-auth: 1`) para permitir bypass **apenas em ambiente de teste**. Nunca habilitar em produção. Documentar o header e a condição (ex.: `process.env.NODE_ENV === 'test'`) no reference quando adotado.

### 7. Cron e APIs internas

- **Problema:** Jobs/cron precisam chamar rotas internas sem sessão de usuário.
- **Regra:** `CRON_SECRET` é obrigatório. Middleware e Route Handler validam `Authorization: Bearer <CRON_SECRET>` em defesa dupla. Secret ausente retorna 503; inválido retorna 401. Nunca liberar a rota quando a variável estiver vazia.
- **Piloto WhatsApp:** usa secret dedicado `WHATSAPP_CHATBOT_PILOT_SECRET` com a mesma regra fail-closed. Query secret é exceção apenas no webhook piloto que não suporta header customizado.
- **Implementação canônica:** `src/infra/auth/internal-api-auth.ts`.

---

## Padrões de auth e rotas (resumo)

- **Login:** Supabase Auth; tela de login e logout; sessão disponível em todo o HUB.
- **Perfil:** dados do usuário (nome, email, roles, etc.) e vínculo com Configurações (acesso por módulo); um único usuário para todos os módulos; perfil define onde ele pode entrar.
- **Rotas protegidas:** middleware redireciona não autenticado para login; rotas de API retornam 401 quando não autenticado (salvo exceções).
- **Rotas públicas:** ex.: login, signup (se houver), páginas de marketing; listar exceções no reference quando definidas.
- **Primeiro login e senha:** usuários podem ser marcados com `app_metadata.must_change_password`; enquanto ativo, middleware força acesso em `/configuracoes/perfil` para troca de senha. Admin pode redefinir senha de usuários e optar por exigir troca no próximo login.
- **Contexto na rota:** resolver no início (user_id, perfil, org_id se aplicável); passar para services ou respostas de forma consistente.
- **Contexto no cliente:** ao expor perfil/contexto para o frontend (ex.: `resolveRequestContext` ou equivalente no client), usar **TanStack Query** para cache dos dados de perfil e evitar refetch a cada navegação.

---

## Registro progressivo

Preencher quando o projeto definir:

| Item | Status | Descrição |
|------|--------|------------|
| **Estrutura de rotas /app e /api** | Definido | App: `/` (dashboard), `/login` (público), `/(dashboard)/*` (protegido: configuracoes, [modulo]). API: `/api/auth/signout` (POST, protegido). Rotas públicas: `/login` e filhos. Middleware: não autenticado em `/api/*` → 401; em app → redirect `/login`. |
| **Redirects legados** | N/A | Nenhum redirect legado ativo; estrutura atual sem mudança de URLs antigas. |
| **Header ou cookie de org_id** | N/A | Projeto não é multi-tenant; sem org_id. |
| **Primeiro login / troca obrigatória de senha** | Definido | Flag `app_metadata.must_change_password` no Auth. Criação de usuário pode exigir troca no primeiro login; middleware força `/configuracoes/perfil?primeiro-acesso=1` até o usuário trocar senha. Admin pode redefinir senha de usuários e marcar troca obrigatória no próximo login. |
| **Bypass E2E** | A definir | Nome do header (ex.: x-e2e-bypass-auth) e condição quando testes E2E forem adotados. |
| **Cron / internal auth** | Definido | `CRON_SECRET` obrigatório para crons e fila WhatsApp; `WHATSAPP_CHATBOT_PILOT_SECRET` obrigatório para piloto/chatbot financeiro. Middleware + handler validam; ausente 503, inválido 401. |
| **Formularios publicos logado** | Definido | Rotas `/p/*` (formulario-evento, desafio-formulario, certificados, etc.) acessiveis com sessao ativa; redirect de autenticado apenas em `/login`. Policy em `src/infra/auth/public-route-policy.ts`. |

---

## Links

- [security.md](.context/docs/security.md) – políticas de auth e RLS.
- [project-plan.md](.context/docs/project-plan.md) – stack e objetivos.
- [data-flow.md](.context/docs/data-flow.md) – fluxo de auth e entidades.
