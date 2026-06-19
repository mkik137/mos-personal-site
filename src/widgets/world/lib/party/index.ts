// @ts-nocheck
// ─────────────────────────────────────────────
//  party — 방명록 파티룸 (실내 씬)
//  섬 밖(300, 0)에 지어둔 파티룸. 방명록 건물 문에서 입장한다.
//  벽에는 마을 친구들의 폴라로이드 사진, 천장엔 가랜드와 풍선,
//  바닥엔 색종이 — 중앙 테이블에서 방명록 패널을 연다.
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadGlbProp } from '../helpers/loadGlbProp';
import { addExitDoor } from '../helpers/exitDoor';
import { addInteractMarker } from '../helpers/interactMarker';
import { SPEAKER_COLORS } from '../dialogueLines';
import { COL } from '../constants';

// 실내 클램프 영역 — world.ts 의 실내 이동 경계가 사용.
export const PARTY = {
  x: 300, z: 0,
  halfX: 5.4, halfZ: 4.4,
  spawn: { x: 300, z: 2.0 }, // 남쪽(열린 면) 안쪽, 출구 POI 반경 밖
};

const W = 12, D = 10, WALL_H = 4, T = 0.3;

// 벽에 붙은 친구들 사진 — 마을 주민 + 큐비 + 가람
const FRIENDS = ['가람', '큐비', '도윤', '하나', '치치', '미소', '준호', '서연', '민재'];

// 폴라로이드 사진 텍스처 — 색 배경 + 단순한 웃는 얼굴 + 이름 캡션
function makePhotoTexture(name) {
  const color = SPEAKER_COLORS[name] || '#8ec5ff';
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 232;
  const c = cv.getContext('2d');
  // 폴라로이드 흰 테두리
  c.fillStyle = '#fdfcf7';
  c.fillRect(0, 0, 192, 232);
  // 사진 영역
  c.fillStyle = color;
  c.fillRect(14, 14, 164, 158);
  // 얼굴
  c.fillStyle = '#f3c39a';
  c.beginPath(); c.arc(96, 92, 46, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a2a35';
  c.beginPath(); c.arc(80, 84, 5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(112, 84, 5, 0, Math.PI * 2); c.fill();
  c.lineWidth = 4; c.strokeStyle = '#2a2a35'; c.lineCap = 'round';
  c.beginPath(); c.arc(96, 100, 16, 0.25, Math.PI - 0.25); c.stroke();
  // 볼터치
  c.fillStyle = 'rgba(255,120,100,0.45)';
  c.beginPath(); c.arc(68, 102, 7, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(124, 102, 7, 0, Math.PI * 2); c.fill();
  // 캡션
  c.fillStyle = '#3b3b46';
  c.font = '600 24px Pretendard, sans-serif';
  c.textAlign = 'center';
  c.fillText(`with ${name}`, 96, 210);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function buildParty(ctx): Promise<{ dome: THREE.Mesh }> {
  const { scene, obstacles, pois, floaters, spinners } = ctx;
  const X = PARTY.x, Z = PARTY.z;

  // 배경 돔 — 입장 중에만 켠다 (world.ts enterInterior/exitInterior)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xd9d2c4, side: THREE.BackSide, fog: false }),
  );
  dome.position.set(X, 0, Z);
  dome.visible = false;
  scene.add(dome);

  // ── 구조물: 바닥 + 벽 3면 (남쪽 개방) ──
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.3, D),
    new THREE.MeshStandardMaterial({ color: 0xc89f6d }),
  );
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf6ede0 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    g.add(m);
  };
  mkWall(W + T, WALL_H, T, 0, WALL_H / 2, -D / 2);  // 북
  mkWall(T, WALL_H, D + T, -W / 2, WALL_H / 2, 0);  // 서
  mkWall(T, WALL_H, D + T,  W / 2, WALL_H / 2, 0);  // 동
  g.position.set(X, 0, Z);
  scene.add(g);

  // 파티 조명 — 따뜻한 중앙등 + 핑크/시안 무드등
  const main = new THREE.PointLight(0xffe9c4, 1.1, 20, 1.4);
  main.position.set(X, 3.4, Z);
  scene.add(main);
  const pink = new THREE.PointLight(0xff7ab8, 0.6, 14, 1.8);
  pink.position.set(X - 4, 2.8, Z - 2);
  scene.add(pink);
  const cyan = new THREE.PointLight(0x5fd7ff, 0.6, 14, 1.8);
  cyan.position.set(X + 4, 2.8, Z - 2);
  scene.add(cyan);

  // ── 폴라로이드 사진 — 북쪽 벽 5장 + 동·서 벽 2장씩, 살짝 비뚤게 ──
  FRIENDS.forEach((name, i) => {
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.87),
      new THREE.MeshBasicMaterial({ map: makePhotoTexture(name) }),
    );
    if (i < 5) {
      // 북쪽 벽
      photo.position.set(X - 4 + i * 2, 2.0 + (i % 2) * 0.55, Z - D / 2 + T / 2 + 0.02);
    } else if (i < 7) {
      // 서쪽 벽
      photo.position.set(X - W / 2 + T / 2 + 0.02, 1.9 + (i % 2) * 0.6, Z - 2.4 + (i - 5) * 2.4);
      photo.rotation.y = Math.PI / 2;
    } else {
      // 동쪽 벽
      photo.position.set(X + W / 2 - T / 2 - 0.02, 1.9 + (i % 2) * 0.6, Z - 2.4 + (i - 7) * 2.4);
      photo.rotation.y = -Math.PI / 2;
    }
    photo.rotation.z = (Math.random() - 0.5) * 0.16; // 손으로 붙인 느낌
    scene.add(photo);
  });

  // ── 가랜드 — 북쪽 벽을 가로지르는 삼각 깃발 줄 (살짝 처지게) ──
  const flagColors = [COL.accent, COL.cyan, COL.amber, COL.green, COL.hotpink, COL.purple];
  const tri = new THREE.Shape();
  tri.moveTo(-0.18, 0); tri.lineTo(0.18, 0); tri.lineTo(0, -0.46); tri.closePath();
  const triGeo = new THREE.ShapeGeometry(tri);
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const flag = new THREE.Mesh(
      triGeo,
      new THREE.MeshBasicMaterial({ color: flagColors[i % flagColors.length], side: THREE.DoubleSide }),
    );
    flag.position.set(X - 5.4 + t * 10.8, 3.55 - Math.sin(t * Math.PI) * 0.45, Z - D / 2 + T / 2 + 0.03);
    flag.rotation.z = (Math.random() - 0.5) * 0.2;
    scene.add(flag);
  }

  // ── 디스코볼 — 방 중앙 천장에서 반짝이며 회전 ──
  // 환경맵이 없어 metalness 를 높이면 검게 나옴 — 낮은 metalness + 약한 자체발광으로 반짝임 표현
  const disco = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({
      color: 0xe8eef8, metalness: 0.35, roughness: 0.18,
      emissive: 0x6c7a92, emissiveIntensity: 0.35, flatShading: true,
    }),
  );
  disco.position.set(X, 3.3, Z - 0.4);
  scene.add(disco);
  spinners.push({ mesh: disco, speed: 1.6, region: 'party' });
  const discoRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4),
    new THREE.MeshStandardMaterial({ color: 0x777777 }),
  );
  discoRod.position.set(X, 3.95, Z - 0.4);
  scene.add(discoRod);

  // ── 스피커 — 테이블 양옆에서 무대 느낌으로 ──
  const [spkL, spkR] = await Promise.all([
    loadGlbProp('/glb/prop/Speaker.glb', 1.15), // Kenney CC0
    loadGlbProp('/glb/prop/Speaker.glb', 1.15),
  ]);
  spkL.position.set(X - 3.0, 0, Z - 3.6);
  spkL.rotation.y = 0.5;  // 방 안쪽을 향해
  spkR.position.set(X + 3.0, 0, Z - 3.6);
  spkR.rotation.y = -0.5;
  scene.add(spkL, spkR);
  obstacles.push({ x: X - 3.0, z: Z - 3.6, r: 0.55 }, { x: X + 3.0, z: Z - 3.6, r: 0.55 });

  // ── 실내 풍선 — 천장 근처에 둥실 (실 포함) ──
  const balloonSpots = [[-3.6, -3], [3.8, -2.6], [-4.2, 1.2], [4.3, 1.6], [0.6, -3.6], [-2.2, 2.8], [2.4, 3.2], [-1.2, -1.2]];
  balloonSpots.forEach(([ox, oz], i) => {
    const grp = new THREE.Group();
    const color = flagColors[(i * 2 + 1) % flagColors.length];
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35 }),
    );
    ball.scale.y = 1.18;
    grp.add(ball);
    const str = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4),
      new THREE.MeshStandardMaterial({ color: 0x999999 }),
    );
    str.position.y = -0.9;
    grp.add(str);
    const baseY = 3.0 + (i % 2) * 0.3;
    grp.position.set(X + ox, baseY, Z + oz);
    scene.add(grp);
    floaters.push({ mesh: grp, baseY, amp: 0.18, phase: i * 1.9, speed: 1.1, region: 'party' });
  });

  // ── 바닥 색종이 ──
  for (let i = 0; i < 26; i++) {
    const piece = new THREE.Mesh(
      new THREE.CircleGeometry(0.05 + Math.random() * 0.05, 8),
      new THREE.MeshBasicMaterial({ color: flagColors[i % flagColors.length] }),
    );
    piece.rotation.x = -Math.PI / 2;
    piece.position.set(
      X + (Math.random() - 0.5) * (W - 2),
      0.012,
      Z + (Math.random() - 0.5) * (D - 2),
    );
    scene.add(piece);
  }

  // ── 방명록 테이블 — 테이블보 테이블 + 선물 상자들, 여기서 방명록 패널을 연다 ──
  const [table, gift1, gift2, gift3] = await Promise.all([
    loadGlbProp('/glb/prop/Party Table.glb', 2.0, true), // Kenney CC0
    loadGlbProp('/glb/prop/Present.glb', 0.55),          // J-Toastie CC-BY
    loadGlbProp('/glb/prop/Present.glb', 0.42),
    loadGlbProp('/glb/prop/Present.glb', 0.35),
  ]);
  table.position.set(X, 0, Z - 2.2);
  scene.add(table);
  obstacles.push({ x: X, z: Z - 2.2, r: 1.2 });
  // 선물 — 하나는 테이블 위, 둘은 바닥에
  const tableTop = new THREE.Box3().setFromObject(table).max.y;
  gift1.position.set(X + 0.4, tableTop, Z - 2.3);
  gift1.rotation.y = 0.5;
  gift2.position.set(X - 1.6, 0, Z - 2.7);
  gift2.rotation.y = -0.4;
  gift3.position.set(X - 1.25, 0, Z - 2.1);
  gift3.rotation.y = 1.1;
  scene.add(gift1, gift2, gift3);
  addInteractMarker(scene, floaters, X, tableTop + 0.85, Z - 2.2, 'party'); // 상호작용 표시 (E 키캡)
  pois.push({
    id: 'guestbook-desk', type: 'guestbook-desk',
    x: X, z: Z - 2.2, r: 2.6,
    prompt: '방명록 남기기',
  });

  // ── 출구 문 — 남쪽 개방면에 보이는 문 + 나가기 간판 ──
  addExitDoor(scene, X, Z + 4.5);
  obstacles.push({ x: X, z: Z + 4.5, r: 0.5 });
  pois.push({
    id: 'party-exit', type: 'party-exit',
    x: X, z: Z + 4.5, r: 2.0,
    prompt: '밖으로 나가기',
  });

  return { dome };
}
