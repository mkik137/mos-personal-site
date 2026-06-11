import * as THREE from 'three';

export function makeHumanArm(
  side: number,
  shirtMat: THREE.MeshStandardMaterial,
  skinMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.36, 1.0, 0);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.22, 6, 10), shirtMat);
  upper.position.y = -0.16;
  upper.castShadow = true;
  pivot.add(upper);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), skinMat);
  hand.position.y = -0.34;
  hand.castShadow = true;
  pivot.add(hand);
  pivot.rotation.z = side * 0.14;
  return pivot;
}

export function makeShibaArm(
  side: number,
  furMat: THREE.MeshStandardMaterial,
  creamMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const pivot = new THREE.Group();
  // chibi: 몸통이 낮아졌으므로 팔 부착점도 낮게, 바깥으로 더 넓게
  pivot.position.set(side * 0.40, 0.84, 0);

  // 상박: 더 짧고 통통하게
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.120, 0.12, 6, 10), furMat);
  upper.position.y = -0.11;
  upper.castShadow = true;
  pivot.add(upper);

  // 발바닥: 더 크고 동그랗게
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.130, 14, 14), creamMat);
  paw.position.y = -0.26;
  paw.castShadow = true;
  pivot.add(paw);

  pivot.rotation.z = side * 0.18;
  return pivot;
}
