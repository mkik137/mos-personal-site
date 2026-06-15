// @ts-nocheck
// ─────────────────────────────────────────────
//  wanderer — 섬을 걸어다니는 앰비언트 NPC들
//  · 큐비(Cube Guy): 광장 배회 + 퀘스트 대화(setTalking) + Wave 인사
//  · 주민(J-Toastie 7종): 각자 앵커(집·시장·창고 앞 등) 주변을 배회
//  GLB 에 Idle/Walk 클립이 내장 → AnimationMixer 로 크로스페이드.
//  상태: idle(잠시 서 있기) ↔ walk(앵커 주변 랜덤 지점으로 이동),
//  Wave 클립이 있는 모델은 플레이어 접근 시 손 인사, 없으면 바라보기만.
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadAvatar } from '@/entities/character';
import { VILLAGERS } from './villagers';
import { drawQuestMark } from '../helpers/questMark';

const FADE = 0.25;  // 클립 크로스페이드 시간

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// 퀘스트 NPC 머리 위 말풍선 텍스처 (캔버스 드로잉)
//  kind: 'dots'  → 펼친 책 📖 (받을/진행 중인 퀘스트 있음)
//        'check' → 초록 체크 (완료 — 보고하러 오라는 표시)
function makeBubbleTexture(kind) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 96;
  const c = cv.getContext('2d');
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(35,32,48,0.92)';
  c.fillStyle = 'rgba(255,255,255,0.97)';
  // 꼬리
  c.beginPath();
  c.moveTo(50, 60); c.lineTo(64, 90); c.lineTo(78, 60);
  c.closePath(); c.fill(); c.stroke();
  // 몸통 (꼬리 이음새를 덮도록 나중에)
  c.beginPath();
  c.roundRect(8, 8, 112, 56, 18);
  c.fill(); c.stroke();
  if (kind === 'check') {
    // 완료 체크
    c.strokeStyle = '#1fa860';
    c.lineWidth = 11;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(42, 37); c.lineTo(58, 50); c.lineTo(88, 21);
    c.stroke();
  } else {
    // 퀘스트 마크 "?" (받으러 오라는 표시)
    drawQuestMark(c, 64, 36, 46);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// NPC 한 명 생성 — anchor 중심 radius 안에서만 배회한다.
//  height 는 시각적 키(머리 끝까지, 월드 단위) — 스키닝 반영 실측으로 정확히 맞춘다.
async function createWanderer(ctx, { url, height, speed = 1.4, anchor = { x: 0, z: 0 }, radius = 8, start = anchor, floorY = 0, bubble = false, faceYaw = null }) {
  const { scene, obstacles } = ctx;

  // loadAvatar 가 스킨드 메시 공통 처리(frustumCulled=false·그림자·wrapper)를 전담.
  // 본(bone) 기준 키는 리그마다 시각적 키와 크게 어긋나서(Cube Guy 머리, J-Toastie 등)
  // 스키닝을 반영한 실제 메시 박스(r151+ SkinnedMesh.computeBoundingBox)로 재보정한다.
  const root = await loadAvatar(url, 1);
  const model = root.userData.model;
  // 배회 NPC 는 그림자를 만들지 않음 — 스킨드 메시는 그림자 패스에서 본 연산을
  // 한 번 더 하므로 9명이면 비용이 큼 (그림자는 계속 받음).
  model.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3();
  const sub = new THREE.Box3();
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    // boneMatrices 는 렌더링 시에만 갱신됨 — 아직 씬에 없으므로 수동 갱신해야 실측이 정확.
    if (o.isSkinnedMesh) o.skeleton.update();
    o.computeBoundingBox(); // SkinnedMesh 는 본 변형을 반영해 계산
    sub.copy(o.isSkinnedMesh ? o.boundingBox : o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    bb.union(sub);
  });
  if (!bb.isEmpty()) {
    const sz = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    bb.getSize(sz);
    bb.getCenter(ctr);
    const k = height / (sz.y || 1);
    model.scale.multiplyScalar(k);
    model.position.multiplyScalar(k);
    model.position.x -= ctr.x * k;
    model.position.z -= ctr.z * k;
    model.position.y -= bb.min.y * k; // 발이 y=0 에 닿도록
  }

  root.position.set(start.x, floorY, start.z);
  root.rotation.y = faceYaw ?? Math.random() * Math.PI * 2; // 고정 방향(가판대 등) 또는 랜덤
  scene.add(root);

  // 클립 이름은 "CharacterArmature|…|Walk" 형태 → 마지막 토큰으로 찾는다.
  const animations = root.userData.animations || [];
  const mixer = new THREE.AnimationMixer(root.userData.model);
  const clip = (name) => {
    const c = animations.find((a) => a.name.split('|').pop() === name);
    return c ? mixer.clipAction(c) : null;
  };
  const idleAction = clip('Idle');
  const walkAction = clip('Walk');
  const waveAction = clip('Wave');
  if (waveAction) {
    waveAction.setLoop(THREE.LoopOnce);
    waveAction.clampWhenFinished = true;
  }
  let current = idleAction;
  idleAction?.play();

  const playAction = (next) => {
    if (!next || next === current) return;
    next.reset().fadeIn(FADE).play();
    current?.fadeOut(FADE);
    current = next;
  };

  // 앵커 주변 랜덤 목적지 — 장애물(건물·나무·덤스터 등)과 안 겹치는 곳으로.
  const pickTarget = () => {
    for (let t = 0; t < 24; t++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * radius;
      const x = anchor.x + Math.cos(ang) * rad;
      const z = anchor.z + Math.sin(ang) * rad;
      if (Math.hypot(x - root.position.x, z - root.position.z) < Math.min(2.5, radius * 0.6)) continue; // 너무 가까운 지점 제외
      if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < (o.r || 0) + 0.8)) continue;
      return { x, z };
    }
    return { x: anchor.x, z: anchor.z }; // 전부 실패 시 앵커 중심 (장애물 없는 곳으로 선정됨)
  };

  // 퀘스트 말풍선 — 머리 위에서 둥실거리고, 대화 중엔 숨긴다.
  // setBubble('dots' | 'check' | false) 로 표시 전환 (check = 퀘스트 완료 보고 표시).
  let bubbleSprite = null;
  // 말풍선은 처음엔 꺼둔다 — 표시는 questChain.refreshBubbles 가 단계에 맞춰 켠다(순차 표시).
  let bubbleOn = false;
  let bubbleT = Math.random() * 10;
  const bubbleY = height + 0.5;
  const bubbleTex = {};
  if (bubble) {
    bubbleTex.dots = makeBubbleTexture('dots');
    bubbleTex.check = makeBubbleTexture('check');
    bubbleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex.dots, transparent: true, depthWrite: false }));
    bubbleSprite.scale.set(0.78, 0.585, 1);
    bubbleSprite.position.set(0, bubbleY, 0);
    bubbleSprite.visible = false;
    root.add(bubbleSprite);
  }
  const setBubble = (mode) => {
    bubbleOn = !!mode;
    if (!bubbleSprite) return;
    bubbleSprite.visible = bubbleOn;
    if (bubbleTex[mode]) {
      bubbleSprite.material.map = bubbleTex[mode];
      bubbleSprite.material.needsUpdate = true;
    }
    bubbleSprite.userData.mode = mode;
  };

  let state = 'idle';                       // idle | walk | wave
  let timer = 1 + Math.random() * 3;        // idle 잔여 시간 / walk 최대 시간
  let target = null;
  let waveCooldown = 0;                     // 인사 남발 방지
  let talking = false;                      // 대화 중 — 배회를 멈추고 플레이어를 바라봄

  const setTalking = (v) => {
    talking = v;
    if (v) {
      state = 'idle';
      timer = 1 + Math.random() * 2;
      playAction(idleAction);
    } else {
      waveCooldown = 8; // 대화 직후 곧바로 또 인사하지 않게
    }
  };

  const facePlayer = (playerPos, k) => {
    const ry = Math.atan2(playerPos.x - root.position.x, playerPos.z - root.position.z);
    root.rotation.y = lerpAngle(root.rotation.y, ry, k);
  };

  const update = (dt, playerPos) => {
    mixer.update(dt);
    waveCooldown = Math.max(0, waveCooldown - dt);

    if (bubbleSprite) {
      bubbleT += dt;
      bubbleSprite.visible = bubbleOn && !talking;
      bubbleSprite.position.y = bubbleY + Math.sin(bubbleT * 2.4) * 0.06;
    }

    if (talking) {
      if (playerPos) facePlayer(playerPos, 0.15);
      return;
    }

    // 플레이어가 가까이 오면: Wave 클립이 있으면 하던 일을 멈추고 손 인사
    const pDist = playerPos ? Math.hypot(playerPos.x - root.position.x, playerPos.z - root.position.z) : Infinity;
    if (state !== 'wave' && pDist < 3 && waveCooldown === 0 && waveAction) {
      state = 'wave';
      timer = waveAction.getClip().duration + FADE;
      playAction(waveAction);
    }

    if (state === 'wave') {
      if (playerPos) facePlayer(playerPos, 0.12);
      timer -= dt;
      if (timer <= 0) {
        state = 'idle';
        timer = 2 + Math.random() * 2;
        waveCooldown = 8;
        playAction(idleAction);
      }
      return;
    }

    if (state === 'idle') {
      if (pDist < 2.6) facePlayer(playerPos, 0.08); // 가까운 플레이어를 쳐다봄
      timer -= dt;
      if (timer <= 0) {
        state = 'walk';
        timer = 14; // 안전장치 — 끼었을 때 영원히 걷지 않게
        target = pickTarget();
        playAction(walkAction);
      }
      return;
    }

    // walk
    const dx = target.x - root.position.x, dz = target.z - root.position.z;
    const dist = Math.hypot(dx, dz);
    timer -= dt;
    if (dist < 0.3 || timer <= 0) {
      state = 'idle';
      timer = 1.5 + Math.random() * 3.5;
      playAction(idleAction);
      return;
    }
    root.rotation.y = lerpAngle(root.rotation.y, Math.atan2(dx, dz), 0.1);
    root.position.x += (dx / dist) * speed * dt;
    root.position.z += (dz / dist) * speed * dt;

    // 장애물 밀어내기 (플레이어와 동일한 방식)
    for (const o of obstacles) {
      const ox = root.position.x - o.x, oz = root.position.z - o.z;
      const d = Math.hypot(ox, oz), min = (o.r || 0) + 0.5;
      if (d < min && d > 0.0001) {
        root.position.x += (ox / d) * (min - d);
        root.position.z += (oz / d) * (min - d);
      }
    }
    // 배회 반경 밖으로 나가지 않게 (앵커 기준)
    const ax = root.position.x - anchor.x, az = root.position.z - anchor.z;
    const rr = Math.hypot(ax, az);
    if (rr > radius) {
      root.position.x = anchor.x + ax * (radius / rr);
      root.position.z = anchor.z + az * (radius / rr);
    }
  };

  return { root, update, setTalking, setBubble };
}

// ── 스토리 NPC — 경비(입구) · 과일가게 사장(과수원) ──
//  기존 NPC GLB 를 다른 이름으로 재사용. 둘 다 머리 위 "···" 말풍선(퀘스트 표시).
export async function buildStoryNpcs(ctx): Promise<{ guard: any; vendor: any }> {
  const [guard, vendor] = await Promise.all([
    createWanderer(ctx, {
      url: '/glb/character/npc/Male Officer.glb',
      height: 0.82, speed: 0.9,
      // 분수대(중앙 0,0) 앞 — 덤스터(3.2,6.8)와 떨어진 남서쪽 광장. 보초처럼 좁게 배회하며
      // 스폰(4.6,4.6) 쪽을 바라봐 입섬객을 맞이한다.
      anchor: { x: -2, z: 5.6 }, radius: 1.2, start: { x: -2, z: 5.6 },
      floorY: 0.02, bubble: true, faceYaw: Math.atan2(6.6, -1.0),
    }),
    createWanderer(ctx, {
      url: '/glb/character/npc/Retail Worker.glb',
      height: 0.8, speed: 0.8,
      // 과일마켓 건물 앞 돌길 위 (가판대 지키듯 좁게 배회, 길 따라 광장 쪽을 바라봄)
      anchor: { x: -7, z: 27 }, radius: 1.2, start: { x: -7, z: 27 },
      floorY: 0.02, bubble: true, faceYaw: Math.atan2(7, -27),
    }),
  ]);
  return {
    guard:  { ...guard,  name: '경비' },
    vendor: { ...vendor, name: '과일가게 사장' },
  };
}

// 큐비 — 광장 배회 + 박스 치우기 퀘스트 대화 상대. 플레이어(2.0)보다 살짝 작게.
export async function buildWanderer(ctx) {
  return createWanderer(ctx, {
    url: '/glb/character/npc/Cube Guy.glb',
    height: 0.85, speed: 1.4,
    anchor: { x: 0, z: 0 }, radius: 8,
    start: { x: -6, z: 2.5 }, floorY: 0.02, // 분수대 밖에서 시작 (광장 타일 윗면)
    bubble: true, // 퀘스트 NPC 표시 — 머리 위 "···" 말풍선
  });
}

export async function buildVillagers(ctx): Promise<any[]> {
  const results = await Promise.allSettled(
    VILLAGERS.map(async (v) => {
      const w = await createWanderer(ctx, { height: 0.75 + Math.random() * 0.1, speed: 1.0 + Math.random() * 0.5, ...v });
      return { ...w, name: v.name, prompt: v.prompt, lines: v.lines };
    }),
  );
  results.forEach((r) => {
    if (r.status === 'rejected') console.warn('[villager] load failed:', r.reason);
  });
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}
