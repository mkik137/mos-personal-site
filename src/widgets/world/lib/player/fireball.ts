// @ts-nocheck — three GLTFLoader, runtime 3D code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 스킬 발사체 — 시전 시 정면으로 날아가는 투사체. 스킬마다 다른 모델을 쓴다.
//  - 모델별로 1회 로드해 프로토타입으로 두고, 발사할 때마다 clone.
//  - 각 발사체는 정면 방향 속도 + 수명(life)을 가지며, 수명이 다하면 씬에서 제거.
//  - 발광은 emissive + 블룸으로만 처리(동적 광원 없음). PointLight 를 쓰면 발사 때마다 씬
//    조명 수가 바뀌어 모든 머티리얼이 재컴파일되며 "첫 시전 렉"이 생기므로 일부러 안 쓴다.
const SPEED = 17;  // m/s — 기본 전진 속도
const LIFE  = 1.1; // s    — 기본 수명(사거리 ≈ SPEED × LIFE)
const SIZE  = 1.0; // 정규화 높이(m)

// 발사체 모델 레지스트리 (poly.pizza, 전부 CC0 — Quaternius).
//  emissive [r,g,b] → 자체발광(불·번개): 조명 무관하게 항상 밝고 블룸이 받는다.
//  emissive null     → 원래 재질로 조명 받음(바위): 회색 돌 본연의 색 유지.
const MODELS: Record<string, { url: string; emissive: [number, number, number] | null }> = {
  fire:   { url: '/glb/character/player/Fire.glb', emissive: [1.0, 0.55, 0.18] }, // 파이어볼·삼연사
  meteor: { url: '/glb/skill/Meteor.glb',          emissive: null },               // 메테오(혜성/운석 — 텍스처 발광색 유지)
  bolt:   { url: '/glb/skill/Bolt.glb',            emissive: [0.72, 0.82, 1.0] },  // 라이트닝(번개)
};
const DEFAULT_MODEL = 'fire';

export function createFireballs(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
  camera?: THREE.Camera,
) {
  const protos: Record<string, THREE.Object3D> = {};
  const live: Array<{ mesh: THREE.Object3D; vel: THREE.Vector3; t: number; base: number; life: number }> = [];
  const loader = new GLTFLoader();

  // 높이 기준 정규화 + (emissive 지정 시) 자체발광 처리. null 이면 원래 재질 유지(바위).
  function prep(m: THREE.Object3D, cfg: { emissive: [number, number, number] | null }): THREE.Object3D {
    const box = new THREE.Box3().setFromObject(m);
    const size = new THREE.Vector3();
    box.getSize(size);
    m.scale.setScalar(SIZE / (size.y || 1));
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = false;
      if (!cfg.emissive) return; // 바위: 원래 재질 그대로 조명 받음
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) {
        if (!mt || !mt.emissive) continue;
        mt.emissive.setRGB(cfg.emissive[0], cfg.emissive[1], cfg.emissive[2]);
        mt.toneMapped = false;
      }
    });
    return m;
  }

  for (const key of Object.keys(MODELS)) {
    const cfg = MODELS[key];
    loader.load(cfg.url, (g) => {
      protos[key] = prep(g.scene, cfg);
      // ── 셰이더 프리워밍 ── 첫 발사 때 머티리얼이 처음 렌더되며 컴파일되는 hitch 를 막기 위해,
      // 각 모델 메시를 화면 밖에 잠깐 넣고 renderer.compile 로 미리 컴파일·캐시한다.
      // (동적 광원이 없어 조명 수가 안 바뀌므로, 이 프리워밍만으로 첫 시전이 매끄럽다.)
      if (renderer && camera) {
        const warm = protos[key].clone(true);
        warm.position.set(0, -200, 0);
        scene.add(warm);
        renderer.compile(scene, camera);
        scene.remove(warm);
      }
    });
  }

  // opts: 스킬별 변형. model 로 모델 선택(발광은 모델 emissive 로 처리 — 동적 광원 없음).
  function spawn(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    opts: { speed?: number; size?: number; life?: number; model?: string } = {},
  ): void {
    const { speed = SPEED, size = 1, life = LIFE, model = DEFAULT_MODEL } = opts;
    const proto = protos[model] || protos[DEFAULT_MODEL];
    if (!proto) return;
    const mesh = proto.clone(true);
    mesh.position.copy(origin);
    mesh.scale.multiplyScalar(size);
    scene.add(mesh);
    live.push({ mesh, vel: dir.clone().setY(0).normalize().multiplyScalar(speed), t: 0, base: mesh.scale.x, life });
  }

  function update(dt: number): void {
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i];
      f.t += dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.rotation.y += dt * 14; // 회전(불은 일렁임, 바위는 구르는 느낌)
      const k = 1 - f.t / f.life;   // 끝나갈 때 살짝 부풀며 사라지는 연출
      f.mesh.scale.setScalar(f.base * (1 + (1 - k) * 0.4));
      if (f.t >= f.life) {
        scene.remove(f.mesh);
        live.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}
