# Referência – KPI F3F Security & Performance

Checklists para auditoria de RLS, análise de dados sensíveis no client-side e verificação de N+1 e gargalos. **Registro progressivo:** achados recorrentes ou regras adotadas pelo projeto podem ser documentados ao final.

---

## Checklist: auditoria de policies RLS

Use ao auditar uma tabela (ex.: `financeiro_transacoes`). Pergunta central: **um membro (ou usuário A) consegue ver ou alterar dados de outro membro (usuário B)?**

### Por operação

- **SELECT:** a política `USING` restringe às linhas do próprio usuário/membro/tenant? (ex.: `member_id = auth.uid()` ou join com tabela que vincula `user_id` ao membro; ou `user_id = auth.uid()` quando a tabela tem `user_id`).
- **INSERT:** a política `WITH CHECK` garante que o usuário só insere com `member_id`/`user_id` dele (ou do contexto permitido)?
- **UPDATE:** idem; usuário não pode atualizar linhas de outro.
- **DELETE:** idem; usuário não pode deletar linhas de outro.

### Pontos comuns de falha

- **RLS desabilitado** na tabela com dados por usuário/membro → qualquer cliente autenticado pode ver tudo.
- **Política permissiva demais:** ex.: `USING (true)` ou sem filtro por `member_id`/`user_id`.
- **Tabela com `member_id` mas política usando só `auth.uid()`** sem vínculo: verificar se existe tabela que relaciona `auth.uid()` ao `member_id` (ex.: perfil ou membro tem `user_id`); a política pode usar subquery ou função que retorna o `member_id` do usuário logado.
- **Admin client (service role)** usado em rota de API que devolve dados por usuário → bypass de RLS; ver skill [Auth e Rotas](.claude/skills/kpi-auth-rotas/SKILL.md). Esta skill **aponta** o uso; a correção é usar cliente com sessão (RLS ativo).

### Saída da auditoria

- Lista de políticas da tabela (SELECT, INSERT, UPDATE, DELETE).
- Para cada uma: está restringindo corretamente? Sim/Não.
- Se Não: descrever o cenário de vazamento (ex.: "membro A pode SELECT transações onde member_id = B") e sugerir condição correta (ex.: `USING (member_id = (SELECT id FROM membros WHERE user_id = auth.uid()))` ou equivalente).

---

## Checklist: dados sensíveis no client-side (React / frontend)

Use ao analisar um componente ou fluxo frontend. Objetivo: **não expor no browser o que não deve ser acessível ao usuário ou a scripts maliciosos.**

### O que verificar

- **Tokens e chaves:** `service_role` key, `CRON_SECRET`, tokens de API internos nunca no código do client nem em variáveis de ambiente expostas ao build do client (Next.js: só variáveis `NEXT_PUBLIC_*` vão ao client).
- **Dados de outros usuários:** a API ou o estado do componente está retornando/guardando dados que deveriam ser filtrados por RLS (ex.: lista de transações de todos os membros)? Se o backend usar cliente com RLS e `user_id` correto, não deveria; se o componente receber payload com dados de outros, é falha no backend ou na forma de chamada.
- **Campos desnecessários:** resposta de API que inclui campos sensíveis (ex.: hash interno, dados de auditoria que não precisam na tela); sugerir limitar o que é enviado ao client (select específico ou DTO).
- **Estado global (Context, store):** não guardar no client o que não é necessário para a UI (ex.: token JWT é necessário para chamadas; copiar objeto inteiro de "perfil" com campos internos pode ser excesso).
- **URLs e logs:** não logar em console (em prod) objetos com dados sensíveis; não colocar IDs sensíveis ou tokens em query params visíveis.

### Saída da análise

- Lista de itens: "Onde / O quê / Risco".
- Sugestão: mover para server (Server Component, API route), remover do payload, ou não enviar ao client.

---

## Checklist: N+1 queries e gargalos no backend

Use ao revisar um service ou trecho que acessa repositório/banco em loop.

### N+1 típico

- **Padrão:** loop sobre uma lista e, para cada item, uma chamada ao repositório (ex.: `for (const item of items) { const detail = await this.repo.findById(item.id); }`). Resultado: 1 query + N queries (N = tamanho da lista).
- **Solução sugerida:** uma única query que traga todos os detalhes necessários (ex.: `repo.findByIds(items.map(i => i.id))` ou query com `in (...)`) ou carregar a relação em batch antes do loop (ex.: `const detailsMap = await repo.findByParentIds(ids)` e no loop usar `detailsMap.get(item.id)`).
- **Outros gargalos:** queries sem índice adequado (ex.: filtro por coluna não indexada em tabela grande); fetch de colunas desnecessárias; múltiplas round-trips que poderiam ser uma única chamada. Apontar e sugerir otimização (índice, select específico, batch).

### Saída da verificação

- Trecho exato onde ocorre o N+1 (ou gargalo).
- Descrição: "N+1: no loop sobre X, cada iteração chama repo.Y; total 1 + N queries."
- Sugestão: "Carregar todos os Y por ids em uma chamada antes do loop; usar Map para acesso O(1)."

---

## Checklist: TanStack Query – prefetch e LCP (frontend)

O projeto usa **TanStack Query** para cache e mutations ([project-plan](.context/docs/project-plan.md)). Use ao auditar telas críticas para evitar layout shift e melhorar LCP (Largest Contentful Paint).

### O que verificar

- **Prefetch no servidor:** telas críticas (ex.: dashboard, lista principal do módulo) devem prefetchar dados no Server Component ou no layout quando possível (ex.: `prefetchQuery` no servidor antes de hidratar o client), para que o primeiro paint já tenha dados disponíveis no cache e não ocorra "flash" de loading ou layout shift.
- **Stale-While-Revalidate (SWR):** TanStack Query já aplica SWR por padrão (mostra cache enquanto revalida). Auditar se o `staleTime` está adequado para telas que não precisam de dados em tempo real (evitar refetch desnecessário a cada foco de janela quando o dado pode ficar "stale" por alguns minutos).
- **Queries em cascata:** evitar que a tela espere uma query terminar para disparar a próxima quando as duas puderem ser prefetchadas ou disparadas em paralelo (evitar waterfall que atrasa LCP).

### Saída da verificação

- Lista: "Tela / O quê / Impacto (ex.: layout shift, LCP alto)".
- Sugestão: usar `prefetchQuery` no servidor para a query principal da tela; ajustar `staleTime` quando fizer sentido; disparar queries independentes em paralelo.

---

## Registro progressivo

Achados recorrentes ou regras do projeto podem ser anotados aqui para não repetir.

| Item | Descrição |
|------|-----------|
| *(vazio por enquanto)* | Ex.: "Tabelas do módulo financeiro sempre devem ter RLS por member_id ou user_id." |

---

## Links

- security.md – políticas de auth e RLS do KPI F3F.
- [KPI F3F Supabase / Engenheiro de dados](.claude/skills/kpi-supabase-data-engineer/SKILL.md) – quem implementa RLS; esta skill audita.
- [KPI F3F Auth e Rotas](.claude/skills/kpi-auth-rotas/SKILL.md) – regra de não usar admin client em rotas de API.
