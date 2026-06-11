// @ts-nocheck — three GLTFLoader, runtime 3D code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const AVATAR_URL = '/glb/npc/avatar_1781076713172.glb';
const TARGET_HEIGHT = 2.0;   // 기존 절차적 캐릭터와 동일한 키

// GLB 아바타를 로드해 게임 월드 좌표/크기에 맞춰 정규화한 wrapper Group을 반환한다.
// wrapper로 한 번 감싸므로 게임 루프의 스케일(점프)·회전·bob 변형이
// 내부 정규화 변형과 충돌하지 않는다.
export function loadAvatar(
  url: string = AVATAR_URL,
  targetHeight: number = TARGET_HEIGHT,
): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.frustumCulled = false;   // 스킨드 메시 박스 부정확 → culling 방지
          }
        });

        // 스킨드 메시는 setFromObject 박스가 부정확(bind-pose geometry가 ~0).
        // 본(bone)의 월드 좌표로 실제 캐릭터 크기를 측정한다.
        model.updateMatrixWorld(true);
        const box = new THREE.Box3();
        const v = new THREE.Vector3();
        let hasBone = false;
        model.traverse((o) => {
          if (o.isBone) {
            o.getWorldPosition(v);
            box.expandByPoint(v);
            hasBone = true;
          }
        });
        if (!hasBone) box.setFromObject(model);

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const scale = targetHeight / (size.y || 1);
        model.scale.setScalar(scale);
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        model.position.y = -box.min.y * scale;   // 발이 y=0에 닿도록

        const wrapper = new THREE.Group();
        wrapper.add(model);
        // 본 절차 애니메이션은 적용하지 않음 → animateLimbs가 early-return
        wrapper.userData = {};
        resolve(wrapper);
      },
      undefined,
      (err) => reject(err),
    );
  });
}
