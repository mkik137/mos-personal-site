// @ts-nocheck
import * as THREE from 'three';

export function buildClouds({ scene }) {
  const cloudGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1,
    emissive: 0xeef6ff, emissiveIntensity: 0.25,
    flatShading: true,
  });
  const N = 16;
  for (let i = 0; i < N; i++) {
    const c = new THREE.Group();
    const n = 4 + ((Math.random() * 4) | 0);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + Math.random() * 1.8, 0), mat);
      puff.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 3.2,
      );
      puff.scale.y = 0.7;
      c.add(puff);
    }
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.3;
    const rad = 26 + Math.random() * 30;
    c.position.set(Math.cos(a) * rad, 9 + Math.random() * 18, Math.sin(a) * rad);
    c.scale.setScalar(0.9 + Math.random() * 1.1);
    c.userData.angle = a;
    c.userData.rad   = rad;
    c.userData.speed = 0.012 + Math.random() * 0.022;
    cloudGroup.add(c);
  }
  scene.add(cloudGroup);
  return cloudGroup;
}
