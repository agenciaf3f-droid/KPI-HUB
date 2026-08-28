-- Marcação manual do relatório semanal por grupo.
--
-- A cobrança de relatório é derivada das mensagens: o painel procura o comando
-- de relatório na semana e, se não achar, cobra. Duas situações não aparecem
-- nas mensagens e por isso precisam de marcação à mão:
--
--   'enviado'     — o relatório foi entregue por fora (áudio, chamada, outro
--                   canal), então a cobrança está errada.
--   'nao_precisa' — aquele grupo não precisava de relatório naquela semana
--                   (cliente em pausa, entrou no meio da semana, combinado
--                   diferente). No gráfico vira a fatia amarela: sai dos
--                   pendentes mas CONTINUA no total, para dar para auditar
--                   quantas dispensas foram dadas.
--
-- Uma marcação por grupo por semana: marcar de novo troca o status, e a chave
-- única deixa o upsert resolver isso sem race entre dois gestores clicando junto.

create table if not exists public.gestor_relatorio_marcacoes (
  id            uuid primary key default gen_random_uuid(),
  -- `grupo_id` é o id numérico do grupo do WhatsApp, o mesmo que
  -- normalizeGroupId() produz no motor (sem "@g.us" e sem "-group").
  grupo_id      text        not null,
  -- Semana ISO no formato "2026-W35" — o mesmo que isoWeek() gera no motor.
  semana        text        not null,
  status        text        not null check (status in ('enviado', 'nao_precisa')),
  -- Quem marcou. Guardado para auditoria: a regra é que só o gestor do grupo
  -- (ou admin) marca, e sem isto não dá para conferir se foi respeitada.
  marcado_por   uuid        references public.hub_members(id) on delete set null,
  marcado_nome  text        not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint gestor_relatorio_marcacoes_grupo_semana_key unique (grupo_id, semana)
);

comment on table public.gestor_relatorio_marcacoes is
  'Marcacao manual de relatorio semanal por grupo: enviado por fora ou dispensado na semana.';

-- O painel lê a janela de 2 meses do gráfico de cadência, sempre filtrando por
-- semana. Sem índice isso vira seq scan a cada abertura da aba.
create index if not exists gestor_relatorio_marcacoes_semana_idx
  on public.gestor_relatorio_marcacoes (semana);

-- Mesma postura das views da 0008: quem lê e escreve é o servidor, com
-- service_role. A checagem de permissão (gestor do grupo ou admin) mora na
-- rota, que é onde se sabe quem está logado e quem é o gestor do grupo.
alter table public.gestor_relatorio_marcacoes enable row level security;
revoke all on public.gestor_relatorio_marcacoes from anon, authenticated;
