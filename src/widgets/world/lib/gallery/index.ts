// @ts-nocheck
// ─────────────────────────────────────────────
//  gallery — 스튜디오 갤러리 (작업&경력 실내 씬)
//  섬 밖(260, 0)에 지어둔 전시장. 작업&경력 건물 문에서 입장한다.
//  북쪽 벽에 프로젝트 수만큼 액자가 걸려 있고, 액자와 상호작용하면
//  작업&경력 패널이 해당 프로젝트 위치로 열린다 (world.ts openWorkPanel).
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadGlbProp } from '../helpers/loadGlbProp';

// 실내 클램프 영역 — world.ts 의 실내 이동 경계가 사용.
export const GALLERY = {
  x: 260, z: 0,
  halfX: 7.4, halfZ: 4.4,
  spawn: { x: 260, z: 2.2 }, // 남쪽(열린 면) 안쪽, 출구 POI 반경 밖
};

const W = 16, D = 10, WALL_H = 4, T = 0.3;

// WorkPanel.tsx 의 프로젝트와 1:1 — idx 는 #proj-<idx> 스크롤 타깃과 일치해야 한다.
const PROJECTS = [
  { no: '01', hanzi: '漂流', name: 'Drift',  sub: 'SOUND VISUALIZER' },
  { no: '02', hanzi: '結',   name: 'Knot',   sub: 'NETWORK GRAPH' },
  { no: '03', hanzi: '餘白', name: 'Margin', sub: 'BRAND MICROSITE' },
];

// 액자 그림 — 양피지 톤 캔버스에 번호·한자 표제·프로젝트명
function makeFrameTexture(p) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 330;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#f6ecd2');
  g.addColorStop(1, '#e8d9b0');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 330);
  c.strokeStyle = 'rgba(110,84,47,0.55)';
  c.lineWidth = 3;
  c.strokeRect(12, 12, 232, 306);
  c.textAlign = 'center';
  c.fillStyle = '#8b3a1d';
  c.font = '700 22px "Space Mono", monospace';
  c.fillText(p.no, 128, 52);
  c.fillStyle = '#3b2c18';
  c.font = '700 104px "Noto Serif KR", serif';
  c.fillText(p.hanzi, 128, 182);
  c.font = '700 30px "Noto Serif KR", serif';
  c.fillText(p.name, 128, 244);
  c.fillStyle = '#6f5b3a';
  c.font = '12px "Space Mono", monospace';
  c.fillText(p.sub, 128, 286);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function buildGallery(ctx): Promise<{ dome: THREE.Mesh }> {
  const { scene, obstacles, pois } = ctx;
  const X = GALLERY.x, Z = GALLERY.z;

  // 배경 돔 — 입장 중에만 켠다 (world.ts enterInterior/exitInterior)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xd9d2c4, side: THREE.BackSide, fog: false }),
  );
  dome.position.set(X, 0, Z);
  dome.visible = false;
  scene.add(dome);

  // ── 구조물: 원목 바닥 + 벽 3면 (남쪽 개방 — 돌하우스 뷰) ──
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.3, D),
    new THREE.MeshStandardMaterial({ color: 0xb98e5f }),
  );
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ede1 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    g.add(m);
  };
  mkWall(W + T, WALL_H, T, 0, WALL_H / 2, -D / 2);  // 북 (액자 벽)
  mkWall(T, WALL_H, D + T, -W / 2, WALL_H / 2, 0);  // 서
  mkWall(T, WALL_H, D + T,  W / 2, WALL_H / 2, 0);  // 동
  g.position.set(X, 0, Z);
  scene.add(g);

  // 전시장 조명 — 따뜻한 포인트 2개
  for (const ox of [-4, 4]) {
    const lamp = new THREE.PointLight(0xffeed0, 1.1, 18, 1.4);
    lamp.position.set(X + ox, 3.4, Z - 1);
    scene.add(lamp);
  }

  // ── 액자 — 북쪽 벽, 프로젝트당 1개 ──
  PROJECTS.forEach((p, i) => {
    const fx = X + (i - 1) * 4.5;
    const fz = Z - D / 2 + T / 2 + 0.07;
    const frame = new THREE.Group();
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.0, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x7a5a2e, roughness: 0.5 }),
    );
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 1.8),
      new THREE.MeshBasicMaterial({ map: makeFrameTexture(p) }),
    );
    art.position.z = 0.06;
    frame.add(border, art);
    frame.position.set(fx, 1.9, fz);
    scene.add(frame);
    pois.push({
      id: `frame-${i}`, type: 'frame', idx: i,
      x: fx, z: fz + 0.5, r: 2.0,
      prompt: `'${p.hanzi} ${p.name}' 감상하기`,
    });
  });

  // ── 경력 게시판 — 화이트보드 재사용 (서쪽 벽 앞, 판이 남쪽을 보게) ──
  const board = await loadGlbProp('/glb/prop/Whiteboard.glb', 1.9);
  board.position.set(X - 6.3, 0, Z - D / 2 + 1.0);
  board.rotation.y = 0.2 - Math.PI / 2; // dev 코너와 동일 보정 — 보드 면이 남쪽(시청자)
  scene.add(board);
  obstacles.push({ x: X - 6.3, z: Z - D / 2 + 1.0, r: 0.7 });
  pois.push({
    id: 'career-board', type: 'work-board',
    x: X - 6.3, z: Z - D / 2 + 1.0, r: 2.2,
    prompt: '경력 게시판 보기',
  });

  // ── 출구 — 남쪽 개방면 ──
  pois.push({
    id: 'gallery-exit', type: 'gallery-exit',
    x: X, z: Z + 4.2, r: 1.8,
    prompt: '밖으로 나가기',
  });

  return { dome };
}
