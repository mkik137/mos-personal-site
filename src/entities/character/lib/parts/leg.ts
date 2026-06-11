import * as THREE from 'three';

export function makeHumanLeg(
  side: number,
  pantsMat: THREE.MeshStandardMaterial,
  shoeMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.15, 0.5, 0);
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.16, 6, 10), pantsMat);
  leg.position.y = -0.16;
  leg.castShadow = true;
  pivot.add(leg);
  const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), shoeMat);
  shoe.position.set(0, -0.32, 0.05);
  shoe.scale.set(0.95, 0.7, 1.25);
  shoe.castShadow = true;
  pivot.add(shoe);
  return pivot;
}

export function makeShibaLeg(
  side: number,
  furMat: THREE.MeshStandardMaterial,
  creamMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const pivot = new THREE.Group();
  // chibi: 부착점 낮게, 다리 간격 약간 넓게
  pivot.position.set(side * 0.16, 0.38, 0);

  // 다리: 더 짧고 통통하게
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.148, 0.08, 6, 10), furMat);
  leg.position.y = -0.11;
  leg.castShadow = true;
  pivot.add(leg);

  // 발바닥: 더 크고 동그랗게
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 12), creamMat);
  paw.position.set(0, -0.25, 0.05);
  paw.scale.set(0.98, 0.68, 1.22);
  paw.castShadow = true;
  pivot.add(paw);

  return pivot;
}
