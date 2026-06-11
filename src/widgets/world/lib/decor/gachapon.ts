// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';

export function addGachapon({ scene, obstacles, spinners }, x, z, accent) {
  const g = new THREE.Group();

  // 스탠드
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }),
  );
  stand.position.y = 0.7; stand.castShadow = true;
  g.add(stand);

  // 배출구 트레이
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2a38 }),
  );
  tray.position.set(0, 1.0, 0.5);
  g.add(tray);

  // 투명 글로브
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.25, roughness: 0.1 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 20), globeMat);
  globe.position.y = 1.95;
  g.add(globe);

  // 내부 캡슐들 (회전)
  const caps = new THREE.Group();
  const ccol = [COL.accent, COL.cyan, COL.amber, COL.hotpink, COL.green, COL.magenta];
  for (let i = 0; i < 10; i++) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshStandardMaterial({ color: ccol[i % ccol.length], roughness: 0.5 }),
    );
    cap.position.set(
      (Math.random() - 0.5) * 0.7,
      1.7 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.7,
    );
    caps.add(cap);
  }
  g.add(caps);
  spinners.push({ mesh: caps, speed: 0.4 });

  // 손잡이 놉
  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x222 }),
  );
  knob.position.set(0, 1.25, 0.6); knob.rotation.x = Math.PI / 2;
  g.add(knob);

  g.position.set(x, 0, z);
  scene.add(g);
  obstacles.push({ x, z, r: 0.7 });
}
