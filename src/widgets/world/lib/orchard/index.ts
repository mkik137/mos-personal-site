// @ts-nocheck
// ─────────────────────────────────────────────
//  orchard — 과수원 (과일가게 사장 배달 퀘스트용)
//  광장 서쪽(-16,21)에 사과나무 군락 + 줍기용 사과 3개.
//  사과 POI(type:'fruit')는 questChain.pickFruit 가 줍는다. 안내 링은
//  과일 줍기 퀘스트를 수락(과일가게 사장과 대화)하기 전엔 꺼져 있다.
//  배치 충돌 회피: layout.reservedZones 에 과수원 구역을 등록해 나무 스캐터가 비켜간다.
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { loadGlbProp } from '../helpers/loadGlbProp';

const TREE_SPOTS  = [[-19, 19], [-13, 18], [-18, 24], [-12, 23]];
const APPLE_SPOTS = [[-16, 20.5], [-14.5, 23], [-18, 21.5]];

export async function buildOrchard(ctx): Promise<void> {
  const { scene, obstacles, pois, pulsers } = ctx;

  // ── 사과나무 군락 ──
  for (const [x, z] of TREE_SPOTS) {
    const tree = await loadGlbProp('/glb/nature/Tree.glb', 3.4, true); // 폭 기준 정규화
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    obstacles.push({ x, z, r: 1.4 });
  }

  // ── 줍기용 사과 — 바닥에 떨어진 빨간 사과 3개 ──
  APPLE_SPOTS.forEach(([x, z], i) => {
    loadGlbProp('/glb/nature/Apple.glb', 0.5).then((apple) => { // Kenney CC0
      apple.position.set(x, 0.05, z);
      apple.rotation.y = Math.random() * Math.PI * 2;
      scene.add(apple);
      const ob = { x, z, r: 0.5 };
      obstacles.push(ob);
      // 안내 링 — 트래시 퀘스트와 같은 펄스 스타일. 수락 전엔 숨김(questChain 이 켬).
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.045, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.05, z);
      ring.visible = false;
      scene.add(ring);
      pulsers.push({ mat: ring.material, base: 0xff4d4d, phase: i * 0.7 });
      pois.push({
        id: `fruit-${i}`, type: 'fruit',
        x, z, r: 2.2,
        object: apple, obstacle: ob, ring,
        prompt: '사과 줍기',
      });
    }).catch((e) => console.warn('[orchard] apple load failed:', e));
  });
}
