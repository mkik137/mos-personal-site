// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';
import { makeScreenTexture } from '../helpers/makeScreenTexture';

// 캐비닛 9개가 공유하는 지오메트리·재질 — 모듈 로드 시 1회만 생성한다.
// (색이 캐비닛마다 다른 bodyMat·screen·marqueeSign 만 인스턴스별로 만든다.)
const GEO = {
  body:        new THREE.BoxGeometry(1.35, 2.7, 1.05),
  bezel:       new THREE.BoxGeometry(1.15, 1.05, 0.14),
  screen:      new THREE.PlaneGeometry(0.92, 0.82),
  marquee:     new THREE.BoxGeometry(1.4, 0.5, 1.1),
  marqueeSign: new THREE.PlaneGeometry(1.3, 0.42),
  panel:       new THREE.BoxGeometry(1.3, 0.16, 0.66),
  stick:       new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8),
  ball:        new THREE.SphereGeometry(0.09, 12, 12),
  btn:         new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12),
  coin:        new THREE.BoxGeometry(0.5, 0.3, 0.06),
};
const darkMat  = new THREE.MeshStandardMaterial({ color: 0x1c1b28, roughness: 0.7 });
const stickMat = new THREE.MeshStandardMaterial({ color: 0x222 });
const ballMat  = new THREE.MeshStandardMaterial({ color: COL.accent, roughness: 0.4 });
const coinMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a38, metalness: 0.6, roughness: 0.4 });
const BTN_POS  = [0.05, 0.25, 0.45];
const BTN_COLS = [COL.amber, COL.cyan, COL.hotpink];
const btnMats  = BTN_COLS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.25 }));

export function addArcadeCabinet({ scene, obstacles, pulsers }, x, z, rot, bodyColor, screenColor, sprite, seed) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.1 });

  // 본체
  const body = new THREE.Mesh(GEO.body, bodyMat);
  body.position.y = 1.35; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // 스크린 베젤
  const bezel = new THREE.Mesh(GEO.bezel, darkMat);
  bezel.position.set(0, 2.0, 0.5);
  g.add(bezel);

  // 발광 스크린 (캔버스 텍스처가 캐비닛마다 달라 인스턴스별)
  const screen = new THREE.Mesh(
    GEO.screen,
    new THREE.MeshBasicMaterial({ map: makeScreenTexture(sprite, screenColor) }),
  );
  screen.position.set(0, 2.0, 0.58);
  g.add(screen);
  pulsers.push({ mat: screen.material, base: 0xffffff, phase: seed, lo: 0.78, hi: 1.0 });

  // 마퀴 헤더
  const marquee = new THREE.Mesh(GEO.marquee, bodyMat);
  marquee.position.set(0, 2.85, 0.02); marquee.castShadow = true;
  g.add(marquee);
  const marqueeSign = new THREE.Mesh(
    GEO.marqueeSign,
    new THREE.MeshBasicMaterial({ color: screenColor }),
  );
  marqueeSign.position.set(0, 2.85, 0.56);
  g.add(marqueeSign);
  marqueeSign.add(makeTextPlane('PLAY', 1.2, 0.34, '#0a0820'));
  pulsers.push({ mat: marqueeSign.material, base: screenColor, phase: seed * 1.3, lo: 0.6, hi: 1.0 });

  // 조이패드 패널
  const panel = new THREE.Mesh(GEO.panel, darkMat);
  panel.position.set(0, 1.28, 0.66); panel.rotation.x = -0.5;
  g.add(panel);

  // 조이스틱
  const stick = new THREE.Mesh(GEO.stick, stickMat);
  stick.position.set(-0.34, 1.42, 0.66); stick.rotation.x = -0.5;
  g.add(stick);
  const ball = new THREE.Mesh(GEO.ball, ballMat);
  ball.position.set(-0.34, 1.55, 0.62);
  g.add(ball);

  // 버튼
  BTN_POS.forEach((bx, k) => {
    const btn = new THREE.Mesh(GEO.btn, btnMats[k]);
    btn.position.set(bx, 1.45, 0.66); btn.rotation.x = Math.PI / 2 - 0.5;
    g.add(btn);
  });

  // 코인 도어
  const coin = new THREE.Mesh(GEO.coin, coinMat);
  coin.position.set(0, 0.7, 0.55);
  g.add(coin);

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  obstacles.push({ x, z, r: 0.95 });
}
