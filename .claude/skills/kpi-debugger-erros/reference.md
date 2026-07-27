# Referência – KPI F3F Debugger / Especialista em Erros

Formato do log de erros, quando consultar e integração com QA e subagente. **Registro progressivo:** convenções adotadas (ex.: formato de Data, tags por módulo) podem ser documentadas aqui.

---

## Arquivo de log: troubleshooting-log.md

**Local:** [.context/docs/troubleshooting-log.md](.context/docs/troubleshooting-log.md).

**Script para nova entrada:** execute `bash .cursor/skills/kpi-debugger-erros/scripts/log-error.sh "Descrição" "Causa raiz" "Solução" ["Arquivo(s)/Módulo"] ["Lição aprendida"]` (a partir da raiz do repo) para formatar e anexar a entrada ao log. Os dois últimos argumentos são opcionais; se omitidos, o script insere *(preencher se necessário)* — revise o arquivo depois para completar.

Cada entrada deve ter:

| Campo | Conteúdo |
|-------|----------|
| **Data** | Data (YYYY-MM-DD) ou data+hora se relevante. |
| **Descrição** | O que quebrou: mensagem de erro, comportamento observado, contexto (módulo, fluxo). |
| **Arquivo(s) / Módulo** | Onde o erro se manifestou ou onde estava a causa (arquivo, tabela, rota). |
| **Causa raiz** | Resumo da causa identificada (ex.: RLS faltando filtro por user_id; estado não atualizado após submit). |
| **Solução** | O que foi feito para corrigir (alteração mínima; se migration ou service, indicar onde). |
| **Lição aprendida** | O que evitar no futuro ou padrão a seguir (ex.: "sempre filtrar por aluno_id em tabelas do módulo"; "não usar admin client em API route"). |

Exemplo de entrada (Markdown):

```markdown
### 2025-02-06 – Aluno vê dados de outro na lista de matrículas
- **Descrição:** Na tela de matrículas, usuário A via matrículas do usuário B.
- **Arquivo(s):** `educacional_matriculas` (RLS); `MatriculaRepository.ts`.
- **Causa raiz:** Política RLS da tabela não filtrava por `aluno_id` na cláusula USING.
- **Solução:** Migration ajustando RLS para `USING (aluno_id = auth.uid()::text ou equivalente)`; regressão via QA.
- **Lição aprendida:** Em tabelas por aluno, RLS deve sempre incluir filtro por aluno_id (ou user_id conforme vínculo). Consultar skill Entidades centrais e Security & Performance antes de nova tabela.
```

---

## Quando consultar o log

- **Antes de começar RCA:** verificar se há entrada similar (mesmo erro, mesmo módulo, mesmo tipo de causa). Pode poupar tempo e evitar repetir solução que já falhou.
- **Erro em novo módulo:** se o padrão for parecido com um erro já registrado em outro módulo, aplicar a lição aprendida e, se necessário, nova entrada no log.
- **Revisão de PR:** se a mudança tocar em área que já teve erro documentado, checar se a correção está alinhada à lição aprendida.

---

## Integração com QA (regressão)

- **Após toda correção:** rodar `npm run build && npm run test`. Se o projeto tiver E2E para o fluxo afetado, rodar também (ex.: Playwright).
- **Na entrada do log:** no campo Solução, indicar "Regressão: build + test (e E2E do fluxo X) executados; OK."
- **Se a correção quebrar outro teste:** tratar como novo problema (RCA do teste que falhou: teste desatualizado vs efeito colateral da correção); ajustar e registrar se for lição aprendida (ex.: "ao alterar RLS de tabela Y, verificar testes que mockam essa tabela").

---

## Integração com subagente /debugger (Cursor)

- Se o projeto tiver subagente **debugger** (`.cursor/agents/debugger.md` ou comando `/debugger`), esta skill pode:
  - **Antes:** indicar que o debugger deve seguir RCA e que o resultado será registrado no troubleshooting-log.
  - **Depois:** pegar o resultado (causa, solução) e **adicionar entrada** no [troubleshooting-log.md](.context/docs/troubleshooting-log.md) com os campos acima; em seguida lembrar regressão (QA).
- A skill não substitui o subagente; garante que a **memória técnica** (log) seja atualizada e que a **regressão** seja feita.

---

## Links

- [troubleshooting-log.md](.context/docs/troubleshooting-log.md) – arquivo de log.
- [KPI F3F QA / Tester](.context/skills/kpi-qa-tester/SKILL.md) – testes e regressão.
- [skills-map.md](.context/docs/skills-map.md) – quando usar a skill Debugger.
