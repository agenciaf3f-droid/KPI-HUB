# Sistema de Produção Criativa

Plataforma de controle de produção e capacidade pra equipes de design, social media, webdesign e criação. Ver briefing completo no histórico do projeto (§1-§21).

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4
- shadcn/ui (base-ui) — componentes em `src/components/ui`
- Supabase (Postgres + Auth) — client/server/proxy prontos em `src/lib/supabase`, schema em `supabase/migrations/0001_init.sql`

## Rodando local

```bash
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Tela principal hoje usa **dados mock** (`src/lib/mock-data.ts`) — sem Supabase conectado ainda.

## Status atual

- [x] Design system gerado (Flat Design, navy/blue, Plus Jakarta Sans) — `design-system/sistema-de-producao-criativa/MASTER.md`
- [x] Schema SQL completo: organizações, perfis, clientes, projetos, tipos de entrega, perfis de esforço pessoal, entregas, sessões de tempo (cronômetro), histórico de status, gamificação (XP/conquistas), RLS por organização
- [x] Tela principal: fila por status (kanban), cronômetro ao vivo, cadastro rápido de entrega, widget de capacidade da semana
- [ ] Conectar Supabase real (`.env.local` a partir de `.env.local.example` + `npx supabase db push` ou aplicar a migration no projeto escolhido)
- [ ] Server actions (iniciar/pausar/enviar revisão/concluir com persistência real)
- [ ] Autenticação (admin / gestor / criativo)
- [ ] Dashboard de indicadores (§12/§13)
- [ ] Gamificação real (XP, conquistas, metas coletivas) — §14

## Conectar Supabase (quando for a hora)

1. Criar/escolher projeto Supabase.
2. Copiar `.env.local.example` → `.env.local` e preencher URL + anon key.
3. Aplicar `supabase/migrations/0001_init.sql` (SQL editor do Supabase ou CLI).
4. Trocar `src/lib/mock-data.ts` por queries reais via `src/lib/supabase/server.ts`.
