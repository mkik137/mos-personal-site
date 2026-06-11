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
    new THREE.CylinderGeometry(0.01, 0.01, 3.0, 4),
    new THREE.MeshStandardMaterial({ color: 0x999 }),
  );
  str.position.y = -2.1;
  g.add(str);

  g.position.set(x, 3.4, z);
  scene.add(g);
  floaters.push({ mesh: g, baseY: 3.4, amp: 0.3, phase: seed * 2, speed: 0.8 });
}
