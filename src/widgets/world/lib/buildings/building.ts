// @ts-nocheck
import * as THREE from 'three';
import { makeTextPlane } from '../helpers/makeTextPlane';

export function buildBuilding({ scene, pulsers }, { x, z, w, d, h, wall, roof, accent, sign }) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: wall, roughness: 0.82 }),
  );
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.86, 2.4, 4),
    new THREE.MeshStandardMaterial({ color: roof, roughness: 0.7, flatShading: true }),
  );
  roofMesh.position.y = h + 1.2;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  g.add(roofMesh);

  // 문
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.4, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x33271c, roughness: 0.6 }),
  );
  door.position.set(0, 1.2, d / 2 + 0.02);
  g.add(door);

  // 아치 네온
  const arch = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshBasicMaterial({ color: accent }),
  );
  arch.position.set(0, 2.55, d / 2 + 0.03);
  g.add(arch);
  pulsers.push({ mat: arch.material, base: accent, phase: x, lo: 0.6, hi: 1.0 });

  // 창문
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x8fd0e6, roughness: 0.2, metalness: 0.1,
    emissive: 0x6fc0e0, emissiveIntensity: 0.5,
  });
  [-1, 1].forEach((sx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), winMat);
    win.position.set(sx * 1.9, 2.3, d / 2 + 0.02);
    g.add(win);
  });

  // 간판
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.74, 0.85, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.6 }),
  );
  board.position.set(0, h + 0.05, d / 2 + 0.12);
  g.add(board);

  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.68, 0.62),
    new THREE.MeshBasicMaterial({ color: accent }),
  );
  signFace.position.set(0, h + 0.05, d / 2 + 0.21);
  g.add(signFace);
  signFace.add(makeTextPlane(sign, w * 0.6, 0.5, '#ffffff'));
  pulsers.push({ mat: signFace.material, base: accent, phase: z, lo: 0.65, hi: 1.0 });

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}
