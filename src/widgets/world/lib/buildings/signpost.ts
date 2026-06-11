// @ts-nocheck
import * as THREE from 'three';
import { COL } from '../constants';
import { makeTextPlane } from '../helpers/makeTextPlane';

export function addSignpost({ scene }, x, z, ch) {
  const g = new THREE.Group();

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
    new THREE.MeshStandardMaterial({ color: COL.trunk, roughness: 0.9 }),
  );
  post.position.y = 0.9; post.castShadow = true;
  g.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.65, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  );
  board.position.y = 1.75; board.castShadow = true;
  g.add(board);
  board.add(makeTextPlane(ch, 0.55, 0.45, '#ff5b35'));

  g.position.set(x, 0, z);
  scene.add(g);
}
