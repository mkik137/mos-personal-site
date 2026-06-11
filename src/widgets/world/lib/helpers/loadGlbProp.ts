// @ts-nocheck — three GLTFLoader, runtime 3D code (정적 메시 프롭 로더).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 같은 GLB를 여러 번 인스턴스화할 때 네트워크/파싱 비용을 줄이기 위해
// 원본을 한 번만 로드해 캐시하고, 매 호출은 clone 으로 복제한다.
const cache = new Map<string, Promise<THREE.Object3D>>();

function loadRaw(url: string): Promise<THREE.Object3D> {
  let p = cache.get(url);
  if (!p) {
    const loader = new GLTFLoader();
    p = new Promise((resolve, reject) =>
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject),
    );
    cache.set(url, p);
  }
  return p;
}

// 정적 GLB(건물·나무 등)를 로드해 정규화한 wrapper Group 을 반환한다.
// wrapper 원점은 모델의 바닥-중심 → 그대로 position.set(x, 0, z) 로 배치 가능.
//
//  - byWidth=false(기본): size 를 "높이(Y)" 로 해석 (나무 등 키가 중요한 프롭)
//  - byWidth=true        : size 를 "가로폭(XZ 큰 쪽)" 으로 해석 (건물 등 바닥 면적이
//    중요한 프롭). 납작-넓은 건물을 높이로 스케일하면 가로가 폭발하므로 폭 기준 필수.
export async function loadGlbProp(
  url: string,
  size: number,
  byWidth: boolean = false,
): Promise<THREE.Group> {
  const template = await loadRaw(url);
  const model = template.clone(true);

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // 정적 메시는 setFromObject 박스가 정확하다.
  const box = new THREE.Box3().setFromObject(model);
  const dim = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(dim);
  box.getCenter(center);

  const ref = byWidth ? Math.max(dim.x, dim.z) : dim.y;
  const scale = size / (ref || 1);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.z = -center.z * scale;
  model.position.y = -box.min.y * scale; // 바닥이 y=0 에 닿도록

  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}
