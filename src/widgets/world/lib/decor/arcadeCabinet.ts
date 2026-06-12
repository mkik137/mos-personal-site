// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';
import { makeScreenTexture } from '../helpers/makeScreenTexture';

export function addArcadeCabinet({ scene, obstacles, pulsers }, x, z, rot, bodyColor, screenColor, sprite, seed) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1b28, roughness: 0.7 });

  // 본체
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.7, 1.05), bodyMat);
  body.position.y = 1.35; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // 스크린 베젤
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.14), darkMat);
  bezel.position.set(0, 2.0, 0.5);
  g.add(bezel);

  // 발광 스크린
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.82),
    new THREE.MeshBasicMaterial({ map: makeScreenTexture(sprite, screenColor) }),
  );
  screen.position.set(0, 2.0, 0.58);
  g.add(screen);
  pulsers.push({ mat: screen.material, base: 0xffffff, phase: seed, lo: 0.78, hi: 1.0 });

  // 마퀴 헤더
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.1), bodyMat);
  marquee.position.set(0, 2.85, 0.02); marquee.castShadow = true;
  g.add(marquee);
  const marqueeSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.42),
    new THREE.MeshBasicMaterial({ color: screenColor }),
  );
  marqueeSign.position.set(0, 2.85, 0.56);
  g.add(marqueeSign);
  marqueeSign.add(makeTextPlane('PLAY', 1.2, 0.34, '#0a0820'));
  pulsers.push({ mat: marqueeSign.material, base: screenColor, phase: seed * 1.3, lo: 0.6, hi: 1.0 });

  // 조이패드 패널
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.66), darkMat);
  panel.position.set(0, 1.28, 0.66); panel.rotation.x = -0.5;
  g.add(panel);

  // 조이스틱
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: 0x222 }),
  );
  stick.position.set(-0.34, 1.42, 0.66); stick.rotation.x = -0.5;
  g.add(stick);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshStandardMaterial({ color: COL.accent, roughness: 0.4 }),
  );
  ball.position.set(-0.34, 1.55, 0.62);
  g.add(ball);

  // 버튼
  const btnCols = [COL.amber, COL.cyan, COL.hotpink];
  [0.05, 0.25, 0.45].forEach((bx, k) => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: btnCols[k], roughness: 0.4, emissive: btnCols[k], emissiveIntensity: 0.25 }),
    );
    btn.position.set(bx, 1.45, 0.66); btn.rotation.x = Math.PI / 2 - 0.5;
    g.add(btn);
  });

  // 코인 도어
  const coin = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2a2a38, metalness: 0.6, roughness: 0.4 }),
  );
  coin.position.set(0, 0.7, 0.55);
  g.add(coin);

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  obstacles.push({ x, z, r: 0.95 });
}
