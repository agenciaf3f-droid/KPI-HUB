-- Acesso por função e convites de uso único para designers.

alter table creator_profiles alter column role set default 'designer';

create table creator_team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  token text not null unique,
  role creator_user_role not null default 'designer' check (role = 'designer'),
  created_by uuid not null references creator_profiles(id) on delete cascade,
  claimed_by uuid references creator_profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint creator_team_invites_token_not_empty check (char_length(token) >= 32),
  constraint creator_team_invites_claimed_once check (
    (claimed_at is null and claimed_by is null) or
    (claimed_at is not null and claimed_by is not null)
  )
);

create index creator_team_invites_active_idx on creator_team_invites (organization_id, expires_at)
  where claimed_at is null;

alter table creator_team_invites enable row level security;

create or replace function creator_is_admin()
returns boolean as $$
  select exists (
    select 1 from creator_profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function creator_auth_organization_id()
returns uuid as $$
  select organization_id from creator_profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

drop policy if exists "org members read creator_profiles" on creator_profiles;
drop policy if exists "users update own profile" on creator_profiles;
drop policy if exists "org members read creator_deliveries" on creator_deliveries;
drop policy if exists "org members manage creator_deliveries" on creator_deliveries;
drop policy if exists "org members read creator_time_sessions" on creator_time_sessions;
drop policy if exists "users manage own creator_time_sessions" on creator_time_sessions;
drop policy if exists "org members read creator_effort_profiles" on creator_effort_profiles;
drop policy if exists "users manage own creator_effort_profiles" on creator_effort_profiles;
drop policy if exists "org members read status_events" on creator_delivery_status_events;
drop policy if exists "org members insert status_events" on creator_delivery_status_events;
drop policy if exists "org members read creator_xp_events" on creator_xp_events;
drop policy if exists "org members read creator_user_achievements" on creator_user_achievements;
drop policy if exists "gestor manage creator_clients" on creator_clients;
drop policy if exists "org members manage creator_projects" on creator_projects;
drop policy if exists "org members manage creator_delivery_types" on creator_delivery_types;

create policy "admins view organization creator_profiles"
  on creator_profiles for select using (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "users view own profile"
  on creator_profiles for select using (id = auth.uid());
create policy "admins update organization creator_profiles"
  on creator_profiles for update using (creator_is_admin() and organization_id = creator_auth_organization_id())
  with check (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "users update own profile"
  on creator_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admins view organization creator_deliveries"
  on creator_deliveries for select using (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "designers view own creator_deliveries"
  on creator_deliveries for select using (assignee_id = auth.uid());
create policy "admins manage organization creator_deliveries"
  on creator_deliveries for all using (creator_is_admin() and organization_id = creator_auth_organization_id())
  with check (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "designers update own creator_deliveries"
  on creator_deliveries for update using (assignee_id = auth.uid()) with check (assignee_id = auth.uid());

create policy "admins view organization sessions"
  on creator_time_sessions for select using (
    creator_is_admin() and delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id())
  );
create policy "designers manage own sessions"
  on creator_time_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admins view organization effort profiles"
  on creator_effort_profiles for select using (
    creator_is_admin() and user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id())
  );
create policy "users manage own effort profiles"
  on creator_effort_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admins view organization status events"
  on creator_delivery_status_events for select using (
    creator_is_admin() and delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id())
  );
create policy "designers view own status events"
  on creator_delivery_status_events for select using (
    delivery_id in (select id from creator_deliveries where assignee_id = auth.uid())
  );
create policy "admins insert organization status events"
  on creator_delivery_status_events for insert with check (
    creator_is_admin() and delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id())
  );
create policy "designers insert own status events"
  on creator_delivery_status_events for insert with check (
    changed_by = auth.uid() and delivery_id in (select id from creator_deliveries where assignee_id = auth.uid())
  );

create policy "admins view organization xp"
  on creator_xp_events for select using (
    creator_is_admin() and user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id())
  );
create policy "designers view own xp"
  on creator_xp_events for select using (user_id = auth.uid());

create policy "admins view organization achievements"
  on creator_user_achievements for select using (
    creator_is_admin() and user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id())
  );
create policy "designers view own achievements"
  on creator_user_achievements for select using (user_id = auth.uid());

create policy "admins manage creator_clients"
  on creator_clients for all using (creator_is_admin() and organization_id = creator_auth_organization_id())
  with check (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "admins manage creator_projects"
  on creator_projects for all using (creator_is_admin() and organization_id = creator_auth_organization_id())
  with check (creator_is_admin() and organization_id = creator_auth_organization_id());
create policy "admins manage delivery types"
  on creator_delivery_types for all using (creator_is_admin() and organization_id = creator_auth_organization_id())
  with check (creator_is_admin() and organization_id = creator_auth_organization_id());

-- Convites são gerenciados por rotas servidoras com service role.
-- Nenhum usuário comum pode enumerar ou alterar tokens.
