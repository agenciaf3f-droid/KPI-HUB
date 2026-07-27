---
name: kpi-documentacao
description: "Documentation for KPI F3F. Updates .context/docs, root README, ADRs and glossary; defines when and how to document (index, structure, pt-BR). Use when creating or changing documentation, adding ADR, updating glossary or index after scaffolding or architecture decisions."
---

# KPI F3F Documentação

Responsável por **quando e como documentar** no KPI F3F: manter `.context/docs/` atualizado, README da raiz, ADRs (Architecture Decision Records) e glossário. Garante que mudanças de estrutura, novas decisões ou novos módulos tenham reflexo na documentação e que o índice (`.context/docs/README.md`) e o AGENTS.md continuem corretos. Regra do AGENTS.md: atualizar documentação quando houver mudança em scaffolding ou estrutura.

## Regra de ouro

- **Atualizar `.context/docs/`** (índice, guias, novos docs) → esta skill.
- **Manter "Onde buscar"** no [.context/docs/README.md](.context/docs/README.md): quando surgir novo padrão centralizado (requisitos, componentes, mensagens, acessos, **integração e vínculos entre módulos**), incluir na tabela "Onde buscar (a busca no lugar certo)" para que agentes e devs encontrem em um único lugar. O doc integracao-e-vinculos-modulos.md é mantido em **conteúdo** pela skill Integrações e vínculos; esta skill mantém o **índice** e a entrada "Onde buscar" para esse doc.
- **Atualizar README** da raiz e do repositório quando a estrutura ou o onboarding mudar → esta skill.
- **Criar ou atualizar ADRs** (decisões de arquitetura) → esta skill.
- **Atualizar glossário** (termos de domínio, entidades, siglas) → esta skill.
- **Conteúdo técnico** de cada área (RLS, rotas, componentes) fica nas skills correspondentes; esta skill cuida da **organização**, **índice** e **coerência** da documentação e de quando criar/atualizar cada artefato.

## Quando usar esta skill

- **Mudança de scaffolding ou estrutura** (novas pastas, novo módulo, alteração no mapa de diretórios) → atualizar `.context/docs/README.md`, Document Map e, se aplicável, AGENTS.md (Repository Map); ver [reference.md](reference.md).
- **Nova decisão de arquitetura** (ex.: adoção de padrão X, mudança de fluxo de dados) → criar ADR em `` (ou `docs/adr/`) e referenciar no índice. Para gerar o boilerplate: `bash .claude/skills/kpi-documentacao/scripts/create-adr.sh "Título do ADR"` (na raiz do repo); em seguida **adicionar o ADR ao .context/docs/README.md**.
- **Novo termo de domínio** ou alteração de conceito (ex.: nova entidade, novo fluxo) → atualizar glossary.md e, se necessário, data-flow ou architecture.
- **Novo documento** em `.context/docs/` (ex.: guia de onboarding, playbook de deploy) → criar o arquivo e **adicionar ao índice** (README e Document Map).
- **Remoção ou renomeação** de doc → atualizar índice e links que apontam para o arquivo.
- **Pedido explícito** do usuário para "documentar X", "atualizar a documentação" ou "criar ADR para decisão Y".

## Regras

- **Índice sempre consistente:** todo documento em `.context/docs/` que for guia ou referência deve estar listado no [.context/docs/README.md](.context/docs/README.md) (Core Guides e/ou Document Map). Links quebrados (docs movidos ou renomeados) devem ser corrigidos.
- **Idioma:** documentação em **pt-BR** (AGENTS.md); exceções (ex.: nomes de libs, código) mantidas em inglês quando fizer sentido.
- **ADR:** formato curto (contexto, decisão, consequências); nome descritivo em snake_case (ex.: `001_uso_de_tanstack_query.md`). Script de boilerplate: `scripts/create-adr.sh "Título"`; após criar, **atualizar o índice** (.context/docs/README.md). Quando criar: decisões que afetam arquitetura, integração ou padrão do projeto; não criar ADR para mudança trivial.
- **Glossário:** um termo por entrada; definição curta; manter ordem ou agrupamento legível. Atualizar quando novo conceito ou entidade for introduzido no projeto (project-plan, módulos, entidades centrais).
- **Registro progressivo:** convenções adotadas (ex.: template de ADR, onde ficam guias de QA) podem ser documentadas no [reference.md](reference.md).

## O que atualizar (resumo)

| Evento | O que fazer |
|--------|-------------|
| Nova pasta ou módulo em `src/` | Atualizar AGENTS.md (Repository Map) se mudar mapa; atualizar .context/docs/README ou Organizar repositório reference se necessário. |
| Novo doc em .context/docs | Adicionar ao README (Core Guides ou Document Map) com link e descrição breve. |
| Decisão de arquitetura relevante | Criar ADR; adicionar link no README ou em architecture.md. |
| Novo termo / entidade / fluxo | Atualizar glossary.md; atualizar data-flow ou architecture se for fluxo ou componente. |
| Doc removido ou renomeado | Remover ou ajustar entrada no README; corrigir links em outros docs. |

Detalhes no [reference.md](reference.md) (neste diretório).

## Integração com outras skills

- **Organizar repositório:** ao mudar estrutura de pastas, esta skill atualiza AGENTS.md e índice de docs conforme combinado.
- **Supabase / Backend / Frontend / etc.:** o conteúdo técnico (como fazer RLS, como estruturar services) fica nas skills; esta skill garante que mudanças que afetem a **documentação geral** (data-flow, architecture, glossary) sejam refletidas.
- **Documentação gerada por outras skills** (ex.: UX mockup salvo em .context/docs): esta skill garante que o novo doc entre no índice.

## Referência adicional

- Estrutura do .context/docs, quando criar ADR, quando atualizar glossário, template e checklist: [reference.md](reference.md) (neste diretório).
- Índice atual: [.context/docs/README.md](.context/docs/README.md). Repository Map: [AGENTS.md](AGENTS.md).
