// @ts-nocheck
import * as THREE from 'three';

export function makeTextPlane(text, w, h, color = '#ffffff') {
  const cw = 512, ch = Math.round(512 * (h / w));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(ch * 0.6)}px Poppins, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cw / 2, ch / 2 + ch * 0.04);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.z = 0.08;
  return plane;
}
