import * as THREE from 'three';

export function makeHumanEar(
  side: number,
  HY: number,
  HR: number,
  skinMat: THREE.MeshStandardMaterial,
): THREE.Mesh {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), skinMat);
  ear.position.set(side * (HR - 0.02), HY - 0.04, 0.0);
  ear.scale.set(0.5, 1, 0.85);
  return ear;
}

export function makeShibaEar(
  side: number,
  HY: number,
  HR: number,
  furMat: THREE.MeshStandardMaterial,
  creamMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const ear = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), furMat);
  outer.castShadow = true;
  ear.add(outer);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 4), creamMat);
  inner.position.set(0, -0.01, 0.045);
  ear.add(inner);
  ear.position.set(side * 0.30, HY + HR * 0.74, -0.02);
  ear.rotation.set(0.12, Math.PI / 4, side * 0.30);
  return ear;
}
