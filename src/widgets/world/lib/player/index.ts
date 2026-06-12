// @ts-nocheck
import * as THREE from 'three';
import { loadGlbCharacter } from '@/entities/character';

export async function buildPlayer({ scene }) {
  const player = new THREE.Object3D();
  // 광장 중앙에 분수대(폭 8)가 있어서 남동 대각(벤치 동서남북 사이 빈 방향)으로 스폰.
  player.position.set(4.6, 0, 4.6);
  scene.add(player);

  const playerModel = await loadGlbCharacter();
  player.add(playerModel);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0x2a3530, transparent: true, opacity: 0.2 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  player.add(blob);
  player.userData.blob = blob;

  return { player, playerModel };
}
