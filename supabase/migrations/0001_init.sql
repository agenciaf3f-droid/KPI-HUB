-- Sistema de Producao Criativa — schema inicial (MVP, briefing §16/§17)

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────

create type creator_user_role as enum ('admin', 'gestor', 'criativo');

create type creator_delivery_status as enum (
  'criada',
  'em_producao',
  'pausada',
  'aguardando_revisao',
  'em_ajuste',
  'bloqueada',
  'entregue',
  'cancelada'
);

create type creator_delivery_priority as enum ('baixa', 'normal', 'alta', 'urgente');

create type creator_pause_reason as enum (
  'reuniao',
  'pausa_pessoal',
  'troca_prioridade',
  'aguardando_material',
  'aguardando_aprovacao',
  'dependencia_tecnica',
  'outro'
);

-- ── Organização e usuários ──────────────────────────────────────────────

create table creator_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table creator_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  full_name text not null,
  role creator_user_role not null default 'criativo',
  weekly_capacity_hours numeric(6, 2),      -- jornada bruta semanal (§11.3)
  weekly_capacity_points numeric(6, 2),     -- capacidade produtiva em pontos
  show_in_rankings boolean not null default true, -- §6.2 / §14.6 opt-out
  created_at timestamptz not null default now()
);

-- ── Clientes, projetos e tipos de entrega ───────────────────────────────

create table creator_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table creator_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  client_id uuid references creator_clients(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table creator_delivery_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  name text not null,                        -- Post estático, Carrossel, Reel, Landing page...
  default_estimate_minutes integer,           -- padrão da organização (§10.3)
  default_effort_points numeric(6, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- ── Perfil pessoal de esforço (§10.2) ───────────────────────────────────

create table creator_effort_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles(id) on delete cascade,
  delivery_type_id uuid not null references creator_delivery_types(id) on delete cascade,
  estimate_minutes integer not null,
  effort_points numeric(6, 2) not null,
  familiarity smallint,                       -- opcional, 1-5
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, delivery_type_id)
);

-- ── Entregas (unidade central, §7) ──────────────────────────────────────

create table creator_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  client_id uuid not null references creator_clients(id) on delete restrict,
  project_id uuid references creator_projects(id) on delete set null,
  delivery_type_id uuid not null references creator_delivery_types(id) on delete restrict,
  batch_id uuid,                              -- agrupa itens criados no mesmo lote (§7.2)
  title text not null,
  quantity integer not null default 1,
  assignee_id uuid not null references creator_profiles(id) on delete restrict,
  created_by uuid not null references creator_profiles(id) on delete restrict,
  status creator_delivery_status not null default 'criada',
  priority creator_delivery_priority not null default 'normal',
  due_at timestamptz,
  reference_url text,
  notes text,
  brief_url text,
  estimate_minutes integer,                   -- calculado do effort_profile no momento da criação
  effort_points numeric(6, 2),
  adjustment_count integer not null default 0, -- reaberturas (§12.2)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index creator_deliveries_org_status_idx on creator_deliveries (organization_id, status);
create index creator_deliveries_assignee_idx on creator_deliveries (assignee_id);
create index creator_deliveries_batch_idx on creator_deliveries (batch_id);

-- ── Sessões de tempo (cronômetro, §8.3 / §16) ───────────────────────────

create table creator_time_sessions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references creator_deliveries(id) on delete cascade,
  user_id uuid not null references creator_profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer generated always as (
    case when ended_at is null then null
    else extract(epoch from (ended_at - started_at))::integer end
  ) stored,
  creator_pause_reason creator_pause_reason
);

create index creator_time_sessions_delivery_idx on creator_time_sessions (delivery_id);
create unique index creator_time_sessions_one_active_per_user
  on creator_time_sessions (user_id)
  where ended_at is null;                     -- regra de negócio §15.2

-- ── Histórico de mudanças de status (auditoria de ciclo, §15.6) ─────────

create table creator_delivery_status_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references creator_deliveries(id) on delete cascade,
  from_status creator_delivery_status,
  to_status creator_delivery_status not null,
  changed_by uuid not null references creator_profiles(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

create index creator_delivery_status_events_delivery_idx on creator_delivery_status_events (delivery_id);

-- ── Gamificação (§14) ────────────────────────────────────────────────────

create table creator_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles(id) on delete cascade,
  delivery_id uuid references creator_deliveries(id) on delete set null,
  points integer not null,
  reason text not null,                        -- entrega_concluida, bonus_prazo, bonus_precisao, ...
  created_at timestamptz not null default now()
);

create table creator_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references creator_organizations(id) on delete cascade,
  key text not null,                            -- 'primeira_entrega_dia', 'ritmo_consistente', ...
  name text not null,
  description text,
  unique (organization_id, key)
);

create table creator_user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles(id) on delete cascade,
  achievement_id uuid not null references creator_achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ── updated_at triggers ──────────────────────────────────────────────────

create or replace function creator_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deliveries_set_updated_at
  before update on creator_deliveries
  for each row execute function creator_set_updated_at();

create trigger effort_profiles_set_updated_at
  before update on creator_effort_profiles
  for each row execute function creator_set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────

alter table creator_organizations enable row level security;
alter table creator_profiles enable row level security;
alter table creator_clients enable row level security;
alter table creator_projects enable row level security;
alter table creator_delivery_types enable row level security;
alter table creator_effort_profiles enable row level security;
alter table creator_deliveries enable row level security;
alter table creator_time_sessions enable row level security;
alter table creator_delivery_status_events enable row level security;
alter table creator_xp_events enable row level security;
alter table creator_achievements enable row level security;
alter table creator_user_achievements enable row level security;

-- Helper: organização do usuário autenticado
create or replace function creator_auth_organization_id()
returns uuid as $$
  select organization_id from creator_profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "org members read creator_organizations"
  on creator_organizations for select
  using (id = creator_auth_organization_id());

create policy "org members read creator_profiles"
  on creator_profiles for select
  using (organization_id = creator_auth_organization_id());

create policy "users update own profile"
  on creator_profiles for update
  using (id = auth.uid());

create policy "org members read creator_clients"
  on creator_clients for select using (organization_id = creator_auth_organization_id());
create policy "gestor manage creator_clients"
  on creator_clients for all using (organization_id = creator_auth_organization_id());

create policy "org members read creator_projects"
  on creator_projects for select using (organization_id = creator_auth_organization_id());
create policy "org members manage creator_projects"
  on creator_projects for all using (organization_id = creator_auth_organization_id());

create policy "org members read creator_delivery_types"
  on creator_delivery_types for select using (organization_id = creator_auth_organization_id());
create policy "org members manage creator_delivery_types"
  on creator_delivery_types for all using (organization_id = creator_auth_organization_id());

create policy "org members read creator_effort_profiles"
  on creator_effort_profiles for select
  using (user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id()));
create policy "users manage own creator_effort_profiles"
  on creator_effort_profiles for all
  using (user_id = auth.uid());

create policy "org members read creator_deliveries"
  on creator_deliveries for select using (organization_id = creator_auth_organization_id());
create policy "org members manage creator_deliveries"
  on creator_deliveries for all using (organization_id = creator_auth_organization_id());

create policy "org members read creator_time_sessions"
  on creator_time_sessions for select
  using (delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id()));
create policy "users manage own creator_time_sessions"
  on creator_time_sessions for all using (user_id = auth.uid());

create policy "org members read status_events"
  on creator_delivery_status_events for select
  using (delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id()));
create policy "org members insert status_events"
  on creator_delivery_status_events for insert
  with check (delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id()));

create policy "org members read creator_xp_events"
  on creator_xp_events for select
  using (user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id()));

create policy "org members read creator_achievements"
  on creator_achievements for select using (organization_id = creator_auth_organization_id());

create policy "org members read creator_user_achievements"
  on creator_user_achievements for select
  using (user_id in (select id from creator_profiles where organization_id = creator_auth_organization_id()));
