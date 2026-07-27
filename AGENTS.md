<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — KPI F3F

> **Missão:** fonte de verdade para agentes neste repositório.

## 1. Visão geral

- **Nome:** KPI F3F
- **Objetivo:** unificar num app só os três sistemas que medem o desempenho da equipe da Agência F3F. Nós somos o **back-end** — entregamos dados, contrato e documentação; **outro dev faz o front-end**.
- **Entidades centrais:** membro da equipe · cliente · entrega (`creator_delivery` | `video_edit` | trilha de atendimento)
- **Arquitetura:** Next.js App Router com Server Components, route handlers e auth via middleware. Este repo nasceu do `Sistema-de-KPI-Creator`.

| Serviço | Identificador |
|---------|---------------|
| **GitHub** | `agenciaf3f-droid/KPI-F3F` |
| **Supabase** | `https://ulikfkemdawinetjyhok.supabase.co` — ref `ulikfkemdawinetjyhok` |
| **Vercel** | projeto `kpi-f3f` (org `team_zVUz7ywTl2lCsc6ULiPbRzD3`) |

## 2. Mapa do repositório

```
src/app/            rotas, páginas e route handlers (/api/*)
src/components/     componentes de tela
src/components/ui/  primitivos shadcn (16) — avatar, badge, button, card, dialog,
                    dropdown-menu, input, label, progress, select, separator,
                    sheet, sonner, table, tabs, textarea
src/lib/            lógica de servidor (`import "server-only"`): deliveries.ts,
                    gamification.ts, auth.ts, admin-access.ts, types.ts, format.ts
src/lib/supabase/   client.ts, server.ts, admin.ts, middleware.ts, config.ts
supabase/migrations/  7 migrations versionadas
design-system/      MASTER.md do sistema de produção criativa
.claude/skills/     20 skills do projeto (kpi-*) + _archived/
.context/docs/      documentação e memória
```

**Não existe neste repo** — não presumir: `src/modules/`, `src/shared/`, biblioteca de componentes padronizados (DataTable, ChartCard, filtros), TanStack Query, Recharts, React Hook Form.

## 3. Stack e restrições

Next.js 16.2 · React 19.2 · Tailwind 4 · shadcn 4 + `@base-ui/react` · `@supabase/ssr` · zod 4 · TypeScript 5

- Sem dependência nova sem aprovação.
- Ler `node_modules/next/dist/docs/` antes de mexer em rota, middleware ou route handler.
- `src/lib/mock-data.ts` é **código morto** — nada importa dele. O app lê do Supabase real.

## 4. Dados

Os três painéis dividem o projeto Supabase `ulikfkemdawinetjyhok`, em áreas isoladas:

| Painel | Tabelas | Métrica |
|---|---|---|
| Creator | `public.creator_*` (13) | entregas, sessões de tempo, XP, conquistas, esforço vs capacidade |
| Editor | `controle_edicao.video_edits`, `.clients` | vídeos entregues, `elapsed_seconds`, pausas, formato |
| Gestor | `public."Controle de Mensagens"`, `uazapi_raw` | lead time de trilha |

Auth do Creator e do Editor fica em `ulikfkemdawinetjyhok`; o login do **Gestor** está noutro projeto (`dptnojreulmixycpprqv`).

**Cuidado ao convidar usuário** em `ulikfkemdawinetjyhok`: `auth.users` tem dois triggers ativos (`on_auth_user_created`, `f3f_on_auth_user_created`), ambos chamando `handle_new_user()`, que cria perfil com `role='copywriter'` por padrão.

Leitura de dado hoje passa por `createAdminClient()` (`service_role`) com filtro de papel em JS. As policies RLS existem, mas não são elas que protegem o dado.

## 5. Dev e testes

```bash
npm run dev      # next dev
npm run build    # next build — tem que passar limpo antes de entregar
npm run lint     # eslint
```

Não há suíte de teste ainda. Antes de portar Editor ou Gestor, capturar o comportamento de `src/lib/gamification.ts` e `src/lib/deliveries.ts` em testes de caracterização.

## 6. Skills

`.claude/skills/` tem 20 skills `kpi-*`. Comece pela **`kpi-skill-gerente`**, que direciona a tarefa para a skill certa e define a ordem quando várias entram. Índice em `.context/docs/skills-map.md`.

`.claude/skills/_archived/` guarda o que veio do pacote de origem e não se aplica aqui — **não invocar**.

## 7. Fora de escopo sem aval do usuário

- Apertar o RLS do Editor: os deploys `controle-edicao` e `leadtime` estão no ar lendo com chave publishable; mexer derruba o app que a equipe usa hoje.
- Identidade canônica entre sistemas (`kpi.team_members` + aliases).
- Migrar ou mesclar tabelas e histórico.
- Desligar os deploys antigos.
- Empurrar qualquer coisa para os remotes de `KPI-CREATOR`, `KPI-EDITOR` ou `KPI-GESTOR` — são só leitura.
