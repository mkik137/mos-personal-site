# 가람의 섬 — Next.js + TypeScript

WASD로 걸어다니며 NPC·건물에 다가가면 콘텐츠가 열리는 탐험형 3D 포트폴리오를
**Next.js 14 (App Router) + TypeScript + three.js**로 옮긴 프로젝트입니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

빌드 / 프로덕션 실행:

```bash
npm run build
npm start
```

## 조작

- **W A S D** — 이동
- **Space** — 점프
- **마우스 드래그** — 시점 회전 · **휠** — 줌
- **E** — NPC 대화 / 건물 입장
- 모바일: 좌측 가상 조이스틱 + 우측 점프 버튼

## 구조

```
app/
  layout.tsx      루트 레이아웃 + 메타데이터/뷰포트, globals.css 로드
  page.tsx        화면 마크업(HUD·패널·인트로)을 JSX로, useEffect에서 월드 부팅
  globals.css     전체 스타일 (원본 world.css)
src/widgets/world/lib/
  world.ts        three.js 월드 엔진 — 섬/캐릭터(시바견)/이동/카메라/상호작용/블룸
  poi/index.ts    NPC·건물 POI 배치 및 상호작용 등록
src/features/guestbook/lib/
  guestbook.ts    방명록 목업 (localStorage). window.__initGuestbook 등록
```

## 변환 메모

- 원본 `assets/world.js` → `src/widgets/world/lib/world.ts`. 최상단 자동 실행(`init()`)을 제거하고
  `initWorld()`를 export하도록 바꿔, React가 `useEffect`에서 클라이언트에서만
  초기화합니다(SSR 안전 + StrictMode 이중 실행 가드 포함).
- three 애드온(EffectComposer/RenderPass/UnrealBloomPass) 동적 import 경로를
  importmap 방식(`three/addons/*`)에서 npm 패키지 경로(`three/examples/jsm/*`)로
  변경했습니다.
- `src/widgets/world/lib/world.ts`는 포팅된 3D 코드라 파일 상단에 `// @ts-nocheck`를 두었습니다.
  타입을 점진적으로 도입하려면 이 줄을 지우고 보강하면 됩니다.
- 방명록·소개·작업 콘텐츠는 데모용 더미입니다. `app/page.tsx`(텍스트)와
  `src/widgets/world/lib/world.ts`의 `COL`·POI 좌표 등에서 실제 내용으로 교체하세요.

## 디버그 훅

브라우저 콘솔에서 `window.__world`로 상태 확인/조작이 가능합니다.
예: `window.__world.getState()`, `window.__world.teleport(0, 3)`.
