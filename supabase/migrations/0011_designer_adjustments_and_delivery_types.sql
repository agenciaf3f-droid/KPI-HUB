create table if not exists creator_delivery_adjustments (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references creator_deliveries(id) on delete cascade,
  description text not null,
  created_by uuid not null references creator_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table creator_time_sessions
  add column if not exists adjustment_id uuid references creator_delivery_adjustments(id) on delete set null;

create index if not exists creator_delivery_adjustments_delivery_idx
  on creator_delivery_adjustments (delivery_id, created_at);

alter table creator_delivery_adjustments enable row level security;
create policy "org members read creator_delivery_adjustments"
  on creator_delivery_adjustments for select using (
    delivery_id in (select id from creator_deliveries where organization_id = creator_auth_organization_id())
  );
create policy "users manage own creator_delivery_adjustments"
  on creator_delivery_adjustments for all using (created_by = auth.uid());
