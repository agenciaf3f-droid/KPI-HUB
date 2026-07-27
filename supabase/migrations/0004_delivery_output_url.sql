-- O link final é obrigatório na aplicação antes de uma entrega ser concluída.
alter table creator_deliveries add column if not exists delivery_url text;
