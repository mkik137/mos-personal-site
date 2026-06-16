// @ts-nocheck
// NPC 머리 위 이름표 — 항상 카메라를 향하는 Sprite(빌보드). 흰 글자 + 어두운 외곽선.
import * as THREE from 'three';

// parent(NPC Object3D)에 이름표 스프라이트를 붙이고 반환한다.
//  y       : 머리 위 높이(월드 단위)
//  worldH  : 이름표 높이(월드 단위) — 글자 크기. (배회 NPC ~0.26, 큰 NPC ~0.3)
export function addNameTag(parent, name, y = 2.0, worldH = 0.26): THREE.Sprite {
  const dpr = 2;
  const fontPx = 64;
  const padX = 26, padY = 14;
  const cv = document.createElement('canvas');
  let ctx = cv.getContext('2d');
  // Pretendard 미로드 시 시스템 한글 폰트로 폴백 (canvas 는 웹폰트 로딩을 기다리지 않음).
  const font = `700 ${fontPx}px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(name).width);
  const w = textW + padX * 2;
  const h = fontPx + padY * 2;
  cv.width = w * dpr; cv.height = h * dpr;
  ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(20,16,12,0.9)';
  ctx.strokeText(name, w / 2, h / 2 + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(worldH * (w / h), worldH, 1);
  sprite.position.set(0, y, 0);
  parent.add(sprite);
  return sprite;
}
