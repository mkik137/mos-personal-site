// @ts-nocheck
import * as THREE from 'three';
import { loadAvatar } from '@/entities/character';
import { MAP_SCALE as S } from '../constants';
import { loadGlbProp } from '../helpers/loadGlbProp';

// 건물 중심에서 광장(중앙) 쪽으로 gap 만큼 당긴 "문 앞" 지점 + 옆방향(perp).
function frontOf(cx, cz, gap) {
  const r = Math.hypot(cx, cz) || 1;
  const f = (r - gap) / r;
  return { x: cx * f, z: cz * f, px: -cz / r, pz: cx / r };
}

export async function buildPOIs(ctx) {
  const { scene, obstacles, pois } = ctx;

  // ── NPC (가람) — GLB 아바타 ──
  const npc = new THREE.Object3D();
  npc.position.set(0, 0, -13 * S);
  scene.add(npc);
  const npcModel = await loadAvatar();
  npc.add(npcModel);
  _registerPoi(pois, {
    id: 'about', type: 'npc',
    x: 0, z: -13 * S, r: 3.4,
    object: npc,
    prompt: '가람과 대화하기',
    labelTitle: '가람', labelSub: 'SAY HELLO',
  });

  // ── 스튜디오 (FBX 건물) ──
  // Studio Archive — 벽·지붕 있는 제대로 된 집.
  // 돌길 끝(-21,16.5) 너머에 두어 문이 길 끝에 닿게 (길 한가운데 겹침 방지).
  const studio = await loadGlbProp('/glb/building/Houses_SecondAge_2_Level2.glb', 12, true);
  studio.position.set(-17.5 * S, 0, 14 * S);
  studio.rotation.y = Math.atan2(17.5, -14); // 정문을 광장(중앙) 쪽으로
  scene.add(studio);
  obstacles.push({ x: -17.5 * S, z: 14 * S, r: 5.0 }); // 건물 면에 맞춘 충돌 반경
  // 표지판·상호작용을 건물 문 앞(광장 쪽)에 정확히 배치
  const studioFront = frontOf(-17.5 * S, 14 * S, 6);
  addSignpost(ctx, studioFront.x + studioFront.px * 1.6, studioFront.z + studioFront.pz * 1.6, 'STUDIO');
  _registerPoi(pois, {
    id: 'work', type: 'door',
    x: studioFront.x, z: studioFront.z, r: 3.2,
    object: studio,
    prompt: 'STUDIO 들어가기 — 작업 & 경력',
    labelTitle: 'Studio Archive', labelSub: 'WORK & CAREER',
    labelY: 6.4,
  });

  // ── 방명록 (집 건물 — 기존 키오스크 대체) ──
  const guestbook = await loadGlbProp('/glb/building/Houses_SecondAge_1_Level2.glb', 11, true);
  guestbook.position.set(14 * S, 0, 7 * S);
  guestbook.rotation.y = Math.atan2(-14, -7); // 정문을 광장(중앙) 쪽으로
  scene.add(guestbook);
  obstacles.push({ x: 14 * S, z: 7 * S, r: 5.0 });
  // 표지판·상호작용을 건물 문 앞(광장 쪽)에 정확히 배치
  const gbFront = frontOf(14 * S, 7 * S, 5.5);
  addSignpost(ctx, gbFront.x + gbFront.px * 1.6, gbFront.z + gbFront.pz * 1.6, 'GUEST');
  _registerPoi(pois, {
    id: 'guestbook', type: 'door',
    x: gbFront.x, z: gbFront.z, r: 3.2,
    object: guestbook,
    prompt: '방명록 — 흔적 남기기',
    labelTitle: '방명록', labelSub: 'GUESTBOOK',
    labelY: 6.0,
  });

  return { npc, npcModel };
}

function _registerPoi(pois, p) {
  p.el    = document.querySelector(`.poi-label[data-poi="${p.id}"]`);
  p.panel = document.querySelector(`#panel-${p.id}`);
  pois.push(p);
}
