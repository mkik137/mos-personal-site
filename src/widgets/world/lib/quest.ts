// @ts-nocheck
// ─────────────────────────────────────────────
//  quest — 큐비의 쓰레기 줍기 퀘스트 (수락/줍기/배출/완료 배너)
//  월드 공유물(pois·obstacles·큐비 핸들·activePoi 정리)은 initQuest 로 주입받는다.
// ─────────────────────────────────────────────
import { openDialogue } from './dialogue';
import {
  HELPER_NAME,
  HELPER_LINES_FIRST, HELPER_LINES_ACCEPT, HELPER_LINES_DECLINE,
  HELPER_LINES_REMIND, HELPER_LINES_CARRY, HELPER_LINES_DONE, HELPER_LINES_AFTER,
} from './dialogueLines';

// { pois, obstacles, getWanderer, onPoiRemoved(poi) }
let deps = null;

let helperVisits = 0;      // 수락 후 리마인드 대사 순환용
let helperThanked = false; // 완료 인사를 이미 받았는지
let questAccepted = false; // 퀘스트 수락 여부 (예/아니오 선택)
let carrying = 0;          // 들고 있는 쓰레기 수 (최대 1)
let questDone = false;     // 모든 쓰레기를 쓰레기통에 버렸는지

export function initQuest(d): void {
  deps = d;
}

// 큐비 — 퀘스트 진행 상태에 따라 대사 분기. 대화 중엔 배회를 멈추고 플레이어를 바라봄.
export function startHelperDialogue(): void {
  const wanderer = deps.getWanderer();
  wanderer?.setTalking(true);
  const opts = { onEnd: () => wanderer?.setTalking(false) };

  if (questDone) {
    if (!helperThanked) {
      // 첫 보고 — 말풍선 제거 + 감사 대화가 끝나면 퀘스트 완료 배너 연출
      helperThanked = true;
      wanderer?.setBubble(false);
      openDialogue(HELPER_LINES_DONE, HELPER_NAME, {
        onEnd: () => { wanderer?.setTalking(false); showQuestBanner(); },
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
          // 남은 쓰레기 위치에 안내 링 표시 (게임기 네온 링 스타일)
          deps.pois.forEach((p) => { if (p.type === 'box' && p.ring) p.ring.visible = true; });
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
  openDialogue(['쓰레기 봉투를 주웠다!'], '안내');
}

// 쓰레기통 — 들고 있으면 버리기, 아니면 "..."
export function useDumpster(): void {
  if (carrying > 0) {
    const n = carrying;
    carrying = 0;
    const lines = [n > 1 ? `쓰레기를 버렸습니다. (${n}개)` : '쓰레기를 버렸습니다.'];
    if (!deps.pois.some((p) => p.type === 'box')) {
      questDone = true;
      deps.getWanderer()?.setBubble('check'); // 완료 — 큐비 머리 위 체크 말풍선 (보고하러 와요)
      lines.push('쓰레기를 전부 치웠다! 큐비에게 알려주자.');
    }
    openDialogue(lines, '안내');
  } else {
    openDialogue(['...'], '안내');
  }
}

// 퀘스트 완료 배너 — 게임풍 중앙 연출 (CSS 애니메이션 3.4s 후 자동 사라짐)
function showQuestBanner() {
  const el = document.getElementById('quest-banner');
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth; // 재생을 위한 리플로우
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 3600);
}
