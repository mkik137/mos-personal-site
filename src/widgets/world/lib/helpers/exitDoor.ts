// @ts-nocheck
// 실내 개방면에 홀로 서 있는 출구 문 — 나가는 위치를 시각적으로 표시.
// 문 위에 초록 '나가기' 간판이 붙어 있고, 간판/문 정면은 카메라(남쪽)를 향한다.
import * as THREE from 'three';
import { makeTextPlane } from './makeTextPlane';

export function addExitDoor(scene, x, z): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6e4326, roughness: 0.7 });

  // 문틀
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.18), wood);
  postL.position.set(-0.67, 1.2, 0);
  const postR = postL.clone();
  postR.position.x = 0.67;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 0.18), wood);
  lintel.position.y = 2.46;
  // 문짝 + 손잡이
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.32, 0.08), dark);
  slab.position.y = 1.16;
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9b44a, roughness: 0.3 }),
  );
  knob.position.set(0.42, 1.15, 0.09);
  // '나가기' 간판
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.32),
    new THREE.MeshBasicMaterial({ color: 0x2bb673 }),
  );
  sign.position.set(0, 2.78, 0.03);
  sign.add(makeTextPlane('나가기', 0.9, 0.26, '#ffffff'));

  g.add(postL, postR, lintel, slab, knob, sign);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}
