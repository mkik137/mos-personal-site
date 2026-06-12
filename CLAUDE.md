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

---

## 3D Assets — poly.pizza

월드의 GLB 모델은 **https://poly.pizza** 에서 다운로드해서 사용한다.

### 다운로드 절차

1. `https://poly.pizza/search/<키워드>` 에서 모델 탐색 (이름·작성자·모델 페이지 URL 확인)
2. 모델 페이지(`https://poly.pizza/m/<id>`)의 HTML 안에 직접 다운로드 URL이 박혀 있다:
   - GLB: `https://static.poly.pizza/<uuid>.glb`
   - 미리보기 이미지: 같은 uuid 의 `.jpg`
3. `curl` 등으로 받아서 `public/glb/<분류>/` 에 PascalCase 파일명으로 저장
4. 받은 직후 정점 수 확인 — 고폴리 모델은 렉의 주범
   (사례: Big Tree 35k tris 하나가 씬 삼각형의 58%를 차지해서 제거함)

### `public/glb/` 폴더 분류

```
building/          건물 (집·시장·창고)
nature/            자연물 (나무·덤불·바위·밭)
tile/              바닥 타일 (Floor Tile, Cobblestone)
prop/              소품 (덤스터·박스·가로등·벤치)
character/player/  플레이어 애니메이션 GLB
character/npc/     NPC 캐릭터 (애니메이션 내장 GLB)
room/              실내 씬 (가람이의 방 디오라마)
```

### 라이선스 (다운로드할 때마다 확인)

- **CC0 / Public Domain**: 표기 불필요 — 선호 작성자: Quaternius, Kenney, Kay Lousberg
- **CC-BY 3.0**: `src/views/home/ui/IntroScreen.tsx` 하단 크레딧에 작성자 추가 **필수**
  - 현재 표기 중: J-Toastie, Khor Chin Heong

### 코드에서 사용하는 로더

- 정적 프롭: `loadGlbProp(url, size, byWidth?)` (`widgets/world/lib/helpers/loadGlbProp.ts`)
  — 바닥-중심 정규화 wrapper 반환, `position.set(x, 0, z)` 로 바로 배치
- 대량 배치(나무·타일): `addInstanced` / `addTiles` (`helpers/tileField.ts`)
  — InstancedMesh 로 수백 개도 draw call 1회
- 스킨드 캐릭터: `loadAvatar(url, height)` (`entities/character`)
  — 스킨드 메시는 `frustumCulled=false` + 본 기준 정규화가 필수 (일반 Box3 측정은 부정확)
