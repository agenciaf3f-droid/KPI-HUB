-- Painel do Gestor — camada de LEITURA sobre `public."Controle de Mensagens"`.
--
-- Nenhuma tabela é alterada e nenhum dado é migrado: só views agregadoras.
-- Motivo: a tabela tem ~109 mil linhas. Puxar isso para a aplicação a cada
-- request é o que trava a tela; o Postgres agrega em milissegundos.
--
-- `Gestor` é texto livre, sem FK. As views normalizam com `btrim` para que
-- `'Gabriel\n'` (1 linha, criada por uma quebra de linha colada junto) deixe de
-- aparecer como uma pessoa separada de `'Gabriel'` (12.634 linhas), e descartam
-- os valores de lixo `''`, `'-'` e `'#N/A'` (~3.900 linhas sem dono).

create or replace view public.kpi_gestor_resumo
with (security_invoker = on) as
  select
    btrim("Gestor")                                                    as gestor,
    count(*)                                                           as mensagens,
    count(distinct "Nome do Grupo")                                    as grupos,
    count(*) filter (where "Reply" is not null and "Reply" <> '')      as respostas,
    min("Horário")::date                                               as primeiro_dia,
    max("Horário")::date                                               as ultimo_dia
  from public."Controle de Mensagens"
  where "Gestor" is not null
    and btrim("Gestor") not in ('', '-', '#N/A')
  group by btrim("Gestor");

comment on view public.kpi_gestor_resumo is
  'Totais por gestor em Controle de Mensagens. Nome normalizado com btrim; lixo ("", "-", "#N/A") excluido.';

create or replace view public.kpi_gestor_diario
with (security_invoker = on) as
  select
    btrim("Gestor")        as gestor,
    "Horário"::date        as dia,
    count(*)               as mensagens
  from public."Controle de Mensagens"
  where "Gestor" is not null
    and btrim("Gestor") not in ('', '-', '#N/A')
    and "Horário" >= (current_date - interval '90 days')
  group by btrim("Gestor"), "Horário"::date;

comment on view public.kpi_gestor_diario is
  'Mensagens por gestor por dia, ultimos 90 dias. Alimenta o grafico do painel do gestor.';

-- As views só são lidas pelo servidor (service_role). `anon` e `authenticated`
-- não recebem grant: a tabela de origem carrega mensagem de cliente e não pode
-- vazar para o navegador.
revoke all on public.kpi_gestor_resumo from anon, authenticated;
revoke all on public.kpi_gestor_diario from anon, authenticated;
