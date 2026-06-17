// @ts-nocheck
// ─────────────────────────────────────────────
//  island2 — 게임기 포털로 이동하는 두 번째 섬 (네온 아케이드 섬)
//  메인 섬에서 멀리 떨어진 좌표(ISLAND2_CENTER)에 지어두고, 포털 상호작용으로
//  텔레포트한다. 모든 애니메이터는 region:'island2' 로 태그 → 메인 섬에 있을 땐
//  루프가 자동으로 멈춘다 (world.ts 의 region 게이팅 참고).
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';

// 실내 씬(방 220 / 갤러리 260 / 파티룸 300)·마을 섬이 안개 far(175) 너머로 완전히
// 묻히도록 충분히 멀리 둔다 — 카메라가 닿는 최근접 지점에서도 다른 콘텐츠까지 >175.
export const ISLAND2_CENTER = { x: 600, z: 0 };
export const ISLAND2_R = 16;     // 섬 반경
export const ISLAND2_WALK = 13;  // 이동 가능 반경
export const ISLAND2_SPAWN = { x: ISLAND2_CENTER.x, z: ISLAND2_CENTER.z + 7 };

export async function buildIsland2(ctx) {
  const { scene, pois, spinners, floaters, pulsers } = ctx;
  const cx = ISLAND2_CENTER.x, cz = ISLAND2_CENTER.z;
  const REGION = 'island2';

  const root = new THREE.Group();
  root.position.set(cx, 0, cz);
  scene.add(root);

  // ── 섬 본체 (윗면 y≈0) — 어두운 네온 보랏빛 지형 ──
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND2_R, ISLAND2_R, 1.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a2148, roughness: 0.9 }),
  );
  top.position.y = -0.7;
  top.receiveShadow = true;
  root.add(top);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND2_R - 0.4, ISLAND2_R * 0.3, 10, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1a1530, roughness: 1, side: THREE.DoubleSide }),
  );
  soil.position.y = -5.7;
  root.add(soil);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(ISLAND2_R * 0.3, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x140f24, roughness: 1 }),
  );
  tip.position.y = -14.7;
  tip.rotation.x = Math.PI;
  root.add(tip);

  // ── 플로어 디스크 (윗면 ≈ 0.02, 메인 섬 타일 표면 높이와 동일) ──
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND2_WALK + 1.5, ISLAND2_WALK + 1.5, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a2f63, roughness: 0.85 }),
  );
  floor.position.y = -0.04; // 윗면 ≈ 0.02
  floor.receiveShadow = true;
  root.add(floor);

  // ── 발광 격자 테두리 링 (네온) ──
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND2_WALK + 0.6, 0.18, 8, 80),
    new THREE.MeshBasicMaterial({ color: COL.cyan }),
  );
  ring.position.y = 0.05;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  pulsers.push({ mat: ring.material, base: COL.cyan, phase: 0.4, lo: 0.5, hi: 1.0, region: REGION });

  // ── 복귀 포털 (중앙) — 빛나는 패드 + 회전 토러스 + 표지 ──
  const portal = new THREE.Group();
  portal.position.set(0, 0, 0);
  root.add(portal);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.16, 32),
    new THREE.MeshBasicMaterial({ color: COL.magenta }),
  );
  pad.position.y = 0.04;
  portal.add(pad);
  pulsers.push({ mat: pad.material, base: COL.magenta, phase: 1.1, lo: 0.45, hi: 1.0, region: REGION });

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.12, 10, 40),
    new THREE.MeshBasicMaterial({ color: COL.cyan }),
  );
  halo.position.y = 1.6;
  portal.add(halo);
  spinners.push({ mesh: halo, speed: 1.4, region: REGION });
  floaters.push({ mesh: halo, baseY: 1.6, amp: 0.18, phase: 0, speed: 1.4, region: REGION });

  const sign = makeTextPlane('← 마을로', 2.2, 0.7, '#ffffff');
  sign.position.set(0, 2.6, 0);
  portal.add(sign);
  floaters.push({ mesh: sign, baseY: 2.6, amp: 0.12, phase: 1.5, speed: 1.1, region: REGION });

  // 복귀 POI — world.ts tryInteract 가 type:'arcade-return' 으로 라우팅
  pois.push({
    id: 'island2-return', type: 'arcade-return',
    x: cx, z: cz, r: 2.6,
    prompt: '마을로 돌아가기',
  });

  // ── 분위기용 네온 기둥 (region 게이팅 데모 — 메인 섬에 있을 땐 멈춤) ──
  const pillarCols = [COL.cyan, COL.magenta, COL.lime, COL.amber, COL.hotpink, COL.purple];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = Math.cos(ang) * (ISLAND2_WALK - 2.5);
    const pz = Math.sin(ang) * (ISLAND2_WALK - 2.5);
    const col = pillarCols[i % pillarCols.length];

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1c1830, roughness: 0.6 }),
    );
    post.position.set(px, 1.6, pz);
    post.castShadow = true;
    root.add(post);

    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: col }),
    );
    orb.position.set(px, 3.7, pz);
    root.add(orb);
    spinners.push({ mesh: orb, speed: 0.8 + i * 0.15, region: REGION });
    floaters.push({ mesh: orb, baseY: 3.7, amp: 0.22, phase: i, speed: 1.0 + i * 0.1, region: REGION });
    pulsers.push({ mat: orb.material, base: col, phase: i * 0.7, lo: 0.5, hi: 1.0, region: REGION });

    ctx.obstacles.push({ x: cx + px, z: cz + pz, r: 0.6 });
  }

  // ── 섬 이름 간판 ──
  const title = makeTextPlane('GAME ISLAND', 7, 1.4, '#21f0ff');
  title.position.set(0, 6.5, -ISLAND2_WALK + 2);
  title.rotation.x = -0.15;
  root.add(title);

  return { center: ISLAND2_CENTER, r: ISLAND2_WALK, spawn: ISLAND2_SPAWN };
}
