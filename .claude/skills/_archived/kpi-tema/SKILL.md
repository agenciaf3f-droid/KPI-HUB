---
name: kpi-tema
description: Implementa e padroniza temas visuais globais do KPI F3F (ex.: Padrao, Copa, Festa Junina). Cobre regras, arquitetura, tamanho de imagem do background/preview, e o passo a passo completo de quais arquivos alterar e como, para adicionar ou editar um tema. Use ao criar/adicionar/remover um tema, trocar background ou preview, ajustar cores/glass do HUB, header, sidebar ou icones dos modulos por tema.
disable-model-invocation: true
---

# KPI F3F Tema — Implementacao de Temas do HUB

Skill de **implementacao** (estende Frontend/Componentes). Aplica um novo tema visual ao KPI F3F seguindo a arquitetura central de temas. **Nao** aplica DDL/migration (delega a `kpi-supabase-data-engineer`) e **nao** faz deploy (delega a `kpi-github-vercel`).

## Regra de ouro

- **Tema so no HUB:** o tema especial e renderizado **apenas na rota `/`** (HUB home). Em qualquer outra rota o sistema usa `padrao`. Isso e decidido por `resolveEffectiveTemaId` (`src/shared/themes/resolve-effective-tema.ts`) — **nao** mexer nessa regra ao adicionar um tema.
- **Registry e a fonte unica:** todo tema vive em `SGT_TEMAS` (`registry.ts`) + um ID em `types.ts`. Nunca espalhar `if (tema === "x")` pela app: estender os **mapas** (`SHELL_BY_TEMA`, `HUB_BY_TEMA`, dispatch de icones) e os metadados (`SgtTemaMeta`).
- **Sem booleanos por tema:** use `temaId` + lookup nos mapas. Booleans legados (`isCopa`) existem so por compatibilidade; para novo tema prefira `isHubThemed` (qualquer tema != padrao) ou comparar `temaId`.
- **Persistencia e admin-only:** o tema ativo fica na tabela singleton `sgt_tema_sistema` (Supabase). Ampliar o ID exige migration no CHECK (delegar). Salvar e restrito a admin (`actions-tema.ts`).
- **Acessibilidade:** elementos decorativos sao `aria-hidden`; toda animacao respeita `prefers-reduced-motion` no `globals.css`.
- **Validar antes de entregar:** `npm run build && npm run test` verdes; depois delegar commit/push/deploy.

## Especificacao de imagem (obrigatoria)

| Item | Valor |
|------|-------|
| **Background** | 16:9, **2560x1440 px**, `.webp` (AVIF/WebP), **< 400 KB** |
| **Preview** (card de selecao) | mesma arte; pode reutilizar o `bgImage` |
| **Local** | `public/themes/<id>.webp` (servido como `/themes/<id>.webp`) |
| **Composicao** | **centro limpo** (sem elementos fortes no meio): o painel/cards do HUB ficam por cima; decore bordas/topo/rodape |
| **Contraste** | arte deve permitir overlay escuro (`bgOverlayClass`, ex.: `bg-black/30`) mantendo legibilidade do texto branco |

Gerar/otimizar com `sharp` (ja instalado): resize para 2560x1440, `fit: cover`, output `.webp` qualidade ~80. Conferir o peso final (< 400 KB).

## Passo a passo (checklist)

Copie e acompanhe:

```
Tema novo:
- [ ] 1. types.ts: ID + constante + SGT_TEMA_IDS (+ seal icon se novo)
- [ ] 2. Imagem: public/themes/<id>.webp (2560x1440, webp, <400KB, centro limpo)
- [ ] 3. registry.ts: entrada em SGT_TEMAS (meta completo)
- [ ] 4. classes.ts: SHELL_<TEMA> + HUB_<TEMA> + registrar em SHELL_BY_TEMA/HUB_BY_TEMA
- [ ] 5. hub-modulo-icon-styles.ts: <TEMA>_ICON_STYLES + getter + dispatch (+ card accent opcional)
- [ ] 6. (opcional) Extras decorativos: componente src/shared/ui + animacao globals.css + integrar no HubPageContainer
- [ ] 7. Migration (DELEGAR kpi-supabase-data-engineer): ampliar CHECK de sgt_tema_sistema.tema_id
- [ ] 8. Testes: registry.spec / resolve-effective-tema.spec / kpi-tema-actions.spec
- [ ] 9. npm run build && npm run test (verdes)
- [ ] 10. Commit/push/deploy (DELEGAR kpi-github-vercel) + lembrar hard refresh (cache)
```

### Resumo dos arquivos (o que mexer)

| Arquivo | O que fazer |
|---------|-------------|
| `src/shared/themes/types.ts` | Adicionar literal ao `SgtTemaId`, constante `SGT_TEMA_<X>_ID`, incluir em `SGT_TEMA_IDS`. Se houver selo novo, ampliar `SgtTemaSealIcon`. |
| `src/shared/themes/registry.ts` | Novo objeto em `SGT_TEMAS` com `id, nome, descricao, previewImage, bgImage, bgOverlayClass, hubSeal, headerBadge, headerSubtitle`. |
| `src/shared/themes/classes.ts` | Criar `SHELL_<TEMA>` e `HUB_<TEMA>` (copiar de Copa/Festa e ajustar cores) e **registrar nos `Record<SgtTemaId, ...>`** `SHELL_BY_TEMA` e `HUB_BY_TEMA` usando a **chave literal** (ex.: `"meu-tema": HUB_MEU_TEMA`). |
| `src/shared/config/hub-modulo-icon-styles.ts` | `<TEMA>_ICON_STYLES: Record<IconColor,string>`, `getHubModuloIconClass<Tema>()` e um `if (temaId === ...)` em `getHubModuloIconClass`. Card accent (`border-l-*`) opcional. |
| `src/app/(dashboard)/HubPageContainer.tsx` | So se houver **extras decorativos** condicionais ao tema (ex.: bandeirinhas). Selo do HUB ja e generico via `getTemaMeta().hubSeal`. |
| `src/shared/ui/AppHeader.tsx` / `AppSidebar.tsx` / `ChatbotWidget.tsx` | Normalmente **nada**: ja consomem `isHubThemed`, `shell` e `temaMeta`. Mexer so se o tema exigir comportamento novo. |
| `src/app/globals.css` | So se criar animacao para extras (incluir bloco `@media (prefers-reduced-motion: reduce)`). |
| `supabase/migrations/*.sql` | **Delegar:** ampliar `CHECK (tema_id IN (...))` de `sgt_tema_sistema`. |
| Imagens | `public/themes/<id>.webp` (background e/ou preview). |
| Testes | `__tests__/shared/themes/registry.spec.ts`, `resolve-effective-tema.spec.ts`, `.../temas/__tests__/kpi-tema-actions.spec.ts`. |

### Pipeline de render (para entender o fluxo)

`sgt_tema_sistema` (Supabase) -> layout le tema -> `resolveEffectiveTemaId(pathname, temaSistema)` (Copa/Festa so em `/`) -> `SgtThemeShell` aplica `data-kpi-theme`, `--kpi-bg-image` (de `getTemaBgImage`), background + overlay -> `SgtThemeProvider` expoe `temaId/isHubThemed/shell/hub` -> componentes consomem `useSgtTheme()`.

## Conflitos / integracao (Skill Gerente)

- **Banco (CHECK/RLS/migration):** exclusivo da `kpi-supabase-data-engineer`. Esta skill **nao** roda DDL.
- **Novo componente reutilizavel em `src/shared/ui`:** alinhar com `kpi-componentes`.
- **Deploy/commit/PR:** `kpi-github-vercel`.
- **Regressao:** `kpi-qa-tester` (build + test). Esta skill so trata apresentacao do tema.

## Referencia

- Templates de codigo (snippets prontos por arquivo), geracao de imagem com `sharp`, padrao de extras decorativos e snippets de teste: [reference.md](reference.md).
