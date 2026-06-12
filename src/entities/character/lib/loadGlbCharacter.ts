// @ts-nocheck — three GLTFLoader / AnimationMixer, runtime 3D code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TARGET_HEIGHT = 2.0; // 기존 절차적 캐릭터·GLB 아바타와 동일한 키

// public/glb/character/player 안의 Mixamo 캐릭터 (FBX → GLB 변환본).
//  - run    : 베이스 메시(스킨 + 스켈레톤)이자 달리기 클립
//  - jump   : 점프 클립만 사용
//  - back   : 뒤로 달리기 클립만 사용
//  - stop   : 멈추는(Run To Stop) 클립만 사용
const BASE_URL = '/glb/character/player/Fast Run.glb';
const JUMP_URL = '/glb/character/player/Jump.glb';
const BACK_URL = '/glb/character/player/Running Backward.glb';
const STOP_URL = '/glb/character/player/Run To Stop.glb';

// Mixamo 클립은 Hips 본에 루트 위치(translation) 트랙을 담아 캐릭터를
// 통째로 이동·상승시킨다. 게임은 자체 물리(player.position, jumpY)로
// 위치를 제어하므로 위치 트랙을 제거해 "제자리(in-place)" 애니메이션으로 만든다.
// (회전 트랙은 유지 → 팔다리·몸통 모션은 그대로 살아 있음.)
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position'));
  return clip;
}

// 스킨드 메시는 bind-pose 박스가 부정확하므로 본 월드 좌표로 실제 크기를 잰다.
function normalize(model: THREE.Object3D, targetHeight: number): void {
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
  model.position.y = -box.min.y * scale; // 발이 y=0에 닿도록
}

// GLB 캐릭터를 로드해 wrapper Group을 반환한다.
// wrapper.userData 에 애니메이션 컨트롤러를 붙여 게임 루프에서 제어한다.
//   - update(dt)                : 매 프레임 mixer 갱신
//   - setMotion(speed, grounded): 상태에 맞는 클립으로 크로스페이드
export async function loadGlbCharacter(
  targetHeight: number = TARGET_HEIGHT,
): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const load = (url: string): Promise<any> =>
    new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

  // 베이스 메시 + 나머지 클립 소스를 병렬 로드
  const [baseGltf, jumpGltf, backGltf, stopGltf] = await Promise.all([
    load(BASE_URL),
    load(JUMP_URL),
    load(BACK_URL),
    load(STOP_URL),
  ]);

  const base = baseGltf.scene;
  base.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false; // 스킨드 메시 박스 부정확 → culling 방지

    // 얼굴 데칼(눈·눈썹·입) 보정 — 두 가지 문제를 함께 해결:
    //  1) 데칼 노멀이 변환 중 깨져 빛을 못 받아 검게 렌더링 → 텍스처를 emissive 로
    //     옮겨 unlit(조명 무관)으로 만든다. 데칼은 플랫 카툰 그래픽이라 원래 의도와 일치.
    //  2) GLTFLoader가 BLEND 머티리얼에 depthWrite=false + doubleSided 설정 →
    //     뒷면 비침/정렬 아티팩트 → FrontSide + depthWrite 로 고정.
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat) continue;
      const n = (mat.name || '').toLowerCase();
      const isDecal = n.includes('eye') || n.includes('brow') || n.includes('mouth');
      if (!isDecal) continue;

      // 데칼은 unlit(emissive) + 씬 블룸 때문에 full-bright 면 과하게 빛난다.
      // 밝기를 낮춰 차분하게:
      //  - 눈/눈썹: 흰자 발광 방지를 위해 ~0.74 로 다운
      //  - 입술: FBX 원본 텍스처(Boy01_FacialAnimMap)의 코랄 입술색을 기준으로
      //    톤다운한 따뜻한 코랄 (≈ (180,128,115) 톤)
      if (n.includes('mouth')) mat.emissive.setRGB(0.80, 0.28, 0.26);
      else mat.emissive.setRGB(0.74, 0.74, 0.74);
      mat.emissiveMap = mat.map;
      mat.color.setRGB(0, 0, 0); // 조명 기여 제거 → emissiveMap 원색 그대로
      mat.side = THREE.FrontSide;
      mat.depthWrite = true;
      if (n.includes('eye')) {
        mat.transparent = false;
        mat.alphaTest = 0.5; // 눈 사이 투명 영역만 잘라냄
      }
      mat.needsUpdate = true;
    }
  });
  normalize(base, targetHeight);

  const mixer = new THREE.AnimationMixer(base);
  const runClip = stripRootMotion(baseGltf.animations[0]);
  const jumpClip = stripRootMotion(jumpGltf.animations[0]);
  const backClip = stripRootMotion(backGltf.animations[0]);
  const stopClip = stripRootMotion(stopGltf.animations[0]);

  const actions = {
    run: mixer.clipAction(runClip),
    jump: mixer.clipAction(jumpClip),
    back: mixer.clipAction(backClip),
    stop: mixer.clipAction(stopClip),
  };
  // 1회성(once-clamp) 클립 — 끝 프레임에서 멈춰 정지/공중 자세를 유지
  for (const once of [actions.jump, actions.stop]) {
    once.setLoop(THREE.LoopOnce, 1);
    once.clampWhenFinished = true;
  }
  // 멈추는 동작은 빠르게 재생해 반응을 즉각적으로 (Run To Stop 클립은 기본이 느림)
  actions.stop.timeScale = 1.8;

  // 달리기를 항상 재생하되, timeScale 로 다리 속도를 제어한다.
  // 정지 시엔 'stop'(Run To Stop) 클립으로 전환해 멈추는 동작을 보여준다.
  actions.run.play();
  let active: 'run' | 'jump' | 'back' | 'stop' = 'run';

  function fadeTo(name: 'run' | 'jump' | 'back' | 'stop', dur = 0.18): void {
    if (name === active) return;
    const next = actions[name];
    const prev = actions[active];
    next.reset();
    if (name === 'jump' || name === 'stop') {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    }
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    next.crossFadeFrom(prev, dur, false);
    active = name;
  }

  const wrapper = new THREE.Group();
  wrapper.add(base);
  wrapper.userData = {
    animated: true,
    mixer,
    actions,
    update(dt: number): void {
      mixer.update(dt);
    },
    // speed: 수평 속도(m/s), grounded: 접지 여부, backward: 뒤로 이동 여부
    setMotion(
      speed: number,
      grounded: boolean,
      walkSpeed = 5.5,
      backward = false,
    ): void {
      const cadence = THREE.MathUtils.clamp(speed / walkSpeed, 0, 2);
      actions.run.timeScale = grounded ? Math.max(cadence, 0.2) : 1;
      actions.back.timeScale = grounded ? Math.max(cadence, 0.2) : 1;

      if (!grounded) {
        fadeTo('jump');
      } else if (speed > 1.5) {
        // 임계값을 높여 감속 초기에 바로 멈춤 동작으로 넘어가도록 (반응 빠르게)
        fadeTo(backward ? 'back' : 'run');
      } else {
        fadeTo('stop', 0.08); // Run To Stop → 짧은 크로스페이드로 즉각 전환
      }
    },
  };
  return wrapper;
}
