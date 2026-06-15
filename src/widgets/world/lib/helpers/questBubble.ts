// @ts-nocheck
// 정적 NPC(가람 등) 머리 위 퀘스트 안내 풍선 ("?" 마크).
// 배회 NPC(wanderer)는 자체 말풍선이 있고, 이건 고정 POI 용 경량 버전.
import * as THREE from 'three';
import { drawQuestMark } from './questMark';

let sharedTex = null;

function makeBookTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 96;
  const c = cv.getContext('2d');
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(35,32,48,0.92)';
  c.fillStyle = 'rgba(255,255,255,0.97)';
  // 꼬리
  c.beginPath(); c.moveTo(50, 60); c.lineTo(64, 90); c.lineTo(78, 60); c.closePath();
  c.fill(); c.stroke();
  // 몸통
  c.beginPath(); c.roundRect(8, 8, 112, 56, 18); c.fill(); c.stroke();
  // 퀘스트 마크 "?" (받으러 오라는 표시)
  drawQuestMark(c, 64, 36, 46);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// parent(보통 NPC Object3D)에 풍선 스프라이트를 붙이고 {setVisible} 핸들을 반환.
// floaters 에 등록하면 루프가 둥실거림을 자동 처리한다.
export function addQuestBubble(parent, floaters, y = 2.7): { setVisible: (v: boolean) => void } {
  if (!sharedTex) sharedTex = makeBookTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: sharedTex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.82, 0.615, 1);
  sprite.position.set(0, y, 0);
  sprite.visible = false;
  parent.add(sprite);
  floaters.push({ mesh: sprite, baseY: y, amp: 0.06, phase: 1.3, speed: 2.4 });
  return { setVisible: (v) => { sprite.visible = !!v; } };
}
