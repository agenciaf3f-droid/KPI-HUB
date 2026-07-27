-- Evita que uma mesma demanda conceda XP de conclusão mais de uma vez.
create unique index if not exists creator_xp_completion_once
  on creator_xp_events (delivery_id, user_id, reason)
  where reason = 'entrega_concluida';
