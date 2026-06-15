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
  - 현재 표기 중: J-Toastie, Khor Chin Heong, Poly by Google, Zsky,
    Jeremy Eyring, Bruno Oliveira, Seth Plechas, Nick Slough

### 코드에서 사용하는 로더

- 정적 프롭: `loadGlbProp(url, size, byWidth?)` (`widgets/world/lib/helpers/loadGlbProp.ts`)
  — 바닥-중심 정규화 wrapper 반환, `position.set(x, 0, z)` 로 바로 배치
- 대량 배치(나무·타일·길가 소품): `addInstanced` / `addTiles` (`helpers/tileField.ts`)
  — InstancedMesh 로 수백 개도 draw call 1회. `y` 옵션으로 들뜸 보정(땅에 심기) 가능
- 스킨드 캐릭터: `loadAvatar(url, height)` (`entities/character`)
  — 스킨드 메시는 `frustumCulled=false` + 본 기준 정규화가 필수 (일반 Box3 측정은 부정확)
  — 정확한 시각 크기는 `skeleton.update()` 후 skinned `computeBoundingBox` 로 실측
    (`wanderer/createWanderer` 참고; 씬에 추가되기 전엔 boneMatrices 가 갱신 안 됨)

---

## 월드 엔진 (`widgets/world/lib`)

`world.ts` 는 오케스트레이터(루프·이벤트·이동·카메라·POI)이고, 콘텐츠는 서브모듈로 위임한다.

### 모듈 맵

```
world.ts            오케스트레이터 — init/loop/입력/카메라/상호작용 라우팅/실내 입퇴장
constants.ts        색상 팔레트·MAP_SCALE·ISLAND_R/WALK_R
layout.ts           건물 좌표·길(PATHS, pathPoints)·예약 구역·scatter
island/             지형·광장/길 타일
decor/              아케이드 게임기·뽑기·가챠·풍선
plaza/              광장 소품(분수대·벤치·테두리) + pathDecor.ts(가로등·꽃·표지판·배럴)
nature/             나무(InstancedMesh)·덤불·바위·밭 + 덤스터/쓰레기(퀘스트 오브젝트)
poi/                고정 POI (가람 NPC·스튜디오·방명록 건물)
orchard/            과수원 (사과나무 + 줍기용 사과 — 과일가게 사장 배달 퀘스트)
player/             플레이어 캐릭터 (Mixamo 애니메이션)
wanderer/           배회 NPC 공통 로직 + villagers.ts(주민 데이터 — 주민 추가는 여기만)
                    + buildStoryNpcs(경비·과일가게 사장 — 기존 GLB 재사용)
inventory.ts        I 키 가방 — 아이템 add/remove·스택 + 우측하단 미니맵(updateMinimap)
                    + 마을 지도 캔버스(villageMapURL, 실제 월드 좌표) + 별도 지도창(openMap)
dialogue.ts         자막 대화 엔진 (타이핑·예/아니오 선택지) — 훅 주입(initDialogue)
dialogueLines.ts    모든 대사 텍스트 + 화자별 색상(SPEAKER_COLORS) — 대사 수정은 여기만
quest.ts            큐비 쓰레기 퀘스트 (수락/줍기/배출/보고) — 의존성 주입(initQuest)
questChain.ts       경비→가람 전시회→과일 줍기·배달→큐비→엔딩 순차 게이트 체인.
                    각 퀘스트는 "완료 → 준 NPC에게 보고(✓ 풍선)해야 다음 진행"(아래 패턴).
                    배달 타임어택(50초·S/A/B)·시작/완료 배너·목표 HUD·타깃 화살표.
                    의존성 주입(initQuestChain) — 단계 전환은 goStage, 말풍선은 refreshBubbles
room/ gallery/ party/  실내 씬 3종 (가람이의 방·작업&경력 갤러리·방명록 파티룸)
helpers/            loadGlbProp·tileField·exitDoor·interactMarker·questBubble·questMark
                    (퀘스트 "?" 마크)·makeTextPlane 등
```

> HUD(React, `views/home/ui`)는 엔진이 명령형으로 구동: `QuestHud`(#quest-objective 목표·
> #delivery-timer/#delivery-result 배달·#ending-banner), `QuestBanner`(#quest-banner 완료 배너),
> `Minimap`(#minimap), `MapWindow`(#map-window), `InventoryPanel`(#inventory) — 모두 정적 DOM 을
> React 가 렌더하고 questChain/quest/inventory 가 클래스·텍스트를 토글한다 (CSS 가 literal 셀렉터인 이유).

### 핵심 패턴

- **ctx 객체**: 빌더들은 `{ scene, obstacles, pois, spinners, floaters, pulsers }` 를 공유.
  `obstacles` 는 충돌 + 후속 배치 회피, `pois` 는 상호작용 지점(`world.ts tryInteract` 가
  `id`/`type` 으로 라우팅). 움직이는 POI 는 `follow: object3d` 로 좌표 자동 동기화.
- **빌드 순서가 곧 회피 규칙**: `buildDecor → buildPlaza → buildNature` 순서라
  먼저 obstacle 을 등록한 소품을 나무·스캐터가 알아서 피해 자란다.
- **실내 시스템**: 실내는 섬 밖 좌표(방 220 / 갤러리 260 / 파티룸 300)에 지어두고
  `enterInterior/exitInterior` 로 텔레포트. 배경 돔(입장 중에만 visible),
  이동 클램프(`indoor.halfX/halfZ`), 카메라 고정(회전·줌 잠금) + 연출 앵글,
  `addExitDoor`(나가기 문) + `addInteractMarker`(E 키캡 표시)가 표준 구성.
- **표면 높이**: 타일(광장·길) 윗면 = **0.02**. 광장 위 소품·NPC floorY 도 0.02 로 맞출 것.
- **앰비언트 애니메이션**: `spinners`(회전)·`floaters`(보브)·`pulsers`(색 펄스)에
  push 만 하면 루프가 알아서 돌린다 — 디스코볼·물방울·말풍선·마커가 모두 이 방식.
- **퀘스트 체인 "보고 후 진행"**: 퀘스트 목표를 채워도 바로 넘어가지 않고 `*Ready` 플래그를
  세운 뒤, 준 NPC와 대화(보고)해야 `goStage` 로 다음 단계로 간다. 머리 위 퀘스트 마크는
  `refreshBubbles` 가 단계로 결정 — **"?"(받기/진행 중) vs ✓(`check`, 완료 보고 대기)**.
  정적 NPC(가람)는 `helpers/questBubble`, 배회 NPC는 `wanderer` 자체 말풍선('dots'→?·'check'→✓).
  단계마다 시작 배너(`showQuestStart`)·완료 배너(`showQuestComplete`)를 띄운다.

### 검증 방법 (필수 습관)

- 모든 변경 후 `npx tsc --noEmit`.
- 시각·동선 변경은 Playwright 헤드리스로 실제 확인:
  `window.__dbg = { pois, player, camState }` 를 init 에 **임시로** 넣고
  스크립트에서 텔레포트/키 입력/스크린샷 → 확인 후 **반드시 제거**.
  (소프트웨어 렌더링이라 ~3FPS — 타이핑·이동 대기 시간을 넉넉히 잡을 것)
