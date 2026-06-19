// @ts-nocheck
import * as THREE from 'three';

export function buildClouds({ scene }) {
  const cloudGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1,
    emissive: 0xeef6ff, emissiveIntensity: 0.25,
    flatShading: true,
  });
  // 모든 puff 가 지오메트리 1개를 공유하고 크기는 scale 로 변주 (puff 80여 개의 고유
  // 지오메트리 → 1개로 축소). 단위 반지름으로 만들고 scale 에 반지름을 곱한다.
  const puffGeo = new THREE.IcosahedronGeometry(1, 0);
  const N = 16;
  for (let i = 0; i < N; i++) {
    const c = new THREE.Group();
    const n = 4 + ((Math.random() * 4) | 0);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(puffGeo, mat);
      puff.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 3.2,
      );
      const r = 1.8 + Math.random() * 1.8;
      puff.scale.set(r, r * 0.7, r);
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
