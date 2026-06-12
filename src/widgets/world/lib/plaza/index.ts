// @ts-nocheck
// ─────────────────────────────────────────────
//  plaza — 중앙 광장 + 들판 소품
//  · 중앙: 물 흐르는 분수대 + 동서남북 벤치 4개 (전부 분수대를 바라봄)
//  · 테두리: 도시 소품 — 7개 길 입구(약 -148/-90/-32/5/27/103/141°)와
//    덤스터(65°)가 있는 각도는 비워둔다.
//  · 길가 장식(가로등·꽃·표지판·배럴)은 ./pathDecor 에서.
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadGlbProp } from '../helpers/loadGlbProp';
import { buildPathDecor } from './pathDecor';

const FLOOR_Y = 0.05; // 광장 바닥 타일 윗면
const deg = (d) => (d * Math.PI) / 180;

const FOUNTAIN_URL = '/glb/prop/Fountain.glb'; // Poly by Google — CC-BY 3.0 (크레딧 표기)
const BENCH_URL    = '/glb/prop/Bench.glb';    // Quaternius — CC0

//  광장 테두리 소품 (도시 느낌 소품만) — size: byWidth=true → 가로폭 / false → 높이
const RIM_DECOR = [
  { url: '/glb/prop/Street Light.glb', deg: -120, rad: 9.0, size: 3.4, byWidth: false, obstacle: 0.4 },  // J-Toastie CC-BY
  { url: '/glb/prop/Potted Plant.glb', deg: 122,  rad: 8.0, size: 0.9, byWidth: false, obstacle: 0.4 },  // Kenney CC0
  { url: '/glb/prop/Fire Hydrant.glb', deg: 160,  rad: 8.6, size: 0.8, byWidth: false, obstacle: 0.35 }, // J-Toastie CC-BY
  { url: '/glb/nature/Bush with Flowers.glb', deg: 196, rad: 8.3, size: 0.9, byWidth: false, obstacle: 0 },
];

// 길가·숲 빈터 소품 — buildNature 전에 실행되므로 obstacle 만 등록하면
// 나무가 이들을 피해 자란다 (잔디 위라 y=0).
const FIELD_DECOR = [
  // 피크닉 테이블 — 서쪽 공터 (민재의 명상 스팟, 게임기 링과 숲 사이)
  { url: '/glb/prop/Picnic Table.glb', x: -15.8, z: 2.5, ry: 0.6, size: 2.0, byWidth: true, obstacle: 1.2 },  // J-Toastie CC-BY
  // 수레 — 마켓 가는 곡선 길가, 길과 나란히 (행상 수레 느낌)
  { url: '/glb/prop/Cart.glb', x: -3.9, z: 17.6, ry: -0.2, size: 2.0, byWidth: true, obstacle: 1.1 },        // Quaternius CC0

  // ── 가람 뒤 개발자 야외 작업 공간 — 가람(0,-19.5)이 개발자라는 설정의 비네트 ──
  // 광장에서 가람을 바라보는 시선(남→북) 기준의 무대 구도:
  // 중앙 시야는 비워서 Computer Room(백드롭)이 바로 보이고, 칠판은 왼쪽 뒤에서
  // 광장 쪽을 향한다. 책상·장비는 양옆으로. obstacle 이 buildNature 전에
  // 등록되어 그 자리의 나무가 비워진다.
  { url: '/glb/prop/Whiteboard.glb',    x: -2.3, z: -21.3, ry: 0.2 - Math.PI / 2, size: 1.7, byWidth: false, obstacle: 0.6 },  // J-Toastie CC-BY — 보드 면이 광장(시청자) 쪽
  { url: '/glb/prop/Computer Desk.glb', x: 2.6,  z: -21.8, ry: -0.3,     size: 1.9,  byWidth: true,  obstacle: 1.0 },  // Zsky CC-BY
  { url: '/glb/prop/Office Chair.glb',  x: 2.4,  z: -20.9, ry: Math.PI - 0.3, size: 1.05, byWidth: false, obstacle: 0.5 }, // Quaternius CC0
  { url: '/glb/prop/Server Rack.glb',   x: 4.9,  z: -23.5, ry: -0.5,     size: 1.9,  byWidth: false, obstacle: 0.7 },  // Jeremy Eyring CC-BY
  { url: '/glb/prop/Chris Desk.glb',    x: -4.9, z: -23.3, ry: 0.8,      size: 1.8,  byWidth: true,  obstacle: 1.0 },  // Seth Plechas CC-BY
  { url: '/glb/prop/Scifi PC.glb',      x: -4.2, z: -25.9, ry: 0.5,      size: 1.5,  byWidth: false, obstacle: 0.8 },  // Nick Slough CC-BY
  { url: '/glb/prop/Super Computer.glb',x: 6.3,  z: -24.8, ry: -0.7,     size: 2.2,  byWidth: false, obstacle: 1.0 },  // Jeremy Eyring CC-BY — Computer Room 과 안 겹치게 우측 앞
  { url: '/glb/prop/Computer Room.glb', x: 0,    z: -27.5, ry: Math.PI,  size: 7.0,  byWidth: true,  obstacle: 3.6 },  // Bruno Oliveira CC-BY — 열린 정면이 광장 쪽
];

const FOUNTAIN_W   = 6.4; // 분수대 footprint 폭 (기본 3.2 의 2배)
const BENCH_RING_R = 5.4; // 분수대 둘레 벤치 반경 — 분수대(반경 ~3.2)에 안 가리게

export async function buildPlaza(ctx): Promise<void> {
  const { scene, obstacles, floaters } = ctx;

  await Promise.all([
    // ── 길가 장식 (가로등·꽃·표지판·배럴) ──
    buildPathDecor(ctx),
    // ── 중앙 분수대 ──
    (async () => {
      const fountain = await loadGlbProp(FOUNTAIN_URL, FOUNTAIN_W, true);
      fountain.position.set(0, FLOOR_Y, 0);
      scene.add(fountain);
      obstacles.push({ x: 0, z: 0, r: FOUNTAIN_W / 2 + 0.3 });

      // 물방울 보브 — 모델에 애니메이션이 없어서 ambient floaters 로 물 흐름 연출.
      const top = new THREE.Box3().setFromObject(fountain).max.y;
      const dropMat = new THREE.MeshStandardMaterial({ color: 0x9fdcf5, roughness: 0.2 });
      for (let i = 0; i < 4; i++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), dropMat);
        const a = (i / 4) * Math.PI * 2;
        drop.position.set(Math.cos(a) * 1.1, top - 1.0, Math.sin(a) * 1.1);
        scene.add(drop);
        floaters.push({ mesh: drop, baseY: top - 1.0, amp: 0.5, phase: a * 1.7, speed: 2.6 + i * 0.3 });
      }
    })(),
    // ── 분수대 둘레 벤치 — 동·서·남·북 하나씩, 분수대를 바라보게 ──
    ...[0, 90, 180, 270].map(async (d) => {
      const bench = await loadGlbProp(BENCH_URL, 1.7, true);
      const a = deg(d);
      const x = Math.cos(a) * BENCH_RING_R, z = Math.sin(a) * BENCH_RING_R;
      bench.position.set(x, FLOOR_Y, z);
      bench.rotation.y = Math.atan2(-x, -z);
      scene.add(bench);
      obstacles.push({ x, z, r: 0.9 });
    }),
    // ── 광장 테두리 소품 ──
    ...RIM_DECOR.map(async (p) => {
      const prop = await loadGlbProp(p.url, p.size, p.byWidth);
      const a = deg(p.deg);
      const x = Math.cos(a) * p.rad, z = Math.sin(a) * p.rad;
      prop.position.set(x, FLOOR_Y, z);
      prop.rotation.y = Math.atan2(-x, -z); // 광장 중심을 바라보게
      scene.add(prop);
      if (p.obstacle > 0) obstacles.push({ x, z, r: p.obstacle });
    }),
    // ── 길가·숲 빈터 소품 ──
    ...FIELD_DECOR.map(async (p) => {
      const prop = await loadGlbProp(p.url, p.size, p.byWidth);
      prop.position.set(p.x, 0, p.z);
      prop.rotation.y = p.ry;
      scene.add(prop);
      if (p.obstacle > 0) obstacles.push({ x: p.x, z: p.z, r: p.obstacle });
    }),
  ]);
}
