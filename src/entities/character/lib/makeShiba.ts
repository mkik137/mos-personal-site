// @ts-nocheck — Three.js vertex-bending geometry code; type-checking disabled.
import * as THREE from 'three';
import { makeShibaFaceTexture } from './parts/shibaFace';
import { makeShibaEar } from './parts/ear';
import { makeShibaArm } from './parts/arm';
import { makeShibaLeg } from './parts/leg';
import { makeShibaTail } from './parts/tail';

export function makeShiba(shirt = 0xff5b35): THREE.Group {
  const g = new THREE.Group();

  // Sketchfab "Shiba" (zixisun02) 레퍼런스: 따뜻한 주황 탄색 + 흰 배색 + 빨간 목줄
  const FUR    = 0xdd9550;   // 좀 더 진한 주황 탄색
  const CREAM  = 0xfbf2e2;   // 배·얼굴 아래·발의 흰 크림
  const DARK   = 0x241a12;
  const COLLAR = 0xd1392b;   // 빨간 목줄
  const TAG    = 0xf2c64e;   // 목줄 금색 태그
  const furMat    = new THREE.MeshStandardMaterial({ color: FUR,    roughness: 0.85 });
  const creamMat  = new THREE.MeshStandardMaterial({ color: CREAM,  roughness: 0.80 });
  const noseMat   = new THREE.MeshStandardMaterial({ color: DARK,   roughness: 0.40 });
  const collarMat = new THREE.MeshStandardMaterial({ color: COLLAR, roughness: 0.55 });
  const tagMat    = new THREE.MeshStandardMaterial({ color: TAG,    roughness: 0.35, metalness: 0.55 });

  // ─── 몸통 (chibi: 짧고 넓게) ──────────────────
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.40, 22, 18), furMat);
  torso.position.y = 0.68;
  torso.scale.set(1.10, 1.00, 0.90);   // 기존보다 납작하고 넓음
  torso.castShadow = true;
  g.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 16), creamMat);
  belly.position.set(0, 0.68, 0.14);
  belly.scale.set(0.86, 0.95, 0.62);
  belly.castShadow = true;
  g.add(belly);

  // 목 러프 (짧게)
  const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), creamMat);
  ruff.position.set(0, 0.90, 0.10);
  ruff.scale.set(1.05, 0.55, 0.72);
  ruff.castShadow = true;
  g.add(ruff);

  // ─── 머리 (HR 원래대로 — 얼굴 텍스처가 귀를 가리지 않도록) ──
  const HY = 1.44, HR = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(HR, 28, 24), furMat);
  head.position.y = HY;
  head.scale.set(1.02, 0.96, 0.98);
  head.castShadow = true;
  g.add(head);

  const mask = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.82, 24, 20), creamMat);
  mask.position.set(0, HY - 0.12, 0.12);
  mask.scale.set(0.92, 0.82, 0.85);
  g.add(mask);

  // 주둥이 (머리 비율에 맞게 조금 더 크게)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), creamMat);
  muzzle.position.set(0, HY - 0.18, HR * 0.78);
  muzzle.scale.set(1.15, 0.85, 0.95);
  muzzle.castShadow = true;
  g.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), noseMat);
  nose.position.set(0, HY - 0.13, HR * 0.78 + 0.18);
  nose.scale.set(1.2, 0.9, 0.9);
  g.add(nose);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.014, 8, 16, Math.PI), noseMat);
  smile.position.set(0, HY - 0.24, HR * 0.82 + 0.05);
  smile.rotation.z = Math.PI;
  g.add(smile);

  // ─── 빨간 목줄 (Sketchfab 레퍼런스 특징) ──────
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.05, 14, 36),
    collarMat,
  );
  collar.position.set(0, 1.02, 0.03);
  collar.rotation.x = Math.PI / 2 - 0.12;  // 앞쪽이 살짝 아래로
  collar.scale.set(1.05, 0.92, 1);
  collar.castShadow = true;
  g.add(collar);

  // 목줄 금색 태그 (앞쪽 가슴 위)
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.02, 16), tagMat);
  tag.position.set(0, 0.92, 0.31);
  tag.rotation.x = Math.PI / 2 - 0.35;
  tag.castShadow = true;
  g.add(tag);

  // ─── 귀 ──────────────────────────────────────
  [-1, 1].forEach((side) => g.add(makeShibaEar(side, HY, HR, furMat, creamMat)));

  // ─── 얼굴 텍스처 (눈·눈썹·볼) ──────────────────
  const faceTex = makeShibaFaceTexture();
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex, transparent: true, roughness: 0.7,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  // faceGeo도 HR 기준으로 커짐
  const faceGeo = new THREE.PlaneGeometry(HR * 1.52, HR * 1.52, 16, 16);
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
  face.position.set(0, HY + 0.04, 0);
  face.scale.z = 0.98;
  face.renderOrder = 2;
  g.add(face);

  // ─── 팔 (chibi: 짧고 통통하게) ────────────────
  const leftArm  = makeShibaArm(-1, furMat, creamMat);
  const rightArm = makeShibaArm( 1, furMat, creamMat);
  g.add(leftArm);
  g.add(rightArm);

  // ─── 다리 (chibi: 짧고 넓게) ──────────────────
  const leftLeg  = makeShibaLeg(-1, furMat, creamMat);
  const rightLeg = makeShibaLeg( 1, furMat, creamMat);
  g.add(leftLeg);
  g.add(rightLeg);

  // ─── 꼬리 ──────────────────────────────────────
  const tail = makeShibaTail(furMat, creamMat);
  g.add(tail);

  g.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, headY: HY, tail };
  return g;
}
