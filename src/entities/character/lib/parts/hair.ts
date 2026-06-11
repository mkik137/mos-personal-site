import * as THREE from 'three';

export function makeHumanHair(
  HY: number,
  HR: number,
  hairMat: THREE.MeshStandardMaterial,
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.03, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.46),
    hairMat,
  );
  hair.position.set(0, HY, -0.02);
  hair.scale.set(1.03, 1.04, 1.02);
  hair.castShadow = true;
  parts.push(hair);

  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.022, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hairMat,
  );
  backHair.position.set(0, HY, 0);
  backHair.scale.set(1.03, 1.04, 1.03);
  backHair.rotation.x = -Math.PI / 2;
  backHair.castShadow = true;
  parts.push(backHair);

  const HAIRLINE = HY + 0.20;
  [-2, -1, 0, 1, 2].forEach((i) => {
    const a = i * 0.32;
    const lock = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 14), hairMat);
    const rad = HR + 0.01;
    lock.position.set(
      Math.sin(a) * rad * 0.82,
      HAIRLINE - Math.abs(i) * 0.012,
      Math.cos(a) * rad * 0.72,
    );
    lock.scale.set(0.92, 0.78, 0.72);
    lock.rotation.y = -a;
    lock.castShadow = true;
    parts.push(lock);
  });

  return parts;
}
