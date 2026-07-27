-- Notifica o painel de monitoramento assim que uma demanda, timer ou XP mudar.
-- O payload é vazio: os dados continuam sendo carregados pelo servidor autenticado.
create or replace function creator_notify_monitor_from_delivery()
returns trigger
security definer
set search_path = public, realtime
language plpgsql as $$
declare organization_id uuid;
begin
  organization_id := coalesce(new.organization_id, old.organization_id);
  perform realtime.send('{}'::jsonb, 'refresh', 'creator-monitor:' || organization_id::text, false);
  return null;
end;
$$;

create or replace function creator_notify_monitor_from_session()
returns trigger
security definer
set search_path = public, realtime
language plpgsql as $$
declare organization_id uuid;
begin
  select d.organization_id into organization_id
  from creator_deliveries d
  where d.id = coalesce(new.delivery_id, old.delivery_id);
  if organization_id is not null then
    perform realtime.send('{}'::jsonb, 'refresh', 'creator-monitor:' || organization_id::text, false);
  end if;
  return null;
end;
$$;

create or replace function creator_notify_monitor_from_xp()
returns trigger
security definer
set search_path = public, realtime
language plpgsql as $$
declare organization_id uuid;
begin
  select p.organization_id into organization_id
  from creator_profiles p
  where p.id = coalesce(new.user_id, old.user_id);
  if organization_id is not null then
    perform realtime.send('{}'::jsonb, 'refresh', 'creator-monitor:' || organization_id::text, false);
  end if;
  return null;
end;
$$;

drop trigger if exists creator_monitor_delivery_changes on creator_deliveries;
create trigger creator_monitor_delivery_changes
after insert or update or delete on creator_deliveries
for each row execute function creator_notify_monitor_from_delivery();

drop trigger if exists creator_monitor_session_changes on creator_time_sessions;
create trigger creator_monitor_session_changes
after insert or update or delete on creator_time_sessions
for each row execute function creator_notify_monitor_from_session();

drop trigger if exists creator_monitor_xp_changes on creator_xp_events;
create trigger creator_monitor_xp_changes
after insert or update or delete on creator_xp_events
for each row execute function creator_notify_monitor_from_xp();
