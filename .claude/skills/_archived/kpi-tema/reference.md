# KPI F3F Tema — Reference (templates e detalhes)

Snippets prontos para adicionar um tema. Substitua `meu-tema` (id, kebab-case), `MEU_TEMA` (constante) e `MeuTema` (PascalCase) pelos valores reais.

---

## 1. `src/shared/themes/types.ts`

```ts
export type SgtTemaId = "padrao" | "copa-2026" | "festa-junina" | "meu-tema"

export const SGT_TEMA_MEU_TEMA_ID: SgtTemaId = "meu-tema"

export const SGT_TEMA_IDS: SgtTemaId[] = [
  SGT_TEMA_PADRAO_ID,
  SGT_TEMA_COPA_ID,
  SGT_TEMA_FESTA_JUNINA_ID,
  SGT_TEMA_MEU_TEMA_ID,
]
```

- `SGT_TEMA_DEFAULT_ID` so muda se o tema novo virar o padrao do sistema.
- Se precisar de um icone de selo novo, amplie `SgtTemaSealIcon` (ex.: `"trophy" | "flame" | "star"`) e trate o icone onde o selo e renderizado (`HubPageContainer` e `AppHeader`).

## 2. `src/shared/themes/registry.ts`

```ts
{
  id: SGT_TEMA_MEU_TEMA_ID,
  nome: "Meu Tema",
  descricao: "Descricao curta do clima visual do tema.",
  previewImage: "/themes/meu-tema.webp",
  bgImage: "/themes/meu-tema.webp",
  bgOverlayClass: "bg-black/35", // ajustar para legibilidade do texto branco
  hubSeal: { label: "Meu Tema", icon: "flame" }, // icone deve existir em SgtTemaSealIcon
  headerBadge: "Tema ativo: Meu Tema",
  headerSubtitle: "HUB",
},
```

- Sem `bgImage` => `hasThemeBackground` retorna false (sem fundo). O `padrao` e exatamente assim.

## 3. `src/shared/themes/classes.ts`

Copie `SHELL_COPA`/`HUB_COPA` (ou Festa) como base e ajuste cores de acento. **Mantenha todas as chaves** das interfaces `ShellThemeClasses` e `HubThemeClasses` (build quebra se faltar uma).

```ts
const SHELL_MEU_TEMA: ShellThemeClasses = { /* ...todas as chaves, base = SHELL_COPA... */ }
const HUB_MEU_TEMA: HubThemeClasses = { /* ...todas as chaves, base = HUB_COPA... */ }

const SHELL_BY_TEMA: Record<SgtTemaId, ShellThemeClasses> = {
  padrao: SHELL_PADRAO,
  "copa-2026": SHELL_COPA,
  "festa-junina": SHELL_FESTA_JUNINA,
  "meu-tema": SHELL_MEU_TEMA,
}

const HUB_BY_TEMA: Record<SgtTemaId, HubThemeClasses> = {
  padrao: HUB_PADRAO,
  "copa-2026": HUB_COPA,
  "festa-junina": HUB_FESTA_JUNINA,
  "meu-tema": HUB_MEU_TEMA,
}
```

- **Importante (TS):** use a **chave literal** (`"meu-tema":`), nao `[SGT_TEMA_MEU_TEMA_ID]:` — o `Record<SgtTemaId, ...>` exige chaves literais e a forma computada quebra o build.
- Elementos do HUB com fundo escuro/glass: `glassPanel` deve ter `relative ... rounded-2xl ... backdrop-blur-xl`. Acentos por cor: trocar `amber`/`orange` da base pela paleta do tema.
- `copaSeal` e o estilo do "selo" no topo do painel; mantenha o formato pill, troque a cor.

## 4. `src/shared/config/hub-modulo-icon-styles.ts`

```ts
import { SGT_TEMA_COPA_ID, SGT_TEMA_FESTA_JUNINA_ID, SGT_TEMA_MEU_TEMA_ID } from "@/shared/themes/types"

export function getHubModuloIconClass(iconColor: IconColor, temaId?: SgtTemaId): string {
  if (temaId === SGT_TEMA_COPA_ID) return getHubModuloIconClassCopa(iconColor)
  if (temaId === SGT_TEMA_FESTA_JUNINA_ID) return getHubModuloIconClassFestaJunina(iconColor)
  if (temaId === SGT_TEMA_MEU_TEMA_ID) return getHubModuloIconClassMeuTema(iconColor)
  return REFINED_ICON_STYLES[iconColor] ?? REFINED_ICON_STYLES["bg-slate-500"]
}

const MEU_TEMA_ICON_STYLES: Record<IconColor, string> = {
  // 16 cores (mesmas chaves de REFINED_ICON_STYLES). Ex. por cor:
  "bg-blue-500": "rounded-2xl bg-blue-500/30 text-blue-50 ring-2 ring-amber-300/80 shadow-[0_0_18px_rgba(245,158,11,0.5)]",
  // ...demais cores...
}

export function getHubModuloIconClassMeuTema(iconColor: IconColor): string {
  return MEU_TEMA_ICON_STYLES[iconColor] ?? MEU_TEMA_ICON_STYLES["bg-slate-500"]
}
```

- **Cobrir as 16 chaves `IconColor`** (use `REFINED_ICON_STYLES` como lista de referencia). Faltar uma => undefined em runtime (cai no fallback `bg-slate-500`).
- Classes Tailwind devem ser **strings literais completas** (sem concatenacao dinamica) para o purge do Tailwind nao remove-las.
- `ModuloCard.tsx` ja chama `getHubModuloIconClass(mod.iconColor, temaId)`; card accent (`border-l-4`) e opcional e analogo ao `FESTA_JUNINA_CARD_ACCENT`.

## 5. Extras decorativos (opcional)

Para enfeites especificos do tema (ex.: bandeirinhas), seguir o padrao de `src/shared/ui/BandeirinhasJunina.tsx`:

- Componente **decorativo** `aria-hidden`, `pointer-events-none`.
- Renderizar **em fluxo** dentro do painel (primeiro filho), com bleed por margem negativa que casa com o padding do `glassPanel` (`-mx-5 -mt-5 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8`) e `overflow-hidden rounded-t-2xl`. **Nunca** `absolute` com `top` negativo (escapa do card e encosta no header).
- Animacao no `globals.css` com bloco de reducao:

```css
@keyframes meu-tema-anim { /* ... */ }
.meu-tema-elemento { animation: meu-tema-anim 3.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .meu-tema-elemento { animation: none; }
}
```

- Integrar em `HubPageContainer.tsx` condicionado ao tema:

```tsx
const isMeuTema = temaId === "meu-tema"
// dentro do glassPanel:
{isMeuTema ? <MeuTemaEnfeite /> : null}
```

## 6. Migration (DELEGAR a kpi-supabase-data-engineer)

Tabela singleton `public.sgt_tema_sistema`, coluna `tema_id` com CHECK. Ampliar:

```sql
ALTER TABLE public.sgt_tema_sistema DROP CONSTRAINT IF EXISTS sgt_tema_sistema_tema_id_check;
ALTER TABLE public.sgt_tema_sistema
  ADD CONSTRAINT sgt_tema_sistema_tema_id_check
  CHECK (tema_id IN ('padrao', 'copa-2026', 'festa-junina', 'meu-tema'));
COMMENT ON COLUMN public.sgt_tema_sistema.tema_id IS
  'Tema visual global: padrao | copa-2026 | festa-junina | meu-tema';
```

Sem isso, salvar o tema novo falha no banco mesmo com a UI listando o tema. Apos aplicar: regenerar tipos (`database.types.ts`) so se a estrutura mudou (CHECK nao muda tipo).

## 7. Imagem com `sharp`

Script ad-hoc (rodar com `node`), ajustando caminhos de origem/destino:

```js
const sharp = require("sharp")
sharp("origem.png")
  .resize(2560, 1440, { fit: "cover", position: "center" })
  .webp({ quality: 80 })
  .toFile("public/themes/meu-tema.webp")
  .then(() => console.log("ok"))
```

Conferir peso final (< 400 KB). Se passar, baixar `quality` ou simplificar a arte.

## 8. Testes

- `__tests__/shared/themes/registry.spec.ts`: garantir que `getTemaMeta("meu-tema")` retorna nome/`bgImage`/`previewImage` (`.webp`)/`hubSeal`/`bgOverlayClass` esperados e que esta em `SGT_TEMAS`.
- `__tests__/shared/themes/resolve-effective-tema.spec.ts`: `resolveEffectiveTemaId("/", "meu-tema") === "meu-tema"` e `resolveEffectiveTemaId("/educacional", "meu-tema") === "padrao"`.
- `src/app/(dashboard)/configuracoes/temas/__tests__/kpi-tema-actions.spec.ts`: admin consegue salvar `"meu-tema"`; nao-admin e bloqueado; `isSgtTemaId("meu-tema") === true`.

Rodar focado: `npm run test -- --testPathPatterns="themes|kpi-tema-actions"`.

## 9. Selecao na UI

`src/app/(dashboard)/configuracoes/temas/TemasContent.tsx` itera `SGT_TEMAS` automaticamente — o tema novo **ja aparece** no grid. So edite se quiser um icone especifico no titulo do card (hoje ha `Trophy` p/ copa, `Flame` p/ festa, `Palette` default).

## Notas de troubleshooting (licoes ja registradas)

- Tema aplica no HUB mas "some" nas demais rotas: **comportamento esperado** (`resolveEffectiveTemaId`).
- Mudou estilo mas nao aparece em producao: cache de assets — fazer **hard refresh (Ctrl+Shift+R)** apos deploy.
- Classe Tailwind do tema "nao funciona": provavelmente foi montada por concatenacao/dinamica e foi purgada — usar string literal completa no `Record`.
- Build quebra em `Record<SgtTemaId, ...>`: faltou chave de algum tema ou usou chave computada `[CONST]` em vez de literal.
