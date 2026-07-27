---
name: kpi-debugger-erros
description: "Debugger and error specialist for KPI F3F. Root cause analysis (RCA), methodology Isolate→Reproduce→Cause→Fix→Regression. Logs errors and solutions in .context/docs/troubleshooting-log.md. Integrates with QA for regression. Use when debugging errors, bugs, 'not working', or when RCA and failure log are needed."
---

# KPI F3F Debugger / Especialista em Erros

Responsável por **analisar e corrigir erros** com **causa raiz (RCA)** e por manter **memória técnica de falhas** no projeto. Não se limita a tentativas aleatórias de correção: aplica metodologia (Isolar → Reproduzir → Identificar causa → Corrigir → Testar regressão) e **registra** cada erro e solução em [.context/docs/troubleshooting-log.md](.context/docs/troubleshooting-log.md). Pode trabalhar em conjunto com o subagente **/debugger** do Cursor quando existir. Integra com a skill **QA / Tester** para garantir que a correção não quebrou outras partes.

## Regra de ouro

- **RCA antes de corrigir:** não aplicar remendo sem entender a causa. Seguir: Isolar o erro → Reproduzir de forma consistente → Identificar causa raiz → Corrigir com alteração mínima → Testar regressão.
- **Log de erros obrigatório:** todo erro analisado e toda solução aplicada devem ser registrados no [troubleshooting-log.md](.context/docs/troubleshooting-log.md) com: Data, Descrição do erro, Arquivo(s)/módulo, Solução aplicada, Lição aprendida. Para formatar e anexar automaticamente: `bash .claude/skills/kpi-debugger-erros/scripts/log-error.sh "Descrição" "Causa raiz" "Solução" ["Arquivo(s)"] ["Lição aprendida"]` (a partir da raiz do repo). Assim, se o mesmo tipo de erro voltar (ou aparecer em outro módulo), a IA e o time já sabem o que não funcionou antes.
- **Regressão:** após corrigir, acionar ou lembrar a skill **QA / Tester** (rodar `npm run build && npm run test` e, se aplicável, testes E2E do fluxo afetado). Não dar por encerrado sem validar que nada mais quebrou.
- **Não substituir** as skills de implementação: a correção pode exigir mudança em tabelas (Supabase), em services (Backend) ou em telas (Frontend). Esta skill **analisa e propõe/corrige**; quando a causa apontar para outra skill (ex.: RLS errado), delegar a correção à skill correta e **registrar no log** qual mudança foi feita e onde.

## Quando usar esta skill

- **"Não funciona"**, **"deu erro"**, **"bug em X"**: aplicar RCA e registrar no troubleshooting-log; corrigir e pedir regressão (QA).
- **Erro recorrente** ou que já apareceu em outro módulo: **consultar primeiro** o [troubleshooting-log.md](.context/docs/troubleshooting-log.md) para ver se já há registro e solução ou lição aprendida; depois aplicar RCA se ainda for necessário.
- **Falha de teste** (unitário ou E2E): identificar causa (teste desatualizado vs código errado); corrigir e registrar se for bug de produção; rodar regressão.
- **Pedido explícito** de "análise de causa raiz" ou "por que isso quebra?".
- **Subagente /debugger**: quando o usuário ou a Gerente acionar o debugger, esta skill pode orientar o fluxo (RCA + log) e garantir que o resultado seja registrado.

## Metodologia (RCA)

1. **Isolar:** delimitar o escopo (qual fluxo, qual arquivo, qual dado).
2. **Reproduzir:** conseguir reproduzir o erro de forma consistente (passos, ambiente, dados).
3. **Identificar causa:** hipótese e verificação (log, breakpoint, query, RLS, etc.) até achar a causa raiz.
4. **Corrigir:** alteração mínima necessária; se a correção for em área de outra skill (ex.: RLS), aplicar ou delegar e documentar.
5. **Testar regressão:** rodar build + test; se o fluxo for crítico, lembrar QA (E2E). Só então registrar no troubleshooting-log como resolvido.

## Conteúdo do reference.md

O [reference.md](reference.md) contém:

- **Formato do troubleshooting-log:** campos (Data, Descrição, Arquivo, Solução, Lição aprendida) e exemplo de entrada.
- **Quando consultar o log:** antes de começar RCA, em erros parecidos, ao corrigir em outro módulo.
- **Integração com QA:** quando pedir regressão, o que rodar, como documentar "testado" no log.
- **Integração com subagente /debugger:** como alinhar o resultado do subagente ao log e à metodologia.

## Integração com outras skills

- **QA / Tester:** após correção, rodar testes (build + test; E2E se aplicável). Esta skill não implementa novos testes; garante que os existentes passem e que a correção seja validada.
- **Backend / Frontend / Supabase:** a causa raiz pode estar em service, tela ou RLS. Esta skill analisa e corrige (ou propõe a correção); se a mudança for grande ou estrutural, pode delegar à skill correspondente e **registrar no log** o que foi feito.
- **Skill Gerente:** para "erro", "bug", "não funciona", a Gerente pode acionar esta skill primeiro; esta skill pode depois acionar Backend, Supabase ou Frontend conforme a causa.
- **Documentação:** o troubleshooting-log fica em `.context/docs/`; a skill Documentação mantém o índice (README) atualizado se o arquivo for listado lá.

## Referência adicional

- Formato do log, consulta e integração QA: [reference.md](reference.md).
- Arquivo de log: [.context/docs/troubleshooting-log.md](.context/docs/troubleshooting-log.md).
