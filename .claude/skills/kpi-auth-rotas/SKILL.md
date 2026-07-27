---
name: kpi-auth-rotas
description: "Auth, profiles, users and routes in KPI F3F. Single login (Supabase Auth), session, user profile, route protection, middleware and route config. Use when creating or changing login, session, profile, middleware, or protected/public routes."
---

# KPI F3F Auth e Rotas

Responsável por **autenticação**, **perfis**, **usuários** e **rotas** no KPI F3F: login único (Supabase Auth), sessão, perfil do usuário, middleware, rotas protegidas vs públicas, redirects e configuração que afeta rotas. Stack: Next.js App Router; referências em [project-plan.md](.context/docs/project-plan.md) e [security.md](.context/docs/security.md).

## Regra de ouro

- **Login e sessão** (Supabase Auth, tela de login, refresh) → esta skill.
- **Perfil do usuário** (dados do perfil, roles, acesso por módulo conforme Configurações) → esta skill.
- **Middleware** (auth, redirects, headers, bypasses controlados) → esta skill.
- **Rotas protegidas vs públicas** (quem acessa o quê, tratamento de não autenticado) → esta skill.
- **Configuração de rotas** (estrutura /app, /api; mudanças que afetam URLs) → esta skill, para não quebrar links e não gerar rotas erradas ou não configuradas.
- **Esquema e RLS** (tabelas de perfil no banco) → skill Supabase; **telas** de perfil → skill Frontend; esta skill define **o que** protege e **como** resolver usuário/perfil nas rotas.

## Quando usar esta skill

- Criar ou alterar **telas de login**, **logout** ou **fluxo de sessão** (Supabase Auth).
- Definir ou alterar **perfil do usuário** (campos, roles, vínculo com Configurações para acesso por módulo).
- Configurar ou alterar **middleware** (Next.js): auth, redirects, headers (ex.: org_id se multi-tenant), bypass E2E ou cron.
- Definir **rotas públicas** vs **rotas protegidas**; tratamento de usuário não autenticado em rotas de API.
- Adicionar **redirects legados** (URLs antigas → novas) ou alterar estrutura de pastas que afeta URLs.
- Resolver **contexto da requisição** (user_id, perfil, org_id se aplicável) para uso nas rotas e no backend.
- Evitar ou corrigir **problemas conhecidos** com rotas (ver [reference.md](reference.md)).

## Regras

- **Middleware compatível com App Router:** Next.js App Router espera função direta `async (request) => response`. Não usar HOF que retorne handler de forma incompatível (ex.: `export const GET = withCache(handler)` que quebre); se precisar de cache ou wrapper, aplicar dentro do handler ou usar padrão documentado no [reference.md](reference.md).
- **Rotas de API e cliente Supabase:** em rotas de API **nunca** usar cliente admin (bypass de RLS) para dados por usuário/tenant; sempre usar cliente que respeita RLS (e contexto, ex.: org_id se houver). Regra documentada em [reference.md](reference.md).
- **Rotas públicas vs protegidas:** rotas em `app/api/*` devem tratar **usuário não autenticado** como caso explícito (não assumir que o middleware já bloqueou), exceto exceções documentadas (ex.: `/api/public/*`, cron com service key). Rotas protegidas confiam no middleware para redirect; mesmo assim, resolver contexto no início da rota.
- **Mudanças em rotas:** ao alterar estrutura de pastas ou configuração que afeta URLs, atualizar middleware e redirects em conjunto; verificar que rotas antigas (se ainda suportadas) redirecionam corretamente. Documentar no reference quando houver padrão de redirect legado.
- **Registro progressivo:** padrões adotados (ex.: nome do cookie de org, header E2E, secret de cron) devem ser documentados no [reference.md](reference.md) para todo o projeto seguir.
- **Contexto no cliente:** Ao implementar resolução de perfil/contexto no lado do cliente (ex.: helper usado pelo frontend para layout ou guards de rota), usar **TanStack Query** (conforme [project-plan](.context/docs/project-plan.md)) para cache dos dados de perfil, evitando requisições desnecessárias ao Supabase a cada mudança de rota.

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Problemas a evitar (lições de projetos anteriores):** middleware + App Router, admin client em API, rotas públicas vs protegidas, redirects legados, org/tenant, E2E e cron.
- **Padrões de auth e rotas:** como resolver contexto (user_id, perfil), onde definir rotas públicas, exceções (signup, cron).
- **Registro progressivo:** quando o projeto definir algo (ex.: estrutura /app, bypass E2E, cron secret), documentar ali.

## Integração com outras skills

- **Supabase:** tabelas de perfil e RLS são da skill Supabase; esta skill usa a sessão e o user_id fornecidos pelo Supabase Auth e define como as rotas obtêm esse contexto.
- **Backend:** services recebem user_id/perfil resolvidos pelas rotas ou pelo middleware; esta skill define como esse contexto chega (headers, cookie, resolveRequestContext).
- **Frontend:** telas de login e de perfil são implementadas pela Frontend; esta skill define proteção de rotas e redirects (middleware, layout protegido).
- **Configurações (módulo):** perfil define **quem acessa qual módulo**; a resolução de "usuário X pode acessar módulo Y" pode ser feita nesta skill (middleware ou helper) usando dados de Configurações.

## Referência adicional

- Problemas a evitar, padrões de rotas e auth, e registro progressivo: [reference.md](reference.md) (neste diretório).
