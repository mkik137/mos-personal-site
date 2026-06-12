// @ts-nocheck
// 상호작용 표시 마커 — 오브젝트 위에 둥실거리는 'E' 키캡 스프라이트.
// HUD 의 키 표기(kbd)와 같은 모양이라 "E 로 상호작용"이 즉시 읽힌다.
import * as THREE from 'three';

let sharedTex = null;

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
  // E 글자
  c.fillStyle = '#1c1e2a';
  c.font = '700 44px Poppins, Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('E', 48, 46);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addInteractMarker(scene, floaters, x, y, z): THREE.Sprite {
  if (!sharedTex) sharedTex = makeKeycapTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: sharedTex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.4, 0.4, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
  floaters.push({ mesh: sprite, baseY: y, amp: 0.07, phase: x * 1.3 + z, speed: 2.2 });
  return sprite;
}
