// @ts-nocheck
// ─────────────────────────────────────────────
//  nature — GLB 자연물(소나무·꽃덤불·바위·밭·자갈) + 장식용 건물 배치
// ─────────────────────────────────────────────
import { WALK_R, ISLAND_R } from '../constants';
import { HOUSE_SPOTS, reservedZones, pathCorridors, scatter } from '../layout';
import { loadGlbProp } from '../helpers/loadGlbProp';
import { addInstanced } from '../helpers/tileField';

// 여러 종류의 나무를 섞어 다양하게 표현 (footprint 폭 기준으로 정규화 → 모델별 높이 자연스럽게 다름)
const TREE_MODELS = [
  '/glb/nature/Big Tree.glb',
  '/glb/nature/Pine.glb',
  '/glb/nature/Tree.glb',
  '/glb/nature/Tree2.glb',
];
const BUSH_URL   = '/glb/nature/Bush with Flowers.glb';
const ROCK_URL   = '/glb/nature/Rock.glb';
const CROP_URL   = '/glb/nature/Crops.glb';
const COBBLE_URL = '/glb/nature/Cobblestone tile.glb';

export async function buildNature(ctx): Promise<void> {
  const { scene, obstacles } = ctx;

  // ── 장식용 건물 (병렬 로드, 좌표는 layout 에 정의) ──
  await Promise.all(
    HOUSE_SPOTS.map(async (s) => {
      const b = await loadGlbProp(s.url, s.fw, true); // footprint(폭) 기준 스케일
      b.position.set(s.x, 0, s.z);
      b.rotation.y = s.ry;
      scene.add(b);
      // 충돌(obstacle) 반경은 실제 건물 면에 맞춰 타이트하게 (보이지 않는 벽 방지).
      // 나무 회피용 generous 반경은 reservedZones(s.r) 가 따로 담당.
      obstacles.push({ x: s.x, z: s.z, r: s.fw / 2 - 0.6 });
    }),
  );

  // 고정 회피 구역 (광장·POI·건물·돌길) — 스캐터 공통
  const zones = reservedZones().concat(pathCorridors());
  const avoidNow = () => zones.concat(obstacles); // obstacles 는 배치마다 늘어남

  // ── 소나무 — 길/광장/건물/게임기 제외하고 빼곡히 (InstancedMesh: 수백 그루도 1 draw call) ──
  // 격자+지터로 촘촘히 채우고, 각 그루에 충돌(obstacle)을 등록 → 길 외엔 못 지나감.
  const treeAvoid = avoidNow();
  const RMIN = 17;                 // 아케이드 링(반경 13)+여유 바깥부터 → 아케이드 침범 방지
  const RMAX = ISLAND_R - 2.5;     // 섬 가장자리 직전까지
  const STEP = 4.8;                // 나무 간격 — 키울수록 그루 수↓ (렉 완화)
  const CANOPY = 2.2;              // 나무 캐노피 여유 — 길/게임기 가장자리를 안 덮게
  const TREE_WIDTH = 3.4;          // footprint 가로폭(byWidth) — 종류별 높이는 자연스럽게 다름

  // 종류별로 셀을 나눠 모델당 InstancedMesh 1개씩 (모델당 draw call 1회)
  const cellsByModel = TREE_MODELS.map(() => []);
  for (let gx = -RMAX; gx <= RMAX; gx += STEP) {
    for (let gz = -RMAX; gz <= RMAX; gz += STEP) {
      const x = gx + (Math.random() - 0.5) * 1.6;
      const z = gz + (Math.random() - 0.5) * 1.6;
      const r = Math.hypot(x, z);
      if (r < RMIN || r > RMAX) continue;
      // 회피 구역(길·게임기·건물) 가장자리에서 캐노피 반경만큼 더 떨어뜨림
      if (treeAvoid.some((a) => Math.hypot(x - a.x, z - a.z) < (a.r || 0) + CANOPY)) continue;
      const mi = Math.floor(Math.random() * TREE_MODELS.length);
      cellsByModel[mi].push({ x, z, ry: Math.random() * Math.PI * 2, s: 0.85 + Math.random() * 0.4 });
      obstacles.push({ x, z, r: 1.5 }); // 캐노피 덮는 충돌 → 관통 방지(빽빽해서 길 외엔 막힘)
    }
  }
  // castShadow=false: 나무 그림자 패스가 렉의 주원인 → 끄면 큰 성능 향상 (그림자는 계속 받음)
  for (let mi = 0; mi < TREE_MODELS.length; mi++) {
    await addInstanced(scene, { url: TREE_MODELS[mi], baseSize: TREE_WIDTH, byWidth: true, cells: cellsByModel[mi], castShadow: false });
  }

  // ── 밭(Crops) — 외곽 농가 분위기, 통행 막음 ──
  const cropSpots = scatter({ count: 3, rMin: 24, rMax: WALK_R - 2, sep: 9, avoid: avoidNow() });
  for (const p of cropSpots) {
    const crop = await loadGlbProp(CROP_URL, 5.0, true); // footprint(폭) 기준
    crop.position.set(p.x, 0, p.z);
    crop.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2); // 밭은 직각 회전이 자연스러움
    scene.add(crop);
    obstacles.push({ x: p.x, z: p.z, r: 2.2 });
  }

  // ── 바위 — 중소형, 통행 막음 ──
  const rockSpots = scatter({ count: 10, rMin: 12, rMax: WALK_R - 1, sep: 5, avoid: avoidNow() });
  for (const p of rockSpots) {
    const rock = await loadGlbProp(ROCK_URL, 0.7 + Math.random() * 0.9);
    rock.position.set(p.x, 0, p.z);
    rock.rotation.y = Math.random() * Math.PI * 2;
    scene.add(rock);
    obstacles.push({ x: p.x, z: p.z, r: 0.8 });
  }

  // ── 꽃덤불 — 낮은 장식, 밟고 지나갈 수 있게 장애물 미등록 ──
  const bushSpots = scatter({ count: 16, rMin: 10, rMax: WALK_R - 1, sep: 3.0, avoid: avoidNow() });
  for (const p of bushSpots) {
    const bush = await loadGlbProp(BUSH_URL, 1.0 + Math.random() * 0.5);
    bush.position.set(p.x, 0, p.z);
    bush.rotation.y = Math.random() * Math.PI * 2;
    scene.add(bush);
  }

  // ── 자갈 타일 — 땅에 깔리는 포장 패치 (장식, 통행 가능) ──
  const cobbleSpots = scatter({ count: 6, rMin: 11, rMax: WALK_R - 2, sep: 7, avoid: avoidNow() });
  for (const p of cobbleSpots) {
    const cobble = await loadGlbProp(COBBLE_URL, 2.2 + Math.random() * 1.0, true);
    cobble.position.set(p.x, 0.02, p.z); // 잔디와 z-fighting 방지로 살짝 띄움
    cobble.rotation.y = Math.random() * Math.PI * 2;
    scene.add(cobble);
  }
}
