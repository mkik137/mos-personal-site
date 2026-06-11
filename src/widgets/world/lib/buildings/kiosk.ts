// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';

export function buildKiosk({ scene, pulsers, spinners }, { x, z }) {
  const g = new THREE.Group();
  const accent = COL.green;

  // 하단 박스
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 2.6),
    new THREE.MeshStandardMaterial({ color: COL.kioskWall, roughness: 0.82 }),
  );
  base.position.y = 1.0; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  // 지붕 판
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.25, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xe8d9bf, roughness: 0.8 }),
  );
  top.position.y = 2.05; top.castShadow = true;
  g.add(top);

  // 터치 스크린
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.1),
    new THREE.MeshBasicMaterial({ color: accent }),
  );
  screen.position.set(0, 1.15, 1.32);
  g.add(screen);
  screen.add(makeTextPlane('✉ WRITE', 1.8, 0.5, '#ffffff'));
  pulsers.push({ mat: screen.material, base: accent, phase: x, lo: 0.6, hi: 1.0 });

  // 캐노피 지붕
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(3.0, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: COL.kioskRoof, roughness: 0.6, flatShading: true }),
  );
  canopy.position.y = 3.5; canopy.rotation.y = Math.PI / 4; canopy.castShadow = true;
  g.add(canopy);

  // 기둥
  [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8c6a6 }),
    );
    post.position.set(px, 1.4, pz); post.castShadow = true;
    g.add(post);
  });

  // 방명록 간판
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1b1f27 }),
  );
  board.position.set(0, 2.55, 1.45);
  g.add(board);
  board.add(makeTextPlane('GUESTBOOK', 2.2, 0.5, '#ffffff', 0.06));

  // 회전 봉투 아이콘
  const env = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: accent, emissiveIntensity: 0.4 }),
  );
  env.position.set(0, 4.6, 0);
  g.add(env);
  g.userData.env = env;
  spinners.push({ mesh: env, speed: 0.8 });

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}
