import * as THREE from 'three';

export function makeShibaTail(
  furMat: THREE.MeshStandardMaterial,
  creamMat: THREE.MeshStandardMaterial,
): THREE.Group {
  // 뿌리에서 위로 살짝 솟았다가 부드럽게 아래로 흘러내리는 S자 곡선
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,  0.04,  0.04),
    new THREE.Vector3(0,  0.09, -0.05),
    new THREE.Vector3(0,  0.07, -0.14),
    new THREE.Vector3(0, -0.02, -0.21),
    new THREE.Vector3(0, -0.14, -0.25),
    new THREE.Vector3(0, -0.27, -0.24),
  ], false, 'catmullrom', 0.5);

  const SEGMENTS = 64;   // 곡선을 따라 더 촘촘하게 → 매끄러움
  const RADIAL   = 16;   // 단면 둘레 분할 → 둥글고 부드럽게
  const BASE_R   = 0.085; // 뿌리 두께 (기존 0.13 → 더 얇게)

  const tailGeo = new THREE.TubeGeometry(tailCurve, SEGMENTS, BASE_R, RADIAL, false);
  const pos = tailGeo.attributes.position as THREE.BufferAttribute;
  const rings = SEGMENTS + 1, perRing = RADIAL + 1;

  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / perRing);
    const tt = Math.min(ring / (rings - 1), 1);
    // ease-out 테이퍼: 뿌리는 통통, 끝으로 갈수록 가늘게 (꼬리 끝 ~22% 두께)
    const taper = 1 - Math.pow(tt, 1.4) * 0.78;
    const c = tailCurve.getPointAt(tt);
    pos.setX(i, c.x + (pos.getX(i) - c.x) * taper);
    pos.setY(i, c.y + (pos.getY(i) - c.y) * taper);
    pos.setZ(i, c.z + (pos.getZ(i) - c.z) * taper);
  }
  pos.needsUpdate = true;
  tailGeo.computeVertexNormals();

  const tail = new THREE.Group();

  const tailMesh = new THREE.Mesh(tailGeo, furMat);
  tailMesh.castShadow = true;
  tail.add(tailMesh);

  // 부드러운 크림색 꼬리 끝 (테이퍼된 두께에 맞춰 작게)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), creamMat);
  tip.position.copy(tailCurve.getPointAt(1));
  tip.castShadow = true;
  tail.add(tip);

  tail.position.set(0, 0.68, -0.30);
  return tail;
}
