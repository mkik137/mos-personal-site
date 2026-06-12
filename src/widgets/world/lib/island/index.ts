// @ts-nocheck
import * as THREE from 'three';
import { COL, ISLAND_R, MAP_SCALE as S } from '../constants';
import { addTiles } from '../helpers/tileField';
import { PATHS, pathPoints } from '../layout';

const PLAZA_R    = 6.4 * S;  // 중앙 광장 반경 ≈ 9.6
const GRASS_TILE = 4.0;      // 잔디 타일 한 칸 크기
const FLOOR_TILE = 2.2;      // 광장 바닥 타일 크기 (작게 — 캐릭터 가림 방지)
const COBBLE_TILE = 2.4;     // 코블스톤 길 타일 크기

export async function buildIsland({ scene }) {
  // ── 섬 본체 (형태/두께) — 잔디 타일이 위에 깔리고, 타일 사이 틈은 이 녹색이 보임 ──
  // 베이스 색을 잔디 타일과 비슷한 진한 녹색으로 맞춰, 타일 틈이 "빈 곳"으로 안 보이게 한다.
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 1.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x5a9c3e, roughness: 0.95 }),
  );
  top.position.y = -0.7;
  top.receiveShadow = true;
  scene.add(top);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R - 0.4, ISLAND_R * 0.32, 12, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: COL.grassSide, roughness: 1, side: THREE.DoubleSide }),
  );
  soil.position.y = -7.2;
  scene.add(soil);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(ISLAND_R * 0.32, 9, 64),
    new THREE.MeshStandardMaterial({ color: COL.soil, roughness: 1 }),
  );
  tip.position.y = -17.4;
  tip.rotation.x = Math.PI;
  scene.add(tip);

  // ── 광장 베이스 디스크 (Floor 타일 밑 깔끔한 원형 바닥) ──
  // 윗면을 타일(anchorTop y≈0.05)보다 확실히 아래(≈ -0.02)로 내려 타일이 항상 위에 보이게.
  const plazaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAZA_R, PLAZA_R, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: COL.path, roughness: 0.9 }),
  );
  plazaBase.position.y = -0.08; // 윗면 ≈ -0.02 (타일보다 아래)
  plazaBase.receiveShadow = true;
  scene.add(plazaBase);

  // 모든 길(직선·곡선)의 중심선 점들 — 잔디 제외 + 코블스톤 배치에 공용
  const paths = PATHS.map((p) => pathPoints(p));
  const allPathPts = paths.flat();
  const nearPath = (x, z, d) => allPathPts.some(([px, pz]) => Math.hypot(x - px, z - pz) < d);

  // ── 잔디 타일은 사용 안 함 — 베이스 바닥(진녹색)이 잔디 역할 ──
  //    (타일 틈으로 빈 곳이 보이는 문제 때문에 제거)

  // ── 중앙 광장: Floor Tile ──
  const floorCells = [];
  for (let x = -PLAZA_R; x <= PLAZA_R; x += FLOOR_TILE) {
    for (let z = -PLAZA_R; z <= PLAZA_R; z += FLOOR_TILE) {
      if (Math.hypot(x, z) <= PLAZA_R - 0.4) floorCells.push({ x, z });
    }
  }
  // anchorTop: 타일 윗면을 지면에 맞추고 두께는 지면 아래로 → 캐릭터를 가리지 않음
  await addTiles(scene, { url: '/glb/tile/Floor Tile.glb', tile: FLOOR_TILE, cells: floorCells, y: 0.05, anchorTop: true });

  // ── 건물로 이어지는 길: Cobblestone (2칸 폭, 곡선 따라감) ──
  const cobbleCells = [];
  for (const pts of paths) {
    for (let i = 0; i < pts.length; i++) {
      const [cx, cz] = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const dl = Math.hypot(dx, dz) || 1;
      const ux = dx / dl, uz = dz / dl;       // 접선
      const perpx = -uz, perpz = ux;          // 수직
      const ry = Math.atan2(ux, uz);
      for (const off of [-COBBLE_TILE * 0.5, COBBLE_TILE * 0.5]) {
        cobbleCells.push({ x: cx + perpx * off, z: cz + perpz * off, ry });
      }
    }
  }
  // 코블은 잔디(윗면 0.05)보다 살짝 위(0.1)에 깔아, 길 아래로 채운 잔디가 비치지 않게.
  await addTiles(scene, { url: '/glb/tile/Cobblestone tile.glb', tile: COBBLE_TILE, cells: cobbleCells, y: 0.1, anchorTop: true });
}
