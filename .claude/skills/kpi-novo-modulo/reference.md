# Referência – KPI F3F Novo módulo

Checklist para criar um novo módulo no HUB: **card no dashboard**, **rotas**, **menu** (e sub-opções), **config** e scaffold. **Registro progressivo:** cada módulo criado deve ser listado na tabela ao final.

---

## Checklist de criação (ordem obrigatória para fundação)

| # | Passo | Onde / como | Conferir |
|---|--------|-------------|----------|
| 1 | **Nome e id** | Esta skill | Normalizar nome → id (minúsculo, kebab-case). Verificar se id já existe em "Módulos criados", `modulos-por-role.ts`, `src/modules/`, `src/app/`. |
| 2 | **Card no dashboard** | `src/shared/config/modulos-por-role.ts` | Adicionar id em `ORDEM_APROVADA`; em `TODOS_MODULOS`: `id`, `nome`, `href: /<id>`, `descricao`, `icon` (nome Lucide), `iconColor` (tipo `IconColor` do arquivo). Em `MODULOS_POR_ROLE`: incluir id em `admin` (e em comercial/educacional se fizer sentido). **Ícones já no ModuloCard (ICON_MAP):** BarChart3, BookOpen, Briefcase, Building2, CalendarDays, DollarSign, GraduationCap, Globe, Headphones, MessageSquare, Package, Settings, ShoppingBag, ShoppingCart, Sparkles, Users. Se usar outro, adicionar import + entrada em `src/shared/ui/ModuloCard.tsx`. |
| 3 | **Rotas e scaffold** | Script ou manual | Rodar `bash .cursor/skills/kpi-novo-modulo/scripts/create-module-full.sh <id>`: cria `src/modules/<id>/` (services, repositories, entities, components, dtos) e `src/app/<id>/page.tsx`. A página inicial deve seguir o padrão (header com "← Início", título do módulo); ver `src/app/configuracoes/page.tsx` como referência. |
| 4 | **Menu (sub-opções do módulo)** | `src/shared/config/submodulos-por-modulo.ts` | Se o arquivo existir: adicionar entrada para `moduloId: id` com array de NavItem (ex.: `{ label: "Início", href: "/<id>", icon: "LayoutDashboard" }`). Se não existir: criar o arquivo com a função que retorna sub-itens por módulo e incluir o novo módulo com ao menos um item placeholder. Assim o sidebar, quando usado dentro do módulo, já terá dados. |
| 5 | **Tabelas no Supabase (se necessário)** | Skill Supabase | Tabelas com FK para entidades centrais; RLS. Só quando o módulo tiver dados próprios. |
| 6 | **Backend (services + repositories)** | Skill Backend | Após scaffold; ao menos um service e um repository quando houver domínio. |
| 7 | **Proteção e perfil** | Auth e Rotas | Rotas do módulo protegidas; perfil com acesso ao módulo. |
| 8 | **Integração (se necessário)** | Integrações e vínculos | Contrato antes de integrar com outro módulo ou satélite. |
| 9 | **Documentação** | Esta skill + Documentação | Atualizar tabela "Módulos criados" neste reference; Documentação atualiza project-plan e índice. |
| 10 | **Testes** | QA | Conforme política do projeto. |

---

## Estrutura padrão do módulo

```
src/modules/<nome-modulo>/
├── services/           # Casos de uso (ex.: ContratoService.ts)
├── repositories/       # Acesso Supabase (ex.: ContratoRepository.ts)
├── components/         # Componentes específicos do módulo (telas, formulários)
├── entities/           # Entidades ou tipos do domínio do módulo (ou types/)
├── dtos/               # DTOs de entrada/saída (sufixo Dto; ver skill Backend)
└── (opcional) types/   # Se preferir types/ em vez de entities/
```

O script `scripts/create-module-full.sh` cria essa árvore e a página inicial em `src/app/<modulo>/page.tsx` (rota plana, sem grupo). Uso: `bash .cursor/skills/kpi-novo-modulo/scripts/create-module-full.sh <modulo>` (a partir da raiz do repo).

- **services/:** uma classe por arquivo; sufixo `Service`; recebem repositories no construtor.
- **repositories/:** uma classe por arquivo; sufixo `Repository`; encapsulam acesso ao Supabase; referenciam apenas IDs das entidades centrais nas tabelas.
- **components/:** componentes React usados só neste módulo; para compartilhados, usar `src/shared/ui/`.
- **entities/ ou types/:** tipos ou classes de domínio do módulo; entidades **centrais** (Pessoa, Aluno) ficam em `shared` ou `domain`, não aqui.

Páginas e rotas do módulo ficam em **`src/app/`** (Next.js App Router), por ex.: `src/app/comercial/page.tsx`. A lógica de negócio fica nos services/repositories do módulo.

---

## Entidades centrais e tabelas do módulo

- **Não criar** tabela de "aluno" ou "usuário" dentro do módulo. Usar sempre **FK** para as tabelas centrais (ex.: `aluno_id`, `user_id`, `pessoa_id`).
- **Tabelas específicas do módulo:** nome claro (ex.: `comercial_contratos`, `educacional_matriculas`) ou schema por módulo, conforme convenção do projeto (definida na skill Supabase).
- **RLS:** políticas que garantem que o usuário só acessa dados permitidos pelo perfil; por módulo quando fizer sentido (ex.: perfil "comercial" acessa apenas dados do Comercial).

---

## Módulos criados (registro progressivo)

Listar aqui cada módulo criado com esta skill para manter histórico e alinhamento com project-plan. **Atualizar esta tabela imediatamente após rodar o script de scaffold** (passo 2), para evitar conflitos de nomenclatura e registro desatualizado.

| Módulo | Descrição breve | Status | Observação |
|--------|------------------|--------|------------|
| gestao-de-pessoas | Cadastro central de pessoas (entidade única); tabela `pessoas` já existente. | Em progresso | Card no dashboard (admin); rota /gestao-de-pessoas; scaffold em src/modules/gestao-de-pessoas. |
| gestao-de-eventos | Planejamento e controle de eventos. | Fundação criada | Card no dashboard (admin); rota /gestao-de-eventos; scaffold em src/modules/gestao-de-eventos; ícone CalendarDays (teal-500); sub-opções: Início, Eventos, Calendário. |
| patrimonio | Bens e inventário (importado do PatrimonioGlobal). | Implementado | Rotas em src/app/(dashboard)/patrimonio/; tabelas patrimonio_* no Supabase; responsáveis = pessoa + setor (ModalSelecionarPessoa); cadastros (setores, categorias, tipos, motivos, responsáveis, produtos), processos (vincular, desvincular, transferir, ocorrência), relatórios. Ver mapa-traducao-patrimonio-global.md. |
| suporte | Chamados, protocolo, filas, SLA, timeline (MVP Fase 1). | Implementado | Rotas em `src/app/(dashboard)/suporte/`; módulo em `src/modules/suporte/`; migration `supabase/migrations/20260324120000_suporte_modulo_fase1.sql`; cron `GET /api/cron/suporte-sla` (Vercel + `CRON_SECRET`). Submenu: Painel, Meus chamados, Novo, Admin. |
| *(outros)* | | | Preencher ao criar. |

A lista completa de módulos planejados está em [project-plan.md](.context/docs/project-plan.md). **Mentores** e **Guia do Aluno** não são mais módulos do dashboard; são sub-opções do módulo **Educacional** (menu lateral ao entrar em Educacional).

---

## Links

- [project-plan.md](.context/docs/project-plan.md) – objetivos, módulos, regras.
- [architecture.md](.context/docs/architecture.md) – HUB, princípios, componentes.
- [kpi-organizar-repositorio/reference.md](.context/skills/kpi-organizar-repositorio/reference.md) – mapa de diretórios.
- [kpi-backend/reference.md](.context/skills/kpi-backend/reference.md) – convenções de services e repositories.
- [kpi-integracoes-vinculos/reference.md](.context/skills/kpi-integracoes-vinculos/reference.md) – contratos entre módulos.
