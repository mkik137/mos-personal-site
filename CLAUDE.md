# CLAUDE.md — Project Conventions

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict)
- **Architecture**: Feature-Sliced Design (FSD)
- **Dev port**: 3020

---

## Architecture: Feature-Sliced Design (FSD)

```
src/
├── app/          ← Next.js App Router (routing only — no business logic)
├── views/        ← Page-level components rendered by app/ routes
├── widgets/      ← Composite UI blocks (header, sidebar, feed…)
├── features/     ← User interactions / use-cases (auth, like, comment…)
├── entities/     ← Business entities (user, post, product…)
└── shared/       ← Framework-agnostic reusables (ui, lib, api, config, types)
```

### Layer rules (strict — never violate)

| Layer | Can import from |
|-------|----------------|
| `app` | `views`, `widgets`, `features`, `entities`, `shared` |
| `views` | `widgets`, `features`, `entities`, `shared` |
| `widgets` | `features`, `entities`, `shared` |
| `features` | `entities`, `shared` |
| `entities` | `shared` |
| `shared` | nothing above (no upward imports) |

**Upper layers NEVER import from lower layers in reverse.** e.g. `shared` must not import from `features`.

### Slice structure (inside each layer except `app` and `shared`)

```
features/auth/
├── ui/           ← React components for this slice
├── model/        ← state, hooks, store slices
├── api/          ← server calls specific to this feature
├── lib/          ← helpers used only within this slice
└── index.ts      ← public API — only export what other layers need
```

Every slice **must** expose a single `index.ts` public API. Importing directly from internal paths (e.g. `features/auth/model/store`) is forbidden — use the slice barrel only.

### `shared/` structure

```
shared/
├── ui/           ← base design-system components (Button, Input…)
├── api/          ← axios/fetch base instance, interceptors
├── lib/          ← pure utilities (formatDate, cn…)
├── config/       ← env vars, constants
└── types/        ← global TypeScript types / interfaces
```

---

## File & Naming Conventions

- **Components**: PascalCase file + folder (`UserCard/index.tsx` or `UserCard.tsx`)
- **Hooks**: `use` prefix, camelCase (`useAuthSession.ts`)
- **Utilities / helpers**: camelCase (`formatDate.ts`)
- **Types / interfaces**: PascalCase, no `I` prefix (`UserProfile`, not `IUserProfile`)
- **CSS**: plain `ComponentName.css` co-located with component (NOT CSS Modules — the world engine
  (`widgets/world`) and `features/guestbook` drive the DOM imperatively via global selectors/classes,
  so class names must stay literal). `shared/styles/globals.css` holds only design tokens, reset, fonts.
- **Barrel files**: every slice root has `index.ts` — never skip it

---

## TypeScript Rules

- `strict: true` always on
- No `any` — use `unknown` + type guard if type is genuinely unknown
- Prefer `type` over `interface` for data shapes; `interface` for extendable contracts
- All async functions return explicit `Promise<T>`
- No implicit `undefined` returns

---

## Next.js App Router Guidelines

- `app/` contains only routing files: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Actual page content lives in `src/views/<route>/ui/Page.tsx`, imported by `app/<route>/page.tsx`
- Server Components by default; add `"use client"` only when necessary (event handlers, browser APIs, hooks)
- Data fetching lives in `entities` or `features` layer, not inside `app/`

---

## Import Alias

Configure `tsconfig.json` paths:

```json
"paths": {
  "@/app/*":      ["./src/app/*"],
  "@/views/*":    ["./src/views/*"],
  "@/widgets/*":  ["./src/widgets/*"],
  "@/features/*": ["./src/features/*"],
  "@/entities/*": ["./src/entities/*"],
  "@/shared/*":   ["./src/shared/*"]
}
```

Always use these aliases — no relative `../../../` imports crossing layer boundaries.

---

## What NOT to do

- Do not put business logic in `app/` route files
- Do not import from a slice's internal path — use the `index.ts` barrel
- Do not create god-components; split by FSD slice
- Do not use `any`
- Do not mix Server and Client Component concerns in one file
