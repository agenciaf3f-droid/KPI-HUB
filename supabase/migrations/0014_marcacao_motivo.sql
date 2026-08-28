-- Motivo da marcação de relatório.
--
-- "Enviado" deixou de ser um botão só e virou três opções. Elas NÃO viram três
-- status: para a cobrança e para o gráfico as três significam a mesma coisa —
-- relatório entregue, fatia verde. O que muda é o porquê, e isso é informação
-- de auditoria, não de cálculo. Por isso `motivo` é coluna separada de `status`,
-- e não mais valores no check de status.
--
--   manual    — "Enviado Manualmente"
--   dashboard — "Enviado pelo Dashboard"
--   reuniao   — "Reunião Realizada Hoje/Ontem"
--
-- Fica nulo em 'nao_precisa' e nas marcações feitas antes desta migration.

alter table public.gestor_relatorio_marcacoes
  add column if not exists motivo text;

alter table public.gestor_relatorio_marcacoes
  drop constraint if exists gestor_relatorio_marcacoes_motivo_check;

alter table public.gestor_relatorio_marcacoes
  add constraint gestor_relatorio_marcacoes_motivo_check
  check (motivo is null or motivo in ('manual', 'dashboard', 'reuniao'));

comment on column public.gestor_relatorio_marcacoes.motivo is
  'Por que o relatorio conta como enviado: manual, dashboard ou reuniao. Nulo em nao_precisa.';
