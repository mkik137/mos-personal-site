// @ts-nocheck
// ─────────────────────────────────────────────
//  questChain — 4단계 순차 게이트 퀘스트 체인 오케스트레이터
//
//  단계 흐름:
//   guard    경비: 튜토리얼 + "가람에게 가서 소개(신원) 확인"
//   gallery  가람(관리자): 스튜디오 액자 4개 감상
//   fruit    과일가게 사장: 과수원에서 사과 3개 줍기 → 배달 타임어택
//   delivery 주민 3명에게 제한시간 안에 순서대로 배달 (S/A/B 등급)
//   trash    큐비: 마을 쓰레기 줍기 (quest.ts 와 연동)
//   ending   방명록 작성 → 엔딩
//
//  월드 결합(scene·pois·obstacles·주민/스토리NPC 핸들)은 initQuestChain 으로 주입.
//  매 프레임 updateQuestChain(dt) 로 배달 타이머·타깃 화살표를 갱신한다.
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { openDialogue } from './dialogue';
import { addItem, removeItem, itemCount } from './inventory';
import {
  GUARD_NAME, GUARD_LINES_FIRST, GUARD_LINES_REMIND, GUARD_LINES_CLEARED, GUARD_LINES_CASUAL,
  GUARD_LINES_FIRST_TOUCH, GUARD_LINES_REMIND_TOUCH,
  GARAM_GALLERY_GIVE,
  VENDOR_NAME, VENDOR_LINES_CASUAL, VENDOR_PICK_GIVE, VENDOR_PICK_ACCEPT, VENDOR_PICK_DECLINE, VENDOR_NEED_FRUIT,
  VENDOR_DELIVERY_GIVE, VENDOR_RETRY, VENDOR_AFTER,
  DELIVERY_THANKS, DELIVERY_THANKS_DEFAULT,
} from './dialogueLines';

// ── 튜닝 상수 ──
const APPLE = {
  id: 'apple', name: '사과', icon: '🍎',
  desc: '과수원 사과나무에서 갓 딴 빨갛고 아삭한 사과. 신선할 때가 생명이라, '
    + '과일가게 사장님의 부탁대로 주민들에게 제한시간 안에 제때 배달해야 한다. '
    + '화면 위 타이머와 머리 위 화살표를 따라가자.',
};
const FRUIT_GOAL = 3;
const FRAME_GOAL = 4;
const DELIVERY_TARGETS = ['도윤', '준호', '서연']; // 배달 순서 (주민 이름)
const TIME_LIMIT = 50;
const grade = (t) => (t >= 25 ? 'S' : t >= 12 ? 'A' : 'B');


// ── 상태 ──
let deps = null;            // { scene, pois, obstacles, onPoiRemoved, getVillagers }
// 메인 선형 흐름: guard(튜토리얼) → gallery(가람 전시회) → ending(방명록) → free(자유).
// free 단계에서 과일배달·마을청소 선택 퀘스트가 순서 상관없이 열린다.
let stage = 'guard';        // guard | gallery | ending | free
let guardCasual = 0;
let vendorCasual = 0;
// 터치 기기 여부 — 안내 문구를 키보드(WASD/I) ↔ 조이스틱·🎒 버튼으로 분기.
// (world.ts init 에서 (pointer: coarse) 감지 시 body.touch 클래스를 붙인다)
const isTouch = (): boolean => typeof document !== 'undefined' && document.body.classList.contains('touch');
// 경비 적응 훈련(튜토리얼) 퀘스트 — 안내서 읽기 + 이동·달리기·점프·시점회전·가방을 모두 해야 통과.
// (스킬 1~4·K 는 제외. 달리기(Shift)는 키보드 전용이라 터치 기기에선 요구하지 않는다.)
let tutorialGiven = false, tutorialDone = false;
let moveDone = false, invDone = false, helpReadDone = false;
let runDone = false, lookDone = false; // 점프는 현재 비활성이라 훈련 항목에서 제외
let movedDirs = new Set();   // 적응 훈련: 실제로 사용한 이동 방향(f/b/l/r) — 4방향 모두 써야 통과
let boardViewed = false;    // 갤러리: 경력 게시판을 봤는지 (액자 감상 선행 조건)
let framesViewed = new Set();
let fruitQuestGiven = false, applesPicked = 0;
// 각 퀘스트의 "완료 — 준 NPC에게 보고 대기" 상태. 보고(대화) 해야 다음으로 넘어간다.
let tutorialReady = false, galleryReady = false, deliveryReady = false, trashReady = false;
// 선택 퀘스트(자유 단계) 완료 여부 + 배달 단계 진입 플래그.
let vendorDone = false, trashDone = false, deliveryPhase = false;
let deliveryGrade = '';
let del = null;             // 배달 상태 { active, failed, paused, targets, idx, timeLeft, bob }
let pending = null;         // 패널 닫힌 뒤 이어 말할 대사 { lines, name }
let storyNpcs = { guard: null, vendor: null };
let cube = null;            // 큐비(쓰레기 퀘스트 NPC) 핸들 — 말풍선 동기화용
let aboutBubble = null;     // 가람(정적 NPC) 머리 위 안내 풍선 핸들

// 현재 차례인 NPC 에게만 "···" 말풍선을 띄운다 (순차 표시).
//  - 경비: 적응 훈련 중(stage guard & 미통과)
//  - 가람: 훈련 통과 후 소개 보러 갈 때(stage guard & 통과, 소개 보기 전)
//  큐비 완료 보고('check') 말풍선은 quest.ts 가 별도 관리.
//  완료-보고 대기 NPC 는 'check'(초록 체크 = 보고하러 와요), 진행 중은 'dots'.
function refreshBubbles() {
  // 경비: 훈련 중 'dots' / 완료 보고 대기 'check' / 통과 후 off
  storyNpcs.guard?.setBubble(
    stage === 'guard' && !tutorialDone ? (tutorialReady ? 'check' : 'dots') : false,
  );
  // 가람: 훈련 통과 후(소개 보러) 또는 갤러리 완료 보고 시 표시
  aboutBubble?.setVisible((stage === 'guard' && tutorialDone) || (stage === 'gallery' && galleryReady));
  // 선택 퀘스트는 방명록 완료(stage free) 후 개방.
  const open = stage === 'free';
  // 과일가게 사장: 진행 중 'dots' / 보고 대기 'check'(사과 다 땄거나 배달 완료) / 완료 시 off
  const vendorReport =
    (fruitQuestGiven && applesPicked >= FRUIT_GOAL && !deliveryPhase) || deliveryReady;
  storyNpcs.vendor?.setBubble(open && !vendorDone ? (vendorReport ? 'check' : 'dots') : false);
  // 큐비: 진행 중 'dots' / 다 버리고 보고 대기 'check' / 완료 시 off
  cube?.setBubble(open && !trashDone ? (trashReady ? 'check' : 'dots') : false);
}

// 단계 전환 — 항상 말풍선을 함께 갱신한다.
function goStage(s) {
  stage = s;
  refreshBubbles();
  updateQuestLog();
}

// 배달 타깃 화살표 스프라이트
let arrow = null, arrowTex = null;

export function initQuestChain(d): void {
  deps = d;
  stage = 'guard';
  guardCasual = 0; vendorCasual = 0;
  tutorialGiven = tutorialDone = moveDone = invDone = helpReadDone = false;
  runDone = lookDone = false;
  movedDirs = new Set();
  tutorialReady = galleryReady = deliveryReady = trashReady = false;
  vendorDone = trashDone = deliveryPhase = false;
  deliveryGrade = '';
  boardViewed = false;
  framesViewed = new Set();
  fruitQuestGiven = false; applesPicked = 0;
  del = null; pending = null;
  setObjective('🛡️ 분수대 앞 경비와 대화해보자');
  refreshBubbles();
  updateQuestLog();
}

// 스토리 NPC 핸들 주입 — setTalking(대화 중 바라보기) + 순차 말풍선 동기화.
export function setStoryNpcs(guard, vendor): void {
  storyNpcs = { guard, vendor };
  refreshBubbles();
}

// 큐비 핸들 주입 — 순차 말풍선 동기화 (trash 단계 전엔 큐비 말풍선 숨김).
export function setCube(c): void {
  cube = c;
  refreshBubbles();
}

// 가람(정적 NPC) 안내 풍선 핸들 주입.
export function setAboutBubble(ctrl): void {
  aboutBubble = ctrl;
  refreshBubbles();
}

// ─────────────────────────────────────────────
//  경비 (단계 1) — 적응 훈련 퀘스트 (직접 이동·가방 열기)
// ─────────────────────────────────────────────
export function talkGuard(): void {
  const g = storyNpcs.guard;
  g?.setTalking(true);
  const opts = { onEnd: () => g?.setTalking(false) };

  if (stage === 'guard' && !tutorialDone) {
    if (!tutorialGiven) {
      // 훈련 퀘스트 부여 — 말로 설명이 아니라 직접 해보게 한다.
      tutorialGiven = true;
      updateTutorialObjective();
      showQuestStart('적응 훈련 🎮', isTouch()
        ? '☰ 메뉴 → 안내서 읽기 + 이동·시점 회전·가방 (스킬 제외)'
        : '☰ 메뉴 → 안내서 읽기 + 이동·달리기·시점 회전·가방 (스킬 제외)');
      openDialogue(isTouch() ? GUARD_LINES_FIRST_TOUCH : GUARD_LINES_FIRST, GUARD_NAME, opts);
      return;
    }
    if (tutorialReady) {
      // 완료 보고 → 완료 배너 + 통과 처리 + 가람으로 (가람 머리 위 풍선 ON)
      tutorialReady = false;
      tutorialDone = true;
      refreshBubbles();
      showQuestComplete('적응 훈련');
      setObjective('🪪 광장 북쪽 가람에게 가서 소개(신원)를 확인하자');
      openDialogue(GUARD_LINES_CLEARED, GUARD_NAME, opts);
      return;
    }
    // 아직 둘 다 못 함 — 재촉
    const remind = isTouch() ? GUARD_LINES_REMIND_TOUCH : GUARD_LINES_REMIND;
    openDialogue(remind[(moveDone || invDone ? 1 : 0) % remind.length], GUARD_NAME, opts);
    return;
  }
  if (stage === 'guard' && tutorialDone) {
    // 통과 후, 아직 소개 안 봄 — 가람으로 안내 (가람 머리 위 풍선 참고)
    openDialogue(GUARD_LINES_CLEARED, GUARD_NAME, opts);
    return;
  }
  // 볼일 끝(이후 단계) — 일상 대화 (순환)
  openDialogue(GUARD_LINES_CASUAL[guardCasual++ % GUARD_LINES_CASUAL.length], GUARD_NAME, opts);
}

// 달리기(Shift)는 키보드 전용 — 터치 기기에선 훈련 항목에서 제외한다.
const needRun = (): boolean => !isTouch();

// 훈련 완료 조건 — 안내서·이동·점프·시점·가방 (+데스크톱은 달리기).
function tutorialAllDone(): boolean {
  const base = helpReadDone && moveDone && lookDone && invDone;
  return needRun() ? base && runDone : base;
}

// 훈련 진행 목표 HUD — 안내서/이동/달리기/점프/시점/가방 체크리스트.
function updateTutorialObjective() {
  const mk = (b) => (b ? '✅' : '⬜');
  const n = Math.min(movedDirs.size, 4);
  const moveLabel = isTouch() ? '조이스틱' : 'WASD';
  const items = [`📖 안내서${mk(helpReadDone)}`, `${moveLabel} 이동 ${n}/4${moveDone ? '✅' : ''}`];
  if (needRun()) items.push(`달리기${mk(runDone)}`);
  items.push(`시점${mk(lookDone)}`, `가방${mk(invDone)}`);
  setObjective('🎮 적응 훈련 — ' + items.join(' · '));
}

const tutorialActive = (): boolean => stage === 'guard' && tutorialGiven && !tutorialDone;

// 훈련 항목 완료 처리 공통 — 목표 HUD 갱신 + 통과 판정.
function markTutorial(setter: () => void): void {
  setter();
  updateTutorialObjective();
  checkTutorialComplete();
}

// 플레이어가 움직일 때 (world.ts updateMovement 에서 input 과 함께 호출).
//  이동: W/A/S/D(=f/l/b/r) 네 방향을 모두 한 번씩. 달리기: Shift + 이동.
export function onPlayerMoved(input): void {
  if (!tutorialActive()) return;
  let changed = false;
  if (!moveDone) {
    for (const d of ['f', 'b', 'l', 'r']) {
      if (input && input[d] > 0.1 && !movedDirs.has(d)) { movedDirs.add(d); changed = true; }
    }
    if (movedDirs.size >= 4) { moveDone = true; changed = true; }
  }
  const moving = input && (input.f > 0.1 || input.b > 0.1 || input.l > 0.1 || input.r > 0.1);
  if (needRun() && !runDone && input?.shift > 0.1 && moving) { runDone = true; changed = true; }
  if (changed) markTutorial(() => {});
}

// 플레이어가 가방(I)을 열었을 때 (world.ts inventory onOpen 에서 호출).
export function onInventoryOpened(): void {
  if (!tutorialActive() || invDone) return;
  markTutorial(() => { invDone = true; });
}

// 「조작 안내서」를 펼쳤을 때 (inventory.ts openHelp → world.ts onHelpOpened 에서 호출).
export function onHelpRead(): void {
  if (!tutorialActive() || helpReadDone) return;
  markTutorial(() => { helpReadDone = true; });
}

// 시점 회전(드래그)했을 때 (world.ts pointermove 드래그에서 호출).
export function onLooked(): void {
  if (!tutorialActive() || lookDone) return;
  markTutorial(() => { lookDone = true; });
}

function checkTutorialComplete() {
  if (!tutorialAllDone() || tutorialReady) return;
  // 행동 완료 — 바로 넘어가지 않고 경비에게 보고하러 가게 한다 (경비 머리 위 ✓ 풍선).
  tutorialReady = true;
  refreshBubbles();
  setObjective('🛡️ 적응 완료! 분수대 앞 경비에게 돌아가 보고하자');
}

// 가람 소개 패널을 열면 호출 — 경비 단계를 통과시키고 갤러리 단계로.
// 전환이 일어나면 true 반환 (world.ts 가 패널 닫힌 뒤 가람 갤러리 대사를 잇게).
export function onAboutSeen(): boolean {
  if (stage === 'guard') {
    framesViewed = new Set();
    boardViewed = false;
    goStage('gallery');
    setObjective('🖼️ 스튜디오 — 먼저 가운데 경력 게시판을 보자');
    pending = { lines: GARAM_GALLERY_GIVE, name: '가람', banner: ['전시회 관람 🖼️', '게시판 확인 후 액자 4점 둘러보기'] };
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
//  가람 / 전시회 (단계 2) — 경력 게시판 먼저 → 액자 4개
// ─────────────────────────────────────────────
// 경력 게시판(이젤)을 보면 호출 — 액자 감상의 선행 조건.
export function markBoardViewed(): void {
  if (stage !== 'gallery' || boardViewed) return;
  boardViewed = true;
  setObjective(`🖼️ 스튜디오 — 액자 4개를 감상하자 (0/${FRAME_GOAL})`);
}

export function markFrameViewed(idx): void {
  if (stage !== 'gallery' || galleryReady) return;
  if (!boardViewed) { setObjective('🖼️ 스튜디오 — 먼저 가운데 경력 게시판부터 보자'); return; } // 게시판 선행
  framesViewed.add(idx);
  if (framesViewed.size >= FRAME_GOAL) {
    // 바로 넘어가지 않고 가람에게 보고하러 가게 한다 (가람 머리 위 풍선 ON).
    galleryReady = true;
    refreshBubbles();
    setObjective('🖼️ 액자를 다 봤다! 가람에게 돌아가 보고하자');
  } else {
    setObjective(`🖼️ 스튜디오 — 액자 4개를 감상하자 (${framesViewed.size}/${FRAME_GOAL})`);
  }
}

// 가람에게 갤러리 완료를 보고할 차례인지 (world.ts startDialogue 가 분기).
export function galleryReadyToReport(): boolean {
  return stage === 'gallery' && galleryReady;
}
// 가람 보고 완료 → 과일가게 사장 단계로.
export function reportGallery(): void {
  if (stage !== 'gallery' || !galleryReady) return;
  galleryReady = false;
  goStage('ending'); // 전시회 다음은 바로 방명록 (메인 마무리)
  showQuestComplete('전시회 관람');
  setObjective('✍️ 방명록 파티룸에 들러 흔적을 남기자!');
}

// 패널이 닫힌 직후 이어 말할 대사를 꺼낸다 (가람 갤러리 부여/완료 대사).
export function takePending(): { lines: string[]; name: string } | null {
  const p = pending; pending = null; return p;
}

// ─────────────────────────────────────────────
//  과일가게 사장 (단계 3) — 줍기 + 배달
// ─────────────────────────────────────────────
export function talkVendor(): void {
  const v = storyNpcs.vendor;
  v?.setTalking(true);
  const opts = { onEnd: () => v?.setTalking(false) };

  // 이미 다 도와줬으면 — 감사 인사
  if (vendorDone) { openDialogue(VENDOR_AFTER, VENDOR_NAME, opts); return; }
  // 아직 개방 전(방명록 완료 전) — 퀘스트 재촉 대신 일상 대화
  if (stage !== 'free') {
    openDialogue(VENDOR_LINES_CASUAL[vendorCasual++ % VENDOR_LINES_CASUAL.length], VENDOR_NAME, opts);
    return;
  }

  // ── 수확 (수락 여부 예/아니오 선택 — 쓰레기 퀘스트와 동일 방식) ──
  if (!fruitQuestGiven) {
    openDialogue(VENDOR_PICK_GIVE, VENDOR_NAME, {
      ...opts,
      choices: [
        { label: '예, 도와줄게요!', onPick: () => {
          fruitQuestGiven = true;
          revealFruit();
          setObjective(`🍎 과수원에서 사과 ${FRUIT_GOAL}개 따오기 (0/${FRUIT_GOAL})`);
          showQuestStart('과일 수확 🍎', `과수원에서 잘 익은 사과 ${FRUIT_GOAL}개 줍기`);
          refreshBubbles();
          openDialogue(VENDOR_PICK_ACCEPT, VENDOR_NAME, opts);
        } },
        { label: '아니오, 다음에요', onPick: () => openDialogue(VENDOR_PICK_DECLINE, VENDOR_NAME, opts) },
      ],
    });
    return;
  }
  if (applesPicked < FRUIT_GOAL) { openDialogue(VENDOR_NEED_FRUIT, VENDOR_NAME, opts); return; }

  // ── 배달 ──
  if (del?.active) { openDialogue(['지금 배달 중이에요! 서두르세요!'], VENDOR_NAME, opts); return; }
  if (deliveryReady) {
    // 배달 완료 보고 → 선택 퀘스트 종료 (단계 전환 없음)
    deliveryReady = false;
    vendorDone = true;
    refreshBubbles();
    showQuestComplete('신선 배달');
    setObjectiveFree();
    openDialogue([
      `등급 ${deliveryGrade} 배달, 정말 훌륭했어요! 덕분에 오늘 장사 잘했네요.`,
      '도와줘서 정말 고마워요!',
    ], VENDOR_NAME, opts);
    return;
  }
  if (!deliveryPhase) {
    // 사과 다 따옴 → 배달 타임어택 시작 (대화 끝나면)
    v?.setTalking(false);
    showQuestComplete('과일 수확');
    openDialogue(VENDOR_DELIVERY_GIVE, VENDOR_NAME, { onEnd: startDelivery });
    return;
  }
  // 배달 실패 후 재도전
  v?.setTalking(false);
  openDialogue(VENDOR_RETRY, VENDOR_NAME, { onEnd: startDelivery });
}

// 과수원 사과 줍기 — 안내 링이 켜진(=퀘스트 수락) 뒤에만 줍는다.
export function pickFruit(poi): void {
  if (stage !== 'free' || !fruitQuestGiven) {
    openDialogue(['빨갛게 잘 익은 사과다. 과일가게 사장님이 부탁하면 따러 오자.'], '안내');
    return;
  }
  if (applesPicked >= FRUIT_GOAL) {
    openDialogue(['사과는 충분히 땄다. 과일가게 사장님께 돌아가자.'], '안내');
    return;
  }
  poi.object?.removeFromParent();
  poi.ring?.removeFromParent();
  const oi = deps.obstacles.indexOf(poi.obstacle);
  if (oi !== -1) deps.obstacles.splice(oi, 1);
  const pi = deps.pois.indexOf(poi);
  if (pi !== -1) deps.pois.splice(pi, 1);
  deps.onPoiRemoved(poi);
  applesPicked++;
  addItem(APPLE);
  if (applesPicked >= FRUIT_GOAL) {
    setObjective('🍎 사과를 다 땄다! 과일가게 사장에게 돌아가 보고하자');
    refreshBubbles(); // 과일가게 사장 머리 위 ✓ 풍선
  } else {
    setObjective(`🍎 과수원에서 사과 따오기 (${applesPicked}/${FRUIT_GOAL})`);
  }
  openDialogue([`사과를 주웠다! (${applesPicked}/${FRUIT_GOAL})`], '안내');
}

function revealFruit() {
  deps.pois.forEach((p) => { if (p.type === 'fruit' && p.ring) p.ring.visible = true; });
}

// ─────────────────────────────────────────────
//  배달 타임어택 (단계 3 후반)
// ─────────────────────────────────────────────
function startDelivery() {
  const villagers = deps.getVillagers() || [];
  const targets = DELIVERY_TARGETS
    .map((n) => villagers.find((vv) => vv.name === n))
    .filter(Boolean);
  // 재도전 등으로 사과가 부족하면 가방을 목표 수량으로 채워준다.
  for (let i = itemCount('apple'); i < FRUIT_GOAL; i++) addItem(APPLE);
  applesPicked = FRUIT_GOAL;

  deliveryPhase = true; // 배달 단계 진입 (보고 말풍선 'check' → 'dots' 로 전환)
  refreshBubbles();
  del = { active: true, failed: false, paused: false, targets, idx: 0, timeLeft: TIME_LIMIT, bob: 0 };
  ensureArrow().visible = true;
  showTimer(true);
  setTimerUI(TIME_LIMIT);
  showQuestStart('신선 배달 ⏱️', `${TIME_LIMIT}초 안에 주민 ${targets.length}명에게 배달`);
  updateDeliveryObjective();
}

function updateDeliveryObjective() {
  const t = del.targets[del.idx];
  setObjective(`🍎 신선할 때 배달! → ${t?.name ?? '주민'} (${del.idx + 1}/${del.targets.length})`);
}

// 주민과 상호작용 시 호출 — 배달 처리. 처리하면 true (일반 대화 건너뜀).
//  배달 성공 시 주민이 한마디 하고(상호작용), 그 동안 타임어택은 멈춘다.
export function tryDeliver(poi): boolean {
  if (!del || !del.active) return false;
  const t = del.targets[del.idx];
  if (poi.villager && t && poi.villager === t) {
    removeItem('apple', 1);
    del.idx++;
    const last = del.idx >= del.targets.length;
    del.paused = true; // 주민과 인사 나누는 동안 타임어택 정지
    const v = poi.villager;
    v.setTalking?.(true);
    const thanks = DELIVERY_THANKS[t.name] || DELIVERY_THANKS_DEFAULT;
    openDialogue(thanks, t.name, {
      onEnd: () => {
        v.setTalking?.(false);
        del.paused = false;
        if (last) finishDelivery();
        else updateDeliveryObjective(); // 다음 타깃으로 목표·화살표 이동
      },
    });
    return true;
  }
  openDialogue([`지금은 ${t?.name ?? '주민'}에게 배달할 차례예요!`], '안내');
  return true;
}

function finishDelivery() {
  del.active = false;
  showTimer(false);
  if (arrow) arrow.visible = false;
  const g = grade(del.timeLeft);
  deliveryGrade = g;
  showResult(g);
  // 바로 넘어가지 않고 과일가게 사장에게 보고하러 가게 한다 (사장 머리 위 ✓ 풍선).
  deliveryReady = true;
  refreshBubbles();
  setObjective('🍎 배달 완료! 과일가게 사장에게 돌아가 보고하자');
  openDialogue([`사과 배달 완료! 등급 ${g} 🎉`, '과일가게 사장님께 돌아가 알려주자.'], '안내');
}

function failDelivery() {
  del.active = false; del.failed = true;
  showTimer(false);
  if (arrow) arrow.visible = false;
  setObjective('⏳ 시간 초과! 과일가게 사장에게 다시 말 걸어 재도전');
  openDialogue(['앗, 시간 초과! 사과가 시들어버렸어요…', '과일가게 사장님께 다시 말을 걸어 재도전해요.'], '안내');
}

// ─────────────────────────────────────────────
//  큐비 (단계 4) / 엔딩 — quest.ts·guestbook 과 연동
// ─────────────────────────────────────────────
export function trashUnlocked(): boolean {
  return stage === 'free'; // 방명록 완료 후 선택 퀘스트로 개방
}
// 큐비 퀘스트 수락 시 — 목표 갱신 (quest.ts 가 호출).
export function onTrashAccepted(): void {
  if (stage === 'free') setObjective('🧹 길목의 쓰레기를 주워 광장 쓰레기통에 버리자');
}
// 쓰레기를 전부 버렸을 때 — 큐비에게 보고하러 가게 한다 (큐비 머리 위 ✓ 풍선). quest.ts 가 호출.
export function onTrashReady(): void {
  if (stage !== 'free') return;
  trashReady = true;
  refreshBubbles();
  setObjective('🧹 쓰레기를 다 치웠다! 광장의 큐비에게 돌아가 보고하자');
}
// 큐비에게 완료 보고 후 — 선택 퀘스트 종료 (단계 전환 없음). quest.ts 가 보고 대화 끝에 호출.
export function onTrashDone(): void {
  if (stage !== 'free') return;
  trashReady = false;
  trashDone = true;
  refreshBubbles(); // 큐비 풍선 OFF
  setObjectiveFree();
}
export function onGuestbookSubmit(): void {
  if (stage === 'ending') {
    goStage('free'); // 메인 완료 → 선택 퀘스트(과일배달·마을청소) 개방
    showEnding();    // "스토리 클리어 — 이제 자유롭게" 연출
    setObjectiveFree();
  }
}

// ─────────────────────────────────────────────
//  매 프레임 — 배달 타이머·화살표
// ─────────────────────────────────────────────
export function updateQuestChain(dt): void {
  if (!del || !del.active || del.paused) return; // 주민 인사 중엔 타이머·화살표 정지
  const t = del.targets[del.idx];
  if (t?.root && arrow) {
    del.bob += dt;
    arrow.position.set(t.root.position.x, 2.7 + Math.sin(del.bob * 3) * 0.12, t.root.position.z);
  }
  del.timeLeft -= dt;
  setTimerUI(del.timeLeft);
  if (del.timeLeft <= 0) failDelivery();
}

// ─────────────────────────────────────────────
//  DOM / 시각 헬퍼
// ─────────────────────────────────────────────
function setObjective(text) {
  const el = document.getElementById('quest-log');
  if (!el) return;
  if (!text) { el.classList.remove('show'); return; }
  const t = el.querySelector('.qo-text');
  if (t) t.textContent = text;
  el.classList.add('show');
}

// 퀘스트 목록의 완료/진행/잠김 상태 갱신.
//  메인(guard→gallery→ending=방명록)은 선형, 선택(fruit·trash)은 free 단계에서 동시 개방.
function updateQuestLog() {
  const set = (key, state) => {
    const li = document.querySelector(`#quest-log .ql-item[data-q="${key}"]`);
    if (!li) return;
    li.classList.toggle('done', state === 'done');
    li.classList.toggle('active', state === 'active');
    li.classList.toggle('locked', state === 'locked');
  };
  set('guard', tutorialDone ? 'done' : 'active');
  set('gallery', stage === 'guard' ? 'locked' : (stage === 'gallery' ? 'active' : 'done'));
  set('ending', (stage === 'guard' || stage === 'gallery') ? 'locked' : (stage === 'ending' ? 'active' : 'done'));
  const open = stage === 'free'; // 방명록 완료 후 선택 퀘스트 개방
  set('fruit', !open ? 'locked' : (vendorDone ? 'done' : 'active'));
  set('trash', !open ? 'locked' : (trashDone ? 'done' : 'active'));
}

// 자유 단계 목표 — 남은 선택 퀘스트를 안내한다.
function setObjectiveFree() {
  const parts = [];
  if (!vendorDone) parts.push('과일가게 사장');
  if (!trashDone) parts.push('큐비');
  if (parts.length === 0) setObjective('🎉 모든 퀘스트 완료! 가람의 섬을 자유롭게 즐겨요');
  else setObjective(`🎮 자유 탐험 — ${parts.join('·')}를 도와줄 수 있어요`);
}

function showTimer(on) {
  document.getElementById('delivery-timer')?.classList.toggle('show', on);
}
function setTimerUI(timeLeft) {
  const el = document.getElementById('delivery-timer');
  if (!el) return;
  const sec = Math.max(0, Math.ceil(timeLeft));
  const tEl = el.querySelector('.dt-time');
  if (tEl) tEl.textContent = `${sec}`;
  const fill = el.querySelector('.dt-fill');
  if (fill) fill.style.width = `${Math.max(0, Math.min(1, timeLeft / TIME_LIMIT)) * 100}%`;
  el.classList.toggle('danger', timeLeft <= 10);
}

// 퀘스트를 NPC에게 보고(완료)할 때 띄우는 완료 배너. quest.ts 도 호출.
export function showQuestComplete(name): void {
  const el = document.getElementById('quest-banner');
  if (!el) return;
  const sub = el.querySelector('.qb-sub');
  if (sub) sub.textContent = name;
  el.classList.remove('show');
  void el.offsetWidth; // 리플로우로 애니메이션 재생
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 3400);
}

// 퀘스트를 받을 때 띄우는 시작 배너 (완료 배너와 짝). quest.ts 도 호출.
export function showQuestStart(title, sub): void {
  const el = document.getElementById('quest-start');
  if (!el) return;
  const t = el.querySelector('.qs-title');
  const s = el.querySelector('.qs-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  el.classList.remove('show');
  void el.offsetWidth; // 리플로우로 애니메이션 재생
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 3000);
}

function showResult(g) {
  const el = document.getElementById('delivery-result');
  if (!el) return;
  const gEl = el.querySelector('.dr-grade');
  if (gEl) gEl.textContent = g;
  el.dataset.grade = g;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 3600);
}

function showEnding() {
  const el = document.getElementById('ending-banner');
  if (!el) return;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 7000);
}

function ensureArrow() {
  if (arrow) return arrow;
  if (!arrowTex) arrowTex = makeArrowTexture();
  arrow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: arrowTex, transparent: true, depthWrite: false, depthTest: false,
  }));
  arrow.scale.set(0.8, 0.8, 1);
  arrow.renderOrder = 999; // 벽·NPC 위로 항상 보이게
  arrow.visible = false;
  deps.scene.add(arrow);
  return arrow;
}

// 아래를 가리키는 둥근 화살표(핀) 텍스처
function makeArrowTexture() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 96;
  const c = cv.getContext('2d');
  c.translate(48, 50);
  c.fillStyle = '#ff4d4d';
  c.strokeStyle = '#ffffff';
  c.lineWidth = 6;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-22, -28);
  c.lineTo(22, -28);
  c.lineTo(22, 6);
  c.lineTo(10, 6);
  c.lineTo(0, 30);
  c.lineTo(-10, 6);
  c.lineTo(-22, 6);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  c.font = '700 26px Poppins, Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('!', 0, -10);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
