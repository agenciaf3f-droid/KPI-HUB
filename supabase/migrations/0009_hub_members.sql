-- Membros do KPI Hub: fonte de verdade de acesso por área.
-- Sem policies de propósito: toda leitura/escrita passa pelo service role no servidor.
create table public.hub_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  nome text not null,
  areas text[] not null check (areas <@ array['gestor','editor','creator'] and array_length(areas, 1) >= 1),
  is_admin boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.hub_members enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Seed: os 4 acessos que hoje vivem hardcoded em src/lib/panels.ts.
insert into public.hub_members (user_id, email, nome, areas, is_admin)
select u.id, s.email, s.nome, s.areas, s.is_admin
from (values
  ('agenciaf3f@gmail.com',             'Arthur Eiras', array['gestor','editor','creator'], true),
  ('iriacridesdamiaopinhas@gmail.com', 'Damião',       array['editor'],                    false),
  ('lucasmaiasct2187@gmail.com',       'Lucas',        array['editor'],                    false),
  ('diegobrandotheworld472@gmail.com', 'Denzel',       array['gestor','creator'],          false)
) as s(email, nome, areas, is_admin)
join auth.users u on lower(u.email) = s.email
on conflict (email) do nothing;
