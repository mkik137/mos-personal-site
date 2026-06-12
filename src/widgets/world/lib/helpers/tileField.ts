// @ts-nocheck — three GLTFLoader + InstancedMesh, 바닥 타일을 대량 배치하는 헬퍼.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cache = new Map<string, Promise<THREE.Object3D>>();
function loadRaw(url: string): Promise<THREE.Object3D> {
  let p = cache.get(url);
  if (!p) {
    const loader = new GLTFLoader();
    p = new Promise((res, rej) => loader.load(url, (g) => res(g.scene), undefined, rej));
    cache.set(url, p);
  }
  return p;
}

// GLB 프롭(나무 등)을 cells 위치마다 InstancedMesh 로 대량 배치 (draw call 최소).
//   baseSize  : 기준 크기 (byWidth=false → 높이 / true → 가로폭)으로 정규화
//   cells     : [{ x, z, ry?, s? }] 위치 + 개별 Y회전 + 개별 스케일배율(s)
//   y         : 바닥 기준 오프셋 (음수 → 땅에 심기. 모델 바운딩이 실제 발보다 낮을 때 보정)
// 바닥은 항상 y(기본 0) 에 닿게 정렬. 나무처럼 그루마다 크기/회전이 다른 프롭에 적합.
export async function addInstanced(
  scene: THREE.Scene,
  { url, baseSize, byWidth = false, cells, castShadow = true, y = 0 },
): Promise<THREE.InstancedMesh[]> {
  if (!cells.length) return [];
  const template = await loadRaw(url);
  const root = template.clone(true);

  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const dim = new THREE.Vector3();
  box.getSize(dim);
  const ref = byWidth ? Math.max(dim.x, dim.z) : dim.y;
  const scale = baseSize / (ref || 1);
  root.scale.setScalar(scale);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const baseY = box.min.y; // 정규화 후 최저점

  const subs = [];
  root.traverse((m) => { if (m.isMesh) subs.push({ geo: m.geometry, mat: m.material, mw: m.matrixWorld.clone() }); });

  const T = new THREE.Matrix4(), R = new THREE.Matrix4(), Sc = new THREE.Matrix4(), m = new THREE.Matrix4();
  const out: THREE.InstancedMesh[] = [];
  for (const s of subs) {
    const inst = new THREE.InstancedMesh(s.geo, s.mat, cells.length);
    inst.castShadow = castShadow;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const sc = c.s || 1;
      T.makeTranslation(c.x, y - baseY * sc, c.z); // 바닥을 y 에
      R.makeRotationY(c.ry || 0);
      Sc.makeScale(sc, sc, sc);
      m.copy(T).multiply(R).multiply(Sc).multiply(s.mw);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
    out.push(inst);
  }
  return out;
}

// GLB 타일을 cells 위치마다 InstancedMesh 로 깐다 (서브메시당 draw call 1회).
//   url        : 타일 GLB
//   tile       : 목표 footprint 가로폭 (월드 단위) — 모델 실측을 이 값으로 정규화
//   cells      : [{ x, z, ry? }] 배치 위치 (+ 개별 회전)
//   y          : 타일 바닥이 닿을 높이
//   rotateEach : ry 없는 셀에 90° 랜덤 회전 (잔디 다양성)
export async function addTiles(
  scene: THREE.Scene,
  { url, tile, cells, y = 0, rotateEach = false, castShadow = false, anchorTop = false },
): Promise<THREE.InstancedMesh[]> {
  if (!cells.length) return [];

  const template = await loadRaw(url);
  const root = template.clone(true);

  // 모델 실측 → footprint 가로폭을 tile 로 정규화
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = tile / (Math.max(size.x, size.z) || 1);
  root.scale.setScalar(scale);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  // anchorTop=true 면 타일 윗면(잔디 표면)을 y 에 맞춤 → 플레이어가 표면 위를 걷는다.
  // false 면 바닥면을 y 에 맞춤 (얇은 floor/cobble 타일용).
  const anchorY = anchorTop ? box.max.y : box.min.y;

  // 서브메시별 geometry/material + (root 기준) 월드 행렬 수집
  const subs = [];
  root.traverse((m) => {
    if (m.isMesh) subs.push({ geo: m.geometry, mat: m.material, mw: m.matrixWorld.clone() });
  });

  const lift = new THREE.Matrix4().makeTranslation(0, y - anchorY, 0);
  const place = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const out: THREE.InstancedMesh[] = [];

  for (const s of subs) {
    const inst = new THREE.InstancedMesh(s.geo, s.mat, cells.length);
    inst.frustumCulled = false; // 큰 바닥 필드 — 컬링 오판 방지
    inst.receiveShadow = true;
    inst.castShadow = castShadow;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const ry = c.ry !== undefined ? c.ry : rotateEach ? Math.floor(Math.random() * 4) * (Math.PI / 2) : 0;
      place.makeTranslation(c.x, 0, c.z);
      rot.makeRotationY(ry);
      // instanceMatrix = lift · T(cell) · R(ry) · meshWorld
      const mtx = new THREE.Matrix4().copy(lift).multiply(place).multiply(rot).multiply(s.mw);
      inst.setMatrixAt(i, mtx);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
    out.push(inst);
  }
  return out;
}
