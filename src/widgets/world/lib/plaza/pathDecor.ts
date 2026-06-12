// @ts-nocheck
// ─────────────────────────────────────────────
//  pathDecor — 길가 장식 (가로등·꽃무리·표지판·배럴)
//  길 중심선(pathPoints)을 따라 자동 배치한다. buildNature 전에 실행되어
//  obstacle 만 등록하면 나무가 이들을 피해 자란다.
//  종류별 InstancedMesh 라 모델당 draw call 1회.
// ─────────────────────────────────────────────
import { addInstanced } from '../helpers/tileField';
import { PATHS, pathPoints } from '../layout';

const LAMP_URL = '/glb/prop/Street Light.glb'; // J-Toastie — CC-BY 3.0 (크레딧 표기)

// 길 중심선의 t 지점에서 수직으로 off 만큼 벗어난 좌표 (cx/cz = 중심선 위 원점)
function spotAt(pts, t, off) {
  const idx = Math.round((pts.length - 1) * t);
  const [x, z] = pts[idx];
  const [ax, az] = pts[Math.max(0, idx - 1)];
  const [bx, bz] = pts[Math.min(pts.length - 1, idx + 1)];
  const dx = bx - ax, dz = bz - az;
  const dl = Math.hypot(dx, dz) || 1;
  return { x: x + (-dz / dl) * off, z: z + (dx / dl) * off, cx: x, cz: z };
}

export async function buildPathDecor(ctx): Promise<void> {
  const { scene, obstacles } = ctx;
  const isClear = (x, z, margin) =>
    !obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < (o.r || 0) + margin);

  // ── 가로등 — 구간마다 좌→우→좌 지그재그 (대칭 쌍이 아니라 실제 골목처럼) ──
  const lampCells = [];
  for (const p of PATHS) {
    const pts = pathPoints(p);
    const count = Math.max(1, Math.round(pts.length / 5)); // 점 간격 ≈2m → 약 10m 마다 1개
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const s = spotAt(pts, (i + 0.5) / count, 2.4 * side);
      if (!isClear(s.x, s.z, 1.2)) continue; // 게임기·소품과 겹치는 자리는 건너뛴다
      // 모델의 램프 암이 로컬 +90° 방향으로 뻗어 있어 보정 — 빛 머리가 길 쪽을 향하게
      lampCells.push({ x: s.x, z: s.z, ry: Math.atan2(s.cx - s.x, s.cz - s.z) + Math.PI / 2 });
      obstacles.push({ x: s.x, z: s.z, r: 0.4 });
    }
  }

  // ── 꽃무리(통행 가능) · 표지판(길 입구) · 배럴(건물 앞 길 끝) ──
  const flowerCells = [];
  const signCells = [];
  const barrelCells = [];
  PATHS.forEach((p, pi) => {
    const pts = pathPoints(p);
    // 꽃무리 — 길마다 2~3곳 랜덤 (긴 길은 3곳)
    const n = pts.length > 10 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const t = 0.15 + Math.random() * 0.7;
      const off = (Math.random() < 0.5 ? -1 : 1) * (2.3 + Math.random() * 0.8);
      const s = spotAt(pts, t, off);
      if (!isClear(s.x, s.z, 0.9)) continue;
      flowerCells.push({ x: s.x, z: s.z, ry: Math.random() * Math.PI * 2, s: 0.8 + Math.random() * 0.5 });
    }
    // 표지판·배럴 — 건물로 가는 길(endShort≥4)에만
    if ((p.endShort || 0) >= 4) {
      const s = spotAt(pts, 0.07, pi % 2 ? 2.9 : -2.9); // 길 입구, 판이 길 쪽을 보게 (침범 방지 여유)
      if (isClear(s.x, s.z, 1.0)) {
        signCells.push({ x: s.x, z: s.z, ry: Math.atan2(s.cx - s.x, s.cz - s.z) });
        obstacles.push({ x: s.x, z: s.z, r: 0.35 });
      }
      const b = spotAt(pts, 0.93, pi % 2 ? -3.0 : 3.0); // 건물 앞 길 끝 (배럴이 통통해서 여유 크게)
      if (isClear(b.x, b.z, 1.0)) {
        barrelCells.push({ x: b.x, z: b.z, ry: Math.random() * Math.PI * 2, s: 0.9 + Math.random() * 0.2 });
        obstacles.push({ x: b.x, z: b.z, r: 0.55 });
      }
    }
  });

  await Promise.all([
    addInstanced(scene, { url: LAMP_URL, baseSize: 3.4, cells: lampCells }),
    addInstanced(scene, { url: '/glb/prop/Flower Group.glb', baseSize: 0.55, cells: flowerCells, castShadow: false }), // Quaternius CC0
    addInstanced(scene, { url: '/glb/prop/Wooden Sign.glb',  baseSize: 1.5,  cells: signCells }),                      // J-Toastie CC-BY
    addInstanced(scene, { url: '/glb/prop/Barrel.glb',       baseSize: 1.0,  cells: barrelCells }),                    // Quaternius CC0
  ]);
}
