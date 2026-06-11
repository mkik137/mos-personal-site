// @ts-nocheck
import * as THREE from 'three';
import { SPRITES } from '../constants';

export function makeScreenTexture(sprite, color) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0820';
  ctx.fillRect(0, 0, s, s);
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < s; y += 4) ctx.fillRect(0, y, s, 2);
  // pixel sprite
  const grid = SPRITES[sprite] || SPRITES.invader;
  const px = 12, ox = (s - px * 8) / 2, oy = (s - px * 8) / 2;
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  grid.forEach((row, r) => {
    for (let c = 0; c < 8; c++) {
      if (row[c] === '1') ctx.fillRect(ox + c * px, oy + r * px, px - 1, px - 1);
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}
