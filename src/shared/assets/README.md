# shared/assets — 번들 정적 에셋

컴포넌트에서 **import**해서 쓰는 이미지·SVG. 빌드 시 번들에 포함되어 해싱·최적화된다.

```
src/shared/assets/
├── icons/     ← SVG 아이콘 (logo.svg, arrow.svg …)
└── images/    ← png · jpg · webp
```

## 사용법

```tsx
// 정적 이미지 import — StaticImageData 반환 (width/height/blur 자동)
import logo from "@/shared/assets/icons/logo.svg";
import hero from "@/shared/assets/images/hero.png";
import Image from "next/image";

<Image src={hero} alt="hero" placeholder="blur" />
<img src={logo.src} alt="logo" />
```

## `public/` 와의 구분

| | `src/shared/assets/` | `public/` |
|---|---|---|
| 참조 | `import` | URL 문자열 (`/icons/logo.svg`) |
| 번들 | O (해싱·최적화) | X (그대로 서빙) |
| 적합 | 컴포넌트가 쓰는 UI 에셋 | favicon · og 이미지 · 큰 파일 |

## SVG를 React 컴포넌트(`<Logo />`)로 쓰려면

기본은 정적 경로 import만 지원한다. `<Logo />` 형태가 필요하면 `@svgr/webpack`을
설치하고 `next.config.mjs`에 webpack 규칙을 추가해야 한다 — 필요할 때 요청.
