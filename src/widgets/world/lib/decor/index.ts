// @ts-nocheck
import { COL } from '../constants';
import { pathCorridors } from '../layout';
import { addArcadeCabinet } from './arcadeCabinet';
import { addClawMachine } from './clawMachine';
import { addGachapon } from './gachapon';
import { addBalloon } from './balloon';

function faceCenter(x, z) { return Math.atan2(-x, -z); }

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
