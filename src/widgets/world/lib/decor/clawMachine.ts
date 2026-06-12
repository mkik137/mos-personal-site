// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';

export function addClawMachine({ scene, obstacles, pulsers, floaters }, x, z, rot, accent) {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 });

  // 하단 캐비닛
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.7), baseMat);
  base.position.y = 0.75; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  // 유리 케이스
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1 });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 1.6), glassMat);
  glass.position.y = 2.4;
  g.add(glass);
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.7, 1.6)),
    new THREE.LineBasicMaterial({ color: accent }),
  );
  frame.position.y = 2.4;
  g.add(frame);

  // 인형 상품들
  const pcol = [COL.accent, COL.cyan, COL.amber, COL.hotpink, COL.green, COL.magenta];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 + Math.random() * 0.08, 12, 12),
      new THREE.MeshStandardMaterial({ color: pcol[i % pcol.length], roughness: 0.6 }),
    );
    p.position.set((Math.random() - 0.5) * 1.1, 1.85 + Math.random() * 0.2, (Math.random() - 0.5) * 1.1);
    p.castShadow = true;
    g.add(p);
  }

  // 집게발 (claw)
  const claw = new THREE.Group();
  const clawTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x888, metalness: 0.8, roughness: 0.3 }),
  );
  claw.add(clawTop);
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2;
    const prong = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.35, 6),
      new THREE.MeshStandardMaterial({ color: 0xaaa, metalness: 0.8, roughness: 0.3 }),
    );
    prong.position.set(Math.cos(a) * 0.14, -0.28, Math.sin(a) * 0.14);
    prong.rotation.z = Math.cos(a) * 0.5;
    prong.rotation.x = -Math.sin(a) * 0.5;
    claw.add(prong);
  });
  claw.position.set(0, 2.9, 0);
  g.add(claw);
  floaters.push({ mesh: claw, baseY: 2.9, amp: 0.18, phase: x, speed: 1.4 });

  // 상단 간판
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 0.2), baseMat);
  sign.position.set(0, 3.5, 0.78);
  g.add(sign);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.38),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  signFace.position.set(0, 3.5, 0.89);
  g.add(signFace);
  signFace.add(makeTextPlane('CATCH!', 1.5, 0.32, '#ff4d8d'));
  pulsers.push({ mat: signFace.material, base: 0xffffff, phase: x, lo: 0.7, hi: 1.0 });

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  obstacles.push({ x, z, r: 1.2 });
}
