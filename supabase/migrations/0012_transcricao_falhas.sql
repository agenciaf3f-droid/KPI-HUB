-- Controle de tentativas do worker de transcrição (api/transcrever.js).
-- Só entra aqui o que FALHOU: mídia com URL expirada, formato recusado pela
-- API, etc. Sem isto, esses casos voltariam para a fila em toda execução.
create table if not exists public.transcricao_falhas (
  message_id    text primary key,
  tentativas    int  not null default 1,
  ultimo_erro   text,
  atualizado_em timestamptz not null default now()
);

alter table public.transcricao_falhas enable row level security;
-- Sem policies de propósito: só o service role (o worker) acessa.
