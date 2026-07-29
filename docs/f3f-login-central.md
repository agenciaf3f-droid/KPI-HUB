# Login central F3F — como este app (KPI/Hub) se integra

> Briefing auto-contido. Vale para qualquer agente/dev que mexer em auth neste repo.

## Situação especial deste repo

Este app **já autentica no Supabase central** (Agenciaf3f — `ulikfkemdawinetjyhok`), o mesmo banco que hospeda o login unificado F3F. Ou seja: a senha daqui **já é** a senha única F3F. Não há migração de credencial nem espelho — só três lacunas, cobertas nesta integração:

1. **Registro**: quem é criado aqui (`/api/equipe`, `/api/invites/accept`, `/api/setup`) agora ganha linha em `public.f3f_logins` (`system='hub'`) via `registerF3fLogin` (`src/lib/f3f-logins.ts`) — inserção direta, mesmo banco.
2. **Gate**: o login (`src/app/login/page.tsx`) consulta a edge `f3f-auth-check` (`{ system: 'hub' }`); `reason='desativado'` → signOut + erro. Fail-open: infra fora do ar ou usuário legado sem linha não bloqueia.
3. **Sync do espelho Console.Ads**: toda troca de senha (conta, definir-senha, editor) chama a edge `f3f-auth-set-password` via `syncPasswordMirror` (`src/lib/f3f-central.ts`) — ela regrava no central (idempotente) e sincroniza a conta espelho no projeto do Console.Ads (`csfpqioxmsocdqavwkvn`). Best-effort.
4. **Revogação** (`DELETE /api/equipe`): além de apagar `hub_members`, marca `f3f_logins.active=false` (`system='hub'`). A conta em `auth.users` fica — a pessoa pode ter acesso a outros sistemas.

## O que NÃO mudou — regra, não sugestão

Autorização é local: `hub_members` (áreas, `is_admin`), `creator_profiles` (role admin/designer), RLS deste banco. `f3f_logins` **não tem coluna de cargo** de propósito.

## Proibido

1. Senha em texto em tabela.
2. `SUPABASE_SERVICE_ROLE_KEY` em código client / env `NEXT_PUBLIC_`.
3. Mover cargo/permissão pra `f3f_logins`.
4. Escrever em `f3f_logins` a partir do browser (RLS só deixa hub admin ler; escrita é service_role/edge).

## Checklist de aceite

- [ ] Membro novo por `/api/equipe` aparece em `f3f_logins` (`system='hub'`).
- [ ] Revogar membro → `f3f_logins.active=false`; próximo login é barrado com "acesso desativado".
- [ ] Troca de senha propaga (logs da edge `f3f-auth-set-password`: `mirror_console_ads_synced`).
- [ ] `npx tsc --noEmit` sem erros NOVOS (a main já carrega 2 erros pré-existentes em `src/app/creator/page.tsx` — fora do escopo de auth).
