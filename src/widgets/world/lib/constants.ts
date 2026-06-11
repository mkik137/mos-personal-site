export const COL = {
  // bright village
  grassTop:   0x9fd17a,
  grassSide:  0xcaa86a,
  soil:       0x9c7b4f,
  path:       0xe9dcb8,
  trunk:      0x8a5a3b,
  accent:     0xff5b35,   // player / 소개
  blue:       0x2f6bff,   // studio
  green:      0x2bb673,   // guestbook
  studioWall: 0xf3ede1,
  studioRoof: 0xff5b35,
  kioskWall:  0xfff5e8,
  kioskRoof:  0x2f6bff,
  skin:       0xf3c39a,
  // arcade neon
  cyan:    0x21f0ff,
  magenta: 0xff2bd6,
  purple:  0x9a5cff,
  lime:    0x5dff9e,
  amber:   0xffb13c,
  hotpink: 0xff4d8d,
  cabinet: 0x2a2740,
  cabinet2:0x39243f,
};

export const SPRITES = {
  invader: ['00100100','00111100','01111110','11011011','11111111','01011010','10000001','01000010'],
  heart:   ['01100110','11111111','11111111','11111111','01111110','00111100','00011000','00000000'],
  smiley:  ['00111100','01000010','10100101','10000001','10100101','10011001','01000010','00111100'],
  star:    ['00011000','00011000','11111111','01111110','00111100','00111100','00100100','01000010'],
  ghost:   ['00111100','01111110','11011011','11111111','11111111','11111111','10101010','00000000'],
};

// 맵 레이아웃 배율 — 이 값 하나로 섬 크기와 모든 오브젝트 배치 간격을 조절한다.
// (오브젝트 자체 크기는 그대로, 좌표/반경만 스케일 → 콘텐츠가 넓게 분산됨)
export const MAP_SCALE = 1.5;

export const ISLAND_R = 30 * MAP_SCALE;  // 섬 반경
export const WALK_R   = 26 * MAP_SCALE;  // 이동 가능 반경
