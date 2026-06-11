// @ts-nocheck
import * as THREE from 'three';

export function addBalloon({ scene, floaters }, x, z, color, seed) {
  const g = new THREE.Group();

  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
  );
  balloon.scale.y = 1.2;
  g.add(balloon);

  const knot = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.18, 6),
    new THREE.MeshStandardMaterial({ color }),
  );
  knot.position.y = -0.62; knot.rotation.x = Math.PI;
  g.add(knot);

  // 실
  const str = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 4.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x999 }),
  );
  str.position.y = -2.85;
  g.add(str);

  // 하늘 위에 둥실 — 풍선마다 높이를 조금씩 다르게
  const baseY = 8.5 + (seed % 3) * 1.2;
  g.position.set(x, baseY, z);
  scene.add(g);
  floaters.push({ mesh: g, baseY, amp: 0.45, phase: seed * 2, speed: 0.8 });
}
