# Referência – KPI F3F Organizar repositório

Mapa de diretórios e convenções de onde colocar arquivos. **Registro progressivo:** alterações na estrutura (novas pastas, exceções) documentar aqui e em AGENTS.md quando for mudança de scaffolding.

---

## Mapa de diretórios (padrão)

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (rotas)/
│   ├── api/                # API routes
│   └── ...
├── modules/                # Lógica por domínio/módulo
│   ├── comercial/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── components/     # componentes específicos do módulo
│   │   └── ...
│   ├── educacional/
│   └── ...
├── shared/                 # Compartilhado entre módulos
│   ├── ui/                 # Componentes UI (ou da skill Componentes)
│   ├── hooks/
│   ├── utils/
│   └── types/              # Tipos/interfaces compartilhados (se houver)
└── infra/                  # Conexão banco, Supabase, auth
    ├── supabase/
    └── ...

.context/                   # Docs, skills, agents, artefatos de IA
├── docs/
├── skills/
├── agents/
├── workflow/
└── ...
```

Raiz: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `.env.example`, etc. Código de aplicação em `src/`; artefatos e contexto de IA em `.context/`.

---

## Onde colocar cada tipo de arquivo

| Tipo | Diretório | Observação |
|------|-----------|------------|
| **Páginas e layouts (App Router)** | `src/app/` | Rotas conforme estrutura de pastas do Next.js. |
| **API routes** | `src/app/api/` | Ex.: `src/app/api/deliveries/route.ts`. |
| **Services (casos de uso)** | `src/lib/<modulo>/services/` | Ex.: `PessoaService.ts`. |
| **Repositories** | `src/lib/<modulo>/repositories/` | Ex.: `MemberRepository.ts`. |
| **Entidades/tipos do módulo** | `src/lib/<modulo>/entities/` ou `types/` | Quando específicos do módulo. |
| **Componentes de tela do módulo** | `src/lib/<modulo>/components/` | Componentes que não são reutilizados fora do módulo. |
| **Componentes UI compartilhados** | `src/components/ui/` | Ou conforme skill Componentes (inputs padronizados). |
| **Hooks compartilhados** | `src/lib/` | Ex.: useAuth, useForm. |
| **Utilitários compartilhados** | `src/lib/utils.ts` | Formatação, validação, helpers. |
| **Tipos compartilhados** | `src/lib/types.ts` ou `src/lib/` | Quando usados por mais de um módulo. |
| **Cliente Supabase, auth, config** | `src/lib/` | Factory, createClient, env. |
| **Testes** | Junto ao arquivo (`*.spec.ts`) ou `__tests__/` no módulo | Convenção do projeto. |
| **E2E** | `e2e/` ou `tests/e2e/` na raiz | Quando adotado (ver skill QA). |
| **Documentação** | `.context/docs/` | ADRs, arquitetura, project-plan. |
| **Skills e agents** | `.claude/skills/`, `.context/agents/` | Não mover para src. |

---

## Convenções de pastas

- **Módulos:** nome em minúsculo, singular ou conforme lista do projeto (comercial, educacional, estoque, financeiro, etc.).
- **Subpastas por módulo:** `services/`, `repositories/`, `components/`, `entities/` ou `types/` quando fizer sentido; um padrão único para todos os módulos (ver skill Backend).
- **shared:** não criar muitas subpastas sem necessidade; `ui/`, `hooks/`, `utils/` (e `types/` se existir) são suficientes para começar.
- **infra:** não colocar regras de negócio; só conexões, clientes e config.

---

## Padrão de imports (aliases)

Utilizar **aliases** (definidos em `tsconfig.json` ou `next.config`) para diretórios raiz, em vez de caminhos relativos longos (`../../../../`). Isso reduz quebras ao mover arquivos e deixa imports mais legíveis.

| Alias (sugestão) | Aponta para | Uso |
|------------------|-------------|-----|
| **@/lib/\*** | `src/lib/` | Imports de módulos (services, repositories, components do módulo). |
| **@/lib/\*** | `src/lib/` | Utilitários, UI comum, hooks, types compartilhados. |
| **@/app/\*** | `src/app/` | Layouts, páginas, API routes (quando fizer sentido). |
| **@/infra/\*** | `src/lib/` | Cliente Supabase, auth, config. |

Exemplo: `import { Button } from '@/components/ui/Button'` em vez de `import { Button } from '../../../shared/ui/Button'`. Ao mover o arquivo, o import continua válido. Definir os paths em `tsconfig.json` (ex.: `"paths": { "@/*": ["./src/*"] }`); Next.js e TypeScript usam essa config.

---

## Desfazer bagunça (checklist)

- Arquivos de **código de aplicação** fora de `src/` → mover para o diretório correto dentro de `src/` conforme a tabela acima.
- **Pasta com nome inconsistente** (ex.: `ModuloComercial` em vez de `comercial`) → renomear para o padrão (minúsculo, singular).
- **Raiz** com muitos arquivos ou pastas que são código → mover para `src/` ou `.context/` conforme o caso.
- **Imports** quebrados após mover → atualizar todos os caminhos; **preferir aliases** (`@/lib/*`, `@/lib/*`) em vez de relativos longos; rodar build e testes.
- **Documentação:** atualizar AGENTS.md (seção Repository Map) e `.context/docs/README.md` se a estrutura tiver mudado de forma relevante.

---

## Registro progressivo

Alterações na estrutura que forem adotadas pelo projeto (ex.: nova pasta `src/lib/` para entidades compartilhadas).

| Item | Descrição |
|------|------------|
| *(vazio por enquanto)* | Ex.: "Criada pasta src/domain para entidades Pessoa, membro compartilhadas." |

---

## Links

- [AGENTS.md](AGENTS.md) – Repository Map (seção 2).
- [project-plan.md](.context/docs/project-plan.md) – stack e estrutura.
- [KPI F3F Limpeza de código](.claude/skills/kpi-limpeza-codigo/SKILL.md) – conteúdo dos arquivos; esta skill = onde ficam.
- [KPI F3F Backend](.claude/skills/kpi-backend/SKILL.md) – estrutura de pastas por módulo (services, repositories).
