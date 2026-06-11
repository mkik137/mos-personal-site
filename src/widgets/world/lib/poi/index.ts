// @ts-nocheck
import * as THREE from 'three';
import { loadAvatar } from '@/entities/character';
import { MAP_SCALE as S } from '../constants';
import { loadGlbProp } from '../helpers/loadGlbProp';

export async function buildPOIs(ctx) {
  const { scene, obstacles, pois } = ctx;

  // 세 개의 GLB(아바타·스튜디오·방명록)를 병렬로 로드해 초기 로딩을 단축.
  const [npcModel, studio, guestbook] = await Promise.all([
    loadAvatar(),
    loadGlbProp('/glb/building/Houses_SecondAge_2_Level2.glb', 12, true),
    loadGlbProp('/glb/building/Houses_SecondAge_1_Level2.glb', 11, true),
  ]);

  // ── NPC (가람) — GLB 아바타 ──
  const npc = new THREE.Object3D();
  npc.position.set(0, 0, -13 * S);
  npc.add(npcModel);
  scene.add(npc);
  _registerPoi(pois, {
    id: 'about', type: 'npc',
    x: 0, z: -13 * S, r: 3.4,
    object: npc,
    prompt: '가람과 대화하기',
    labelTitle: '가람', labelSub: 'SAY HELLO',
  });

  // ── 스튜디오 (건물) — 벽·지붕 있는 제대로 된 집 ──
  // 돌길 끝(-21,16.5) 너머에 두어 문이 길 끝에 닿게 (길 한가운데 겹침 방지).
  studio.position.set(-17.5 * S, 0, 14 * S);
  studio.rotation.y = Math.atan2(17.5, -14); // 정문을 광장(중앙) 쪽으로
  scene.add(studio);
  obstacles.push({ x: -17.5 * S, z: 14 * S, r: 5.0 }); // 건물 면에 맞춘 충돌 반경
  _registerPoi(pois, {
    id: 'work', type: 'door',
    x: -17.5 * S, z: 14 * S, r: 6.8, // 건물 중심 + 충돌 반경(5.0) 바깥에서 잡히는 반경
    object: studio,
    prompt: '작업 & 경력 보러 가기',
    labelTitle: '작업 & 경력', labelSub: 'WORK & CAREER',
    labelY: 6.4,
  });

  // ── 방명록 (집 건물) ──
  guestbook.position.set(14 * S, 0, 7 * S);
  guestbook.rotation.y = Math.atan2(-14, -7); // 정문을 광장(중앙) 쪽으로
  scene.add(guestbook);
  obstacles.push({ x: 14 * S, z: 7 * S, r: 5.0 });
  _registerPoi(pois, {
    id: 'guestbook', type: 'door',
    x: 14 * S, z: 7 * S, r: 6.8, // 건물 중심 + 충돌 반경(5.0) 바깥에서 잡히는 반경
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
