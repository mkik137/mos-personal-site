// @ts-nocheck
// ─────────────────────────────────────────────
//  quest — 큐비의 쓰레기 줍기 퀘스트 (수락/줍기/배출/완료 배너)
//  월드 공유물(pois·obstacles·큐비 핸들·activePoi 정리)은 initQuest 로 주입받는다.
// ─────────────────────────────────────────────
import { openDialogue } from './dialogue';
import { addItem, removeItem } from './inventory';
import { trashUnlocked, onTrashReady, onTrashDone, onTrashAccepted, showQuestStart, showQuestComplete } from './questChain';
import {
  HELPER_NAME,
  HELPER_LINES_FIRST, HELPER_LINES_ACCEPT, HELPER_LINES_DECLINE,
  HELPER_LINES_REMIND, HELPER_LINES_CARRY, HELPER_LINES_DONE, HELPER_LINES_AFTER,
  HELPER_LINES_CASUAL,
} from './dialogueLines';

// 쓰레기 봉투 아이콘 — 묶은 검은 비닐봉지(인라인 SVG, 1em 크기로 폰트 크기를 따라감).
// 인벤토리 슬롯·상세 헤더가 icon 을 innerHTML 로 렌더하므로 SVG 문자열을 그대로 쓴다.
const TRASH_ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" style="display:block" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + '<path d="M8.6 5.6 6 2.4 11.2 4.3Z" fill="#26262b"/>'
  + '<path d="M15.4 5.6 18 2.4 12.8 4.3Z" fill="#26262b"/>'
  + '<rect x="9.5" y="3.5" width="5" height="3.3" rx="1.5" fill="#19191d"/>'
  + '<path d="M6.1 8.5C6.1 7 7.2 6.4 8.5 6.4H15.5C16.8 6.4 17.9 7 17.9 8.5L18.8 18.7C19 21.2 16 22.4 12 22.4 8 22.4 5 21.2 5.2 18.7Z" fill="#1f1f24"/>'
  + '<path d="M8.9 9.3C8.2 12.6 8.7 16.2 9.5 19.3" stroke="#4c4c54" stroke-width="1.1" stroke-linecap="round"/>'
  + '<path d="M14.3 9C14.9 12 14.7 15.6 14.1 18.9" stroke="#000" stroke-opacity="0.4" stroke-width="1" stroke-linecap="round"/>'
  + '</svg>';

// { pois, obstacles, getWanderer, onPoiRemoved(poi) }
let deps = null;

let helperVisits = 0;      // 수락 후 리마인드 대사 순환용
let helperThanked = false; // 완료 인사를 이미 받았는지
let questAccepted = false; // 퀘스트 수락 여부 (예/아니오 선택)
let carrying = 0;          // 들고 있는 쓰레기 수 (최대 1)
let questDone = false;     // 모든 쓰레기를 쓰레기통에 버렸는지
let cubeCasual = 0;        // 아직 차례 아닐 때 일상 대사 순환용

export function initQuest(d): void {
  deps = d;
}

// 큐비 — 퀘스트 진행 상태에 따라 대사 분기. 대화 중엔 배회를 멈추고 플레이어를 바라봄.
export function startHelperDialogue(): void {
  const wanderer = deps.getWanderer();
  wanderer?.setTalking(true);
  const opts = { onEnd: () => wanderer?.setTalking(false) };

  // 퀘스트 체인상 아직 큐비 차례가 아니면(배달까지 끝나기 전) 일상 대화만 한다.
  if (!trashUnlocked() && !questAccepted) {
    openDialogue(HELPER_LINES_CASUAL[cubeCasual++ % HELPER_LINES_CASUAL.length], HELPER_NAME, opts);
    return;
  }

  if (questDone) {
    if (!helperThanked) {
      // 첫 보고 — 감사 대화가 끝나면 엔딩 단계로 전환 + 퀘스트 완료 배너 연출
      helperThanked = true;
      openDialogue(HELPER_LINES_DONE, HELPER_NAME, {
        onEnd: () => { wanderer?.setTalking(false); onTrashDone(); showQuestComplete('광장 대청소'); },
      });
    } else {
      openDialogue(HELPER_LINES_AFTER, HELPER_NAME, opts);
    }
    return;
  }
  if (!questAccepted) {
    // 부탁 대사가 끝나면 예/아니오 선택지 — 수락해야 쓰레기를 주울 수 있다.
    openDialogue(HELPER_LINES_FIRST, HELPER_NAME, {
      ...opts,
      choices: [
        { label: '예, 도와줄게요!', onPick: () => {
          questAccepted = true;
          // 수락 시에만 쓰레기 봉투를 드러낸다 — 길목의 봉투·안내 링·POI 모두 노출.
          deps.pois.forEach((p) => {
            if (p.type !== 'box') return;
            p.hidden = false;
            if (p.object) p.object.visible = true;
            if (p.ring) p.ring.visible = true;
          });
          showQuestStart('광장 대청소 🧹', '길목에 흩어진 쓰레기를 모두 주워 쓰레기통에');
          onTrashAccepted(); // 목표 갱신
          openDialogue(HELPER_LINES_ACCEPT, HELPER_NAME, opts);
        } },
        { label: '아니오, 다음에요', onPick: () => openDialogue(HELPER_LINES_DECLINE, HELPER_NAME, opts) },
      ],
    });
    return;
  }
  const lines = carrying > 0
    ? HELPER_LINES_CARRY
    : HELPER_LINES_REMIND[helperVisits % HELPER_LINES_REMIND.length];
  helperVisits++;
  openDialogue(lines, HELPER_NAME, opts);
}

// 쓰레기 줍기 — 씬·충돌·POI 에서 제거하고 소지. (수락 전·이미 소지 중엔 못 줍는다)
export function pickupBox(poi): void {
  if (!questAccepted) {
    openDialogue(['쓰레기 봉투 더미다. 광장의 큐비가 쓰레기 때문에 곤란해 보였는데…'], '안내');
    return;
  }
  if (carrying >= 1) {
    openDialogue(['이미 쓰레기를 들고 있다. 먼저 광장의 쓰레기통에 버리고 오자.'], '안내');
    return;
  }
  poi.object?.removeFromParent();
  poi.ring?.removeFromParent();
  const oi = deps.obstacles.indexOf(poi.obstacle);
  if (oi !== -1) deps.obstacles.splice(oi, 1);
  const pi = deps.pois.indexOf(poi);
  if (pi !== -1) deps.pois.splice(pi, 1);
  deps.onPoiRemoved(poi);
  carrying++;
  // 가방에도 담는다 — I 키로 확인 가능.
  addItem({ id: 'trash', name: '쓰레기 봉투', icon: TRASH_ICON,
    desc: '마을 길목에 굴러다니던 쓰레기 봉투. 큐비의 부탁으로 주워 든 것. '
      + '한 번에 하나만 들 수 있으니, 광장 한가운데 쓰레기통에 버리고 다음 봉투를 주우러 가자. '
      + '모두 치우면 섬이 한결 깨끗해진다.' });
  openDialogue(['쓰레기 봉투를 주웠다!'], '안내');
}

// 쓰레기통 — 들고 있으면 버리기, 아니면 "..."
export function useDumpster(): void {
  if (carrying > 0) {
    const n = carrying;
    carrying = 0;
    removeItem('trash', n); // 버린 만큼 가방에서도 제거
    const lines = [n > 1 ? `쓰레기를 버렸습니다. (${n}개)` : '쓰레기를 버렸습니다.'];
    if (!deps.pois.some((p) => p.type === 'box')) {
      questDone = true;
      onTrashReady(); // 체인 → 큐비 머리 위 ✓ 풍선 + "큐비에게 보고하자" (엔딩 전환은 보고 후)
      lines.push('쓰레기를 전부 치웠다! 큐비에게 가서 알려주자.');
    }
    openDialogue(lines, '안내');
  } else {
    openDialogue(['...'], '안내');
  }
}

