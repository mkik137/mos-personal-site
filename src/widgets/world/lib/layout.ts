// @ts-nocheck
// ─────────────────────────────────────────────
//  layout — 오브젝트 분산 배치 (충돌 회피 스캐터) + 예약 구역
//  나무·게임기 등을 섬 전체에 겹치지 않게 골고루 흩뿌린다.
// ─────────────────────────────────────────────
import { MAP_SCALE as S } from './constants';

// 장식용 건물(비-상호작용) — 섬 외곽 마을 백드롭. 좌표는 배율 적용.
//  fw = footprint 가로폭(loadGlbProp byWidth). 납작-넓은 모델(Market 등)도
//       폭 기준이라 일정한 크기로 정규화됨.
//  r  = 충돌/예약 반경 = fw/2 + 약간의 버퍼.
// 중심 반경 ~34, fw/2 ~4 → 바깥 끝 ~38 < 섬 반경 45 (절벽 밖으로 안 나감).
export const HOUSE_SPOTS = [
  { url: '/glb/building/Houses_SecondAge_1_Level2.glb', x: -19 * S, z: -12 * S, fw: 8.0, ry: 0.7,  r: 5.0 },
  { url: '/glb/building/Houses_SecondAge_2_Level2.glb', x:  19 * S, z: -12 * S, fw: 8.0, ry: -0.7, r: 5.0 },
  { url: '/glb/building/Market_FirstAge_Level2.glb',    x:  -5 * S, z:  21 * S, fw: 8.0, ry: 2.9,  r: 5.0 },
  { url: '/glb/building/Storage_SecondAge_Level2.glb',  x:  22 * S, z:   2 * S, fw: 8.5, ry: -1.6, r: 5.3 },
];

const PLAZA_R = 6.4 * S; // 중앙 광장 반경 ≈ 9.6

// 길 정의 — 광장 가장자리에서 각 목적지(POI·장식 건물)로.
//  to       : 목적지 [x, z]
//  curve    : 곡률 (진행방향 수직으로 제어점을 미는 비율, 0이면 직선)
//  endShort : 목적지 직전에서 멈추는 거리 (건물 안으로 안 들어가게)
// 직선/곡선을 섞어 다양성을 준다.
export const PATHS = [
  { to: [0, -13 * S],       curve: 0,     endShort: 0 },   // npc 가람 (직선)
  { to: [-17.5 * S, 14 * S], curve: 0.18,  endShort: 6 },   // studio 건물 (곡선)
  { to: [14 * S, 7 * S],    curve: 0,     endShort: 5.5 }, // 방명록 집 (직선, 문 앞에서 끝)
  { to: [-19 * S, -12 * S], curve: -0.32, endShort: 4 },   // Houses_1 (곡선)
  { to: [19 * S, -12 * S],  curve: 0,     endShort: 4 },   // NE 집 (직선)
  { to: [-5 * S, 21 * S],   curve: 0.38,  endShort: 4 },   // Market (곡선)
  { to: [22 * S, 2 * S],    curve: -0.3,  endShort: 4.25 },// Storage (동쪽, 곡선)
];

// 길 중심선 위 점들 — 광장 가장자리 시작 → 목적지 직전. 2차 베지어로 곡선 표현.
export function pathPoints(p) {
  const [tx, tz] = p.to;
  const tl = Math.hypot(tx, tz) || 1;
  const ux = tx / tl, uz = tz / tl;
  const sx = ux * PLAZA_R, sz = uz * PLAZA_R;      // 광장 가장자리에서 시작
  const short = p.endShort || 0;
  const ex = tx - ux * short, ez = tz - uz * short; // 목적지 직전에서 끝
  const dx = ex - sx, dz = ez - sz;
  const dl = Math.hypot(dx, dz) || 1;
  const px = -dz / dl, pz = dx / dl;                // 진행방향 수직
  const cAmt = (p.curve || 0) * dl;
  const cx = (sx + ex) / 2 + px * cAmt, cz = (sz + ez) / 2 + pz * cAmt; // 제어점
  const pts = [];
  const n = Math.max(4, Math.round(dl / 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, it = 1 - t;
    pts.push([
      it * it * sx + 2 * it * t * cx + t * t * ex,
      it * it * sz + 2 * it * t * cz + t * t * ez,
    ]);
  }
  return pts;
}

// 길 회랑(corridor) 회피 구역 — 나무/게임기가 길(곡선 포함) 위에 안 놓이도록.
export function pathCorridors() {
  const out = [];
  for (const p of PATHS) for (const [x, z] of pathPoints(p)) out.push({ x, z, r: 2.8 });
  return out;
}

// 흩뿌리기가 피해야 할 고정 구역 — 중앙 광장·플레이어 스폰·POI(가람/스튜디오/키오스크)·장식 건물.
export function reservedZones() {
  return [
    { x: 0, z: 0, r: 12 },           // 중앙 광장 + 플레이어 스폰
    { x: 0, z: -13 * S, r: 5.5 },    // NPC 가람
    { x: -17.5 * S, z: 14 * S, r: 8.0 }, // 스튜디오(집 건물, footprint ~12 — 주변 여유 확보)
    { x: 14 * S, z: 7 * S, r: 5 },    // 키오스크
    ...HOUSE_SPOTS.map((h) => ({ x: h.x, z: h.z, r: h.r + 1.0 })),
  ];
}

// 환형(annulus) 영역에 면적 균등 분포로 위치를 흩뿌린다.
// 각 위치는 avoid 구역 및 이미 배치된 위치와 최소거리 sep 를 지킨다.
export function scatter({ count, rMin, rMax, sep, avoid = [], maxTries = 600 }): Array<{ x: number; z: number }> {
  const placed = [];
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < maxTries; t++) {
      const ang = Math.random() * Math.PI * 2;
      // 면적 균등: rad = sqrt(rMin² + u(rMax²-rMin²))
      const rad = Math.sqrt(rMin * rMin + Math.random() * (rMax * rMax - rMin * rMin));
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;

      let ok = true;
      for (const a of avoid) {
        if (Math.hypot(x - a.x, z - a.z) < (a.r || 0) + sep) { ok = false; break; }
      }
      if (ok) {
        for (const p of placed) {
          if (Math.hypot(x - p.x, z - p.z) < sep) { ok = false; break; }
        }
      }
      if (ok) { placed.push({ x, z }); break; }
    }
  }
  return placed;
}
