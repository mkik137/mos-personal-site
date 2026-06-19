// @ts-nocheck
import * as THREE from 'three';
import { loadGlbCharacter } from '@/entities/character';

export { createFireballs } from './fireball';

export async function buildPlayer({ scene }) {
  const player = new THREE.Object3D();
  // 광장 중앙에 분수대(폭 8)가 있어서 남동 대각(벤치 동서남북 사이 빈 방향)으로 스폰.
  player.position.set(4.6, 0, 4.6);
  scene.add(player);

  const playerModel = await loadGlbCharacter();
  // 실시간 그림자 대신 아래 blob 그림자만 사용한다. 플레이어는 유일한 "움직이는"
  // 그림자 캐스터라, 이걸 끄면 씬의 모든 그림자 캐스터가 정적이 되어
  // 그림자맵을 1회만 베이크하고 고정(world.ts shadowMap.autoUpdate=false)할 수 있다.
  playerModel.traverse((o) => { if (o.isMesh) o.castShadow = false; });
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
