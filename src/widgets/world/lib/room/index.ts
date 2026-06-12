// @ts-nocheck
// ─────────────────────────────────────────────
//  room — 가람이의 방 (실내 씬)
//  Khor Chin Heong 의 "Bedroom" 디오라마(CC-BY 3.0)를 통째로 사용 —
//  벽 2면이 열린 아이소메트릭 룸 스타일. 침대·책상·노트북·TV 가 포함되어 있고
//  농구공만 따로 얹는다. 섬에서 멀리 떨어진 좌표(220, 0)에 지어두고,
//  북서쪽 집 문 앞에서 상호작용하면 텔레포트 (world.ts enterRoom/exitRoom).
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadGlbProp } from '../helpers/loadGlbProp';

// 방 기준점·이동 한계 — world.ts 의 실내 클램프가 사용.
export const ROOM = {
  x: 220, z: 0,
  half: 5.4,                       // 확장된 바닥(14폭) 안쪽 이동 가능 반경
  spawn: { x: 221.2, z: -3.4 },    // 입장 위치 — 문(북쪽 벽) 바로 안쪽, 출구 POI 반경 밖
};

const SHELL_URL = '/glb/room/Bedroom.glb'; // Khor Chin Heong — CC-BY 3.0 (인트로 크레딧 표기)
// 방(바닥·벽)과 가구를 다른 스케일로 분리 — 같은 GLB 를 두 벌 로드해서
// 큰 벌에선 가구를 숨기고(방만), 작은 벌에선 바닥·벽을 숨긴 뒤(가구만)
// 가구를 새 벽 위치로 슬라이드시켜 "방은 넓게, 가구는 그대로" 를 만든다.
const SIZE_STRUCT = 14;   // 방(바닥·벽) footprint 폭
const SIZE_FURN   = 9.5;  // 가구 스케일 (기존 크기 유지)

// 바닥·벽 판별 — 그 인스턴스 폭 대비 한 변이 80% 이상이면 구조물.
function isStructure(size, footprint) {
  return Math.max(size.x, size.z) > footprint * 0.8;
}

export async function buildRoom(ctx): Promise<{ dome: THREE.Mesh }> {
  const { scene, obstacles, pois } = ctx;
  const X = ROOM.x, Z = ROOM.z;

  // 배경 돔 — 실내에서 카메라가 어느 방향을 봐도 방 밖(섬 하늘·허공)이 보이지 않게
  // 방을 통째로 감싸는 구체(안쪽 면 렌더). 입장 중에만 켠다 (섬에서 보이면 안 되므로).
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xd9d2c4, side: THREE.BackSide, fog: false }),
  );
  dome.position.set(X, 0, Z);
  dome.visible = false;
  scene.add(dome);

  // ── 디오라마 두 벌 로드: 방(크게) + 가구(기존 크기) ──
  const [shellStruct, shellFurn, ball] = await Promise.all([
    loadGlbProp(SHELL_URL, SIZE_STRUCT, true),
    loadGlbProp(SHELL_URL, SIZE_FURN, true),
    loadGlbProp('/glb/room/Basketball.glb', 0.4),
  ]);

  const mb = new THREE.Box3();
  const msz = new THREE.Vector3();
  const mctr = new THREE.Vector3();

  // 바닥 판 두께만큼 플레이어(y=0)가 묻히지 않게 — 숨기기 전에 중앙을
  // 레이캐스트해서 바닥 윗면 높이를 재고 그만큼 내린다 (인스턴스별로).
  const dropToFloor = (shell) => {
    shell.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(shell, true)[0];
    if (hit) shell.position.y = -hit.point.y;
  };
  dropToFloor(shellStruct);
  dropToFloor(shellFurn);

  // 방 인스턴스: 가구 숨김 (바닥·벽만 남김)
  shellStruct.updateMatrixWorld(true);
  shellStruct.traverse((o) => {
    if (!o.isMesh) return;
    mb.setFromObject(o);
    mb.getSize(msz);
    if (!isStructure(msz, SIZE_STRUCT)) o.visible = false;
  });

  // 가구 인스턴스: 바닥·벽 숨기고, 벽에 붙어 있던 가구는 새 벽 위치로 슬라이드.
  // (벽걸이 TV·에어컨·문도 벽과의 간격을 유지한 채 따라감 — 배치 그대로)
  const OLD_HALF = SIZE_FURN / 2;
  const grow = SIZE_STRUCT / 2 - OLD_HALF; // 벽이 바깥으로 밀려난 거리
  shellFurn.updateMatrixWorld(true);
  const toSlide = [];
  shellFurn.traverse((o) => {
    if (!o.isMesh) return;
    mb.setFromObject(o);
    mb.getSize(msz);
    mb.getCenter(mctr);
    if (isStructure(msz, SIZE_FURN)) { o.visible = false; return; }
    toSlide.push({
      mesh: o,
      dx: Math.abs(mctr.x) > OLD_HALF * 0.45 ? Math.sign(mctr.x) * grow : 0,
      dz: Math.abs(mctr.z) > OLD_HALF * 0.45 ? Math.sign(mctr.z) * grow : 0,
    });
  });
  for (const s of toSlide) {
    shellFurn.attach(s.mesh); // 월드 변환 유지한 채 wrapper(스케일 1) 직속으로 → 월드 단위로 이동 가능
    s.mesh.position.x += s.dx;
    s.mesh.position.z += s.dz;
  }

  shellStruct.position.x = X; shellStruct.position.z = Z;
  shellFurn.position.x = X;   shellFurn.position.z = Z;
  scene.add(shellStruct);
  scene.add(shellFurn);

  // 가구 자동 충돌 등록 — 슬라이드 반영된 월드 박스 기준.
  // (작은 소품·공중 소품·얇은 벽걸이는 제외)
  shellFurn.updateMatrixWorld(true);
  shellFurn.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    mb.setFromObject(o);
    mb.getSize(msz);
    mb.getCenter(mctr);
    const foot = Math.max(msz.x, msz.z);
    const minDim = Math.min(msz.x, msz.z);
    if (foot < 0.6 || foot > 7) return;
    if (minDim < 0.45) return;          // 얇은 메시(문·TV·에어컨) — 벽가라 통행에 영향 없음
    if (mb.min.y > 0.5) return;         // 책상 위 노트북 등 공중 소품 제외
    obstacles.push({ x: mctr.x, z: mctr.z, r: (foot / 2) * 0.8 });
  });

  // 방 전용 따뜻한 조명 (태양 그림자 카메라 범위 밖이라 자체 조명 필수)
  const lamp = new THREE.PointLight(0xffe9c4, 1.3, 22, 1.4);
  lamp.position.set(X, 3.2, Z);
  scene.add(lamp);

  // 농구공 — 열린 쪽 바닥에 굴러다니는 느낌
  ball.position.set(X - 2.1, 0, Z + 1.7);
  scene.add(ball);

  // ── POI 등록 ──
  // 입구: 북서쪽 장식 집 — 중심 기준 반경이라 어느 방향에서든 잡힘 (work/guestbook 과 동일 UX).
  // 머리 위 떠 있는 라벨(가람이의 집 · HOME)은 PoiLabels.tsx 의 data-poi="garam-house".
  pois.push({
    id: 'garam-house', type: 'house-enter',
    x: -28.5, z: -18, r: 6.5,
    labelY: 6.2,
    el: document.querySelector('.poi-label[data-poi="garam-house"]'),
    prompt: '가람이의 집 들어가기',
  });
  // 출구: 디오라마 북쪽 벽의 문 앞 — 스폰과 2m 이상 간격(입장 직후 E 연타로 바로 안 나가게)
  pois.push({
    id: 'room-exit', type: 'house-exit',
    x: X + 1.2, z: Z - 5.6, r: 1.5, // 새 북쪽 벽(−7)으로 슬라이드된 문 앞
    prompt: '밖으로 나가기',
  });

  return { dome };
}
