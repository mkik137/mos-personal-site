// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { pathCorridors } from '../layout';
import { makeTextPlane } from '../helpers/makeTextPlane';
import { addArcadeCabinet } from './arcadeCabinet';
import { addClawMachine } from './clawMachine';
import { addGachapon } from './gachapon';
import { addBalloon } from './balloon';

function faceCenter(x, z) { return Math.atan2(-x, -z); }

// 첫 번째 게임기를 'GAME ISLAND' 포털로 표시 — 빛나는 표지 + 베이스 링 + 상호작용 POI.
function markPortalCabinet({ scene, pois, floaters, pulsers }, x, z) {
  // 머리 위 떠다니는 안내 표지
  const sign = makeTextPlane('🎮 다른 섬', 2.4, 0.7, '#21f0ff');
  sign.position.set(x, 4.2, z);
  scene.add(sign);
  floaters.push({ mesh: sign, baseY: 4.2, amp: 0.16, phase: 0.3, speed: 1.4 });

  // 발광 베이스 링 (포털 표시)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.12, 8, 40),
    new THREE.MeshBasicMaterial({ color: COL.magenta }),
  );
  ring.position.set(x, 0.06, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  pulsers.push({ mat: ring.material, base: COL.magenta, phase: 0.8, lo: 0.4, hi: 1.0 });

  pois.push({
    id: 'arcade-portal', type: 'arcade-portal',
    x, z, r: 2.4,
    prompt: 'GAME ISLAND 으로 이동',
  });
}

export function buildDecor(ctx) {
  const { obstacles } = ctx;
  const bodyCols   = [COL.accent, COL.blue, COL.green, 0xffc63c, COL.hotpink, 0x6b4cff];
  const screenCols = [COL.cyan, COL.magenta, COL.lime, COL.amber];
  const sprites    = ['invader', 'heart', 'smiley', 'star', 'ghost'];

  // 중앙 광장 둘레 링에 게임기 배치 (나무 사이 X). 길(모든 방향)이 지나는 곳은 비운다.
  const corridors = pathCorridors();
  const RING_R = 13;
  const CAND = 22;
  const slots = [];
  for (let i = 0; i < CAND; i++) {
    const ang = (i / CAND) * Math.PI * 2;
    const x = Math.cos(ang) * RING_R, z = Math.sin(ang) * RING_R;
    // 길이 링을 가로지르는 지점은 건너뛴다
    if (corridors.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.8)) continue;
    slots.push({ x, z });
  }

  const machines = slots.slice(0, 14);
  machines.forEach((m, i) => {
    const rot = faceCenter(m.x, m.z); // 화면이 광장(중앙)을 향하게
    if (i < 9) {
      addArcadeCabinet(
        ctx, m.x, m.z, rot,
        bodyCols[i % bodyCols.length],
        screenCols[i % screenCols.length],
        sprites[i % sprites.length],
        i,
      );
      if (i === 0) markPortalCabinet(ctx, m.x, m.z); // 첫 게임기 = GAME ISLAND 포털
    } else if (i < 11) {
      addClawMachine(ctx, m.x, m.z, rot, i === 9 ? COL.hotpink : COL.cyan);
    } else {
      addGachapon(ctx, m.x, m.z, [COL.amber, COL.green, COL.magenta][(i - 11) % 3]);
    }
    obstacles.push({ x: m.x, z: m.z, r: 1.7 }); // 나무 등 후속 배치가 피하도록
  });

  // 풍선 (공중 장식) — 링 바깥쪽에 가볍게
  const bcols = [COL.accent, COL.blue, COL.hotpink, COL.green];
  const balloonAng = [0.9, 2.0, 3.6, 5.2];
  balloonAng.forEach((a, i) => {
    addBalloon(ctx, Math.cos(a) * 17, Math.sin(a) * 17, bcols[i % bcols.length], i);
  });
}
