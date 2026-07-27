---
name: kpi-organizar-repositorio
description: "Folder structure and repository organization for KPI F3F. Defines where to put files (src/app, src/modules, src/shared, src/infra), cleans up src/ and root, bulk moves files and keeps directory conventions. Use when defining or changing folder structure, moving files, or fixing disorganization."
---

# KPI F3F Organizar repositório

Responsável pela **estrutura de pastas** e por **onde colocar arquivos** no KPI F3F. Define o mapa de diretórios (src/app, src/modules, src/shared, src/infra, .context), desfaz bagunça em `src/` e na raiz, move arquivos em massa e mantém convenções. O **conteúdo** do código (limpeza, duplicação, refatoração) é da skill [Limpeza de código](.context/skills/kpi-limpeza-codigo/SKILL.md); esta skill cuida da **organização física** (pastas e localização dos arquivos). Referência: [AGENTS.md](AGENTS.md) (Repository Map) e [project-plan.md](.context/docs/project-plan.md).

## Regra de ouro

- **Estrutura de pastas** (mapa de diretórios, convenções) → esta skill.
- **Onde colocar** cada tipo de arquivo (página, service, componente, util) → esta skill.
- **Mover arquivos em massa** ou **reorganizar** pastas (ex.: criar novo módulo, desfazer bagunça) → esta skill.
- **Limpeza de conteúdo** (código morto, duplicação, refatoração) → skill [Limpeza de código](.context/skills/kpi-limpeza-codigo/SKILL.md); esta skill não altera o que está dentro dos arquivos, só onde eles ficam.

## Quando usar esta skill

- Definir ou **alterar a estrutura de pastas** do projeto (ex.: adicionar `src/shared/hooks/`, reorganizar módulos).
- Dúvida **"onde coloco este arquivo?"** (novo service, novo componente, util, tipo compartilhado) → consultar o [reference.md](reference.md) e colocar no diretório correto.
- **Desfazer bagunça**: arquivos em pastas erradas, nomes de pasta inconsistentes, raiz poluída; mover e renomear conforme o mapa.
- **Criar um novo módulo** do ponto de vista de pastas (ex.: `src/modules/educacional/` com subpastas services, repositories, components) – a lógica e o código são das skills Backend/Frontend; esta skill define a **estrutura de diretórios** do módulo.
- **Mover arquivos em massa** (ex.: extrair todos os utils para `src/shared/utils/`) sem mudar o conteúdo; atualizar imports após a movimentação.
- Atualizar **documentação de estrutura** (AGENTS.md, .context/docs) quando o mapa de diretórios mudar.

## Regras

- **Um mapa único:** a estrutura padrão está no [reference.md](reference.md); todo novo arquivo ou pasta deve seguir esse mapa. Exceções (ex.: pasta temporária, script fora de src) documentar no reference.
- **Mover sem quebrar:** ao mover arquivos, atualizar todos os imports; preferir **aliases** (`@/modules/*`, `@/shared/*`) em vez de caminhos relativos longos (ver [reference.md](reference.md) – Padrão de imports). Rodar `npm run build` (e testes) após reorganização.
- **Raiz limpa:** arquivos de configuração (package.json, tsconfig, tailwind.config, next.config, .env.example) na raiz; código de aplicação dentro de `src/` (e artefatos de IA em `.context/`). Evitar pastas ou arquivos soltos na raiz que deveriam estar em src ou .context.
- **Registro progressivo:** quando o projeto adotar uma convenção nova (ex.: pasta `src/domain/` para entidades compartilhadas), documentar no [reference.md](reference.md).

## Mapa de diretórios (resumo)

- **`src/app/`** – Next.js App Router (layouts, páginas, loading, error).
- **`src/modules/<modulo>/`** – por módulo (comercial, educacional, etc.): services, repositories, components, páginas do módulo quando aplicável.
- **`src/shared/`** – UI compartilhada, hooks, utils, tipos compartilhados entre módulos.
- **`src/infra/`** – cliente Supabase, auth, config de integrações.
- **`.context/`** – docs, skills, agents, workflow, logs; não é código de aplicação.

Detalhes e "onde colocar cada tipo" no [reference.md](reference.md) (neste diretório).

## Integração com outras skills

- **Limpeza de código:** conteúdo (remover morto, unificar); esta skill = onde os arquivos ficam. Ao extrair código para shared, a Limpeza pode indicar "mover para src/shared/utils"; esta skill garante que a pasta existe e que o arquivo vai para o lugar certo.
- **Backend / Frontend / Componentes:** definem o que vai dentro de cada arquivo; esta skill define em qual pasta o arquivo vive.
- **Documentação:** ao mudar estrutura, atualizar AGENTS.md (Repository Map) e índice em `.context/docs/README.md` se necessário.

## Referência adicional

- Mapa completo, onde colocar cada tipo de arquivo e convenções: [reference.md](reference.md) (neste diretório).
- Repository Map do projeto: [AGENTS.md](AGENTS.md).
