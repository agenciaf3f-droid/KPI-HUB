-- Cor visual escolhida por cada Designer para identificação nos painéis.
alter table creator_profiles add column if not exists designer_color text not null default '#8B5CF6';
