-- Marca quem ainda usa a senha que o admin gerou no convite. Enquanto true,
-- o hub obriga a trocar antes de liberar qualquer painel.
alter table public.hub_members
  add column if not exists senha_provisoria boolean not null default false;
