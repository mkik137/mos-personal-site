// @ts-nocheck — Three.js vertex-bending geometry code; type-checking disabled.
import * as THREE from 'three';
import { makeFaceTexture } from './parts/humanFace';
import { makeHumanEar } from './parts/ear';
import { makeHumanArm } from './parts/arm';
import { makeHumanLeg } from './parts/leg';
import { makeHumanHair } from './parts/hair';

const SKIN = 0xf3c39a;

export function makeCharacter(shirt: number, pants: number, hairColor = 0x2a2320): THREE.Group {
  const g = new THREE.Group();

  const skinMat  = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const shoeMat  = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.7 });
  const hairMat  = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

  // ── 몸통 ──
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.40, 20, 18), shirtMat);
  torso.position.y = 0.78;
  torso.scale.set(1, 1.18, 0.92);
  torso.castShadow = true;
  g.add(torso);

  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.30, 0.22, 18), pantsMat);
  hem.position.y = 0.5;
  hem.castShadow = true;
  g.add(hem);

  // ── 머리 ──
  const HY = 1.52, HR = 0.56;
  const head = new THREE.Mesh(new THREE.SphereGeometry(HR, 28, 24), skinMat);
  head.position.y = HY;
  head.scale.set(1, 0.96, 0.96);
  head.castShadow = true;
  g.add(head);

  // ── 머리카락 ──
  for (const part of makeHumanHair(HY, HR, hairMat)) g.add(part);

  // ── 얼굴 (눈·코·입·눈썹·볼 텍스처) ──
  const faceTex = makeFaceTexture({ brow: '#' + new THREE.Color(hairColor).getHexString() });
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex, transparent: true, roughness: 0.7,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const faceGeo = new THREE.PlaneGeometry(HR * 1.55, HR * 1.55, 18, 18);
  {
    const pos = faceGeo.attributes.position;
    const r = HR + 0.006;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sqrt(Math.max(0, r * r - x * x - y * y)));
    }
    pos.needsUpdate = true;
    faceGeo.computeVertexNormals();
  }
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, HY, 0);
  face.scale.z = 0.96;
  face.renderOrder = 2;
  g.add(face);

  // ── 귀 ──
  [-1, 1].forEach((side) => g.add(makeHumanEar(side, HY, HR, skinMat)));

  // ── 팔 (상박 + 손) ──
  const leftArm  = makeHumanArm(-1, shirtMat, skinMat);
  const rightArm = makeHumanArm( 1, shirtMat, skinMat);
  g.add(leftArm);
  g.add(rightArm);

  // ── 다리 (하박 + 발/신발) ──
  const leftLeg  = makeHumanLeg(-1, pantsMat, shoeMat);
  const rightLeg = makeHumanLeg( 1, pantsMat, shoeMat);
  g.add(leftLeg);
  g.add(rightLeg);

  g.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, headY: HY };
  return g;
}
