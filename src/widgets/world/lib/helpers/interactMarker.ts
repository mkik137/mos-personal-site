// @ts-nocheck
// 상호작용 표시 마커 — 오브젝트 위에 둥실거리는 키캡 스프라이트.
// 데스크톱은 'E'(HUD 키 표기와 동일), 터치 기기는 '탭'으로 그려 조작법이 즉시 읽힌다.
import * as THREE from 'three';

let sharedTex = null;

// 빌드 시점(body.touch 부착 전)에 호출되므로 미디어쿼리로 직접 감지한다.
const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

function makeKeycapTexture() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 96;
  const c = cv.getContext('2d');
  // 키캡 (흰 라운드 사각 + 아래쪽 두꺼운 테두리)
  c.fillStyle = 'rgba(20,22,30,0.25)';
  c.beginPath(); c.roundRect(14, 18, 68, 68, 16); c.fill(); // 그림자
  c.fillStyle = '#ffffff';
  c.strokeStyle = 'rgba(30,32,44,0.85)';
  c.lineWidth = 5;
  c.beginPath(); c.roundRect(14, 10, 68, 68, 16);
  c.fill(); c.stroke();
  // 글자 — 데스크톱 'E' / 터치 '탭'
  c.fillStyle = '#1c1e2a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (isTouch) {
    c.font = '700 34px Poppins, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    c.fillText('탭', 48, 47);
  } else {
    c.font = '700 44px Poppins, Arial, sans-serif';
    c.fillText('E', 48, 46);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// region: 실내 마커는 그 방의 region 으로 태그 → 방 밖에 있을 땐 애니메이션이 멈춘다
// (생략 시 undefined = 전역 — 기존 호출부 동작 보존).
export function addInteractMarker(scene, floaters, x, y, z, region): THREE.Sprite {
  if (!sharedTex) sharedTex = makeKeycapTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: sharedTex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.4, 0.4, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
  floaters.push({ mesh: sprite, baseY: y, amp: 0.07, phase: x * 1.3 + z, speed: 2.2, region });
  return sprite;
}
