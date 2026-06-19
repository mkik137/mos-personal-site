// @ts-nocheck
// ─────────────────────────────────────────────
//  world.ts — 오케스트레이터 (루프 · 이벤트 · 이동)
//  씬 빌더는 각 서브모듈에 위임
// ─────────────────────────────────────────────
import * as THREE from 'three';
import { animateLimbs } from '@/entities/character';
import { WALK_R } from './constants';
import { buildIsland }  from './island';
import { buildDecor }   from './decor';
import { buildPlayer, createFireballs }  from './player';
import { buildPOIs }    from './poi';
import { buildClouds }  from './clouds';
import { buildNature }  from './nature';
import { buildWanderer, buildVillagers, buildStoryNpcs } from './wanderer';
import { buildOrchard } from './orchard';
import { buildRoom, ROOM } from './room';
import { buildGallery, GALLERY } from './gallery';
import { buildParty, PARTY } from './party';
import { buildIsland2, ISLAND2_CENTER, ISLAND2_R, ISLAND2_WALK, ISLAND2_SPAWN } from './island2';
import { buildPlaza } from './plaza';
import { NPC_LINES_FIRST, NPC_LINES_AGAIN, GARAM_GALLERY_DONE } from './dialogueLines';
import {
  initDialogue, openDialogue, advanceDialogue, endDialogue,
  moveChoice, pickChoice, pickSelected, dialogueActive, dialogueChoosing,
} from './dialogue';
import { initQuest, startHelperDialogue, pickupBox, useDumpster } from './quest';
import { initInventory, toggleInventory, closeInventory, inventoryOpen, mapOpen, closeMap, openHelp, helpOpen, closeHelp, updateMinimap } from './inventory';
import { initSkills, activateSkillSlot, toggleSkillWindow, closeSkillWindow, skillWindowOpen, revealSkillBar } from './skills';
import {
  initQuestChain, setStoryNpcs, setCube, setAboutBubble, updateQuestChain,
  talkGuard, talkVendor, pickFruit, onAboutSeen, markBoardViewed, markFrameViewed,
  tryDeliver, takePending, onGuestbookSubmit, showQuestStart,
  onPlayerMoved, onInventoryOpened, onHelpRead, onLooked,
  galleryReadyToReport, reportGallery,
} from './questChain';

// ── 모듈 수준 렌더링 상태 ──
let renderer, scene, camera, composer;
let player, playerModel, npc, npcModel, wanderer;
let fireballs = null; // F 키 마법 파이어볼 시스템 ({ spawn, update })
let villagers = [];
let guard = null, vendor = null;

// ── 실내(가람이의 방·스튜디오 갤러리) 상태 ──
let indoor = null;         // { x, z, half | halfX/halfZ } — 실내 클램프 영역 (null = 실외)
let indoorDome = null;     // 현재 켜져 있는 실내 배경 돔
let outdoorPos = null;     // 들어가기 전 위치 (나올 때 복원)
let savedCamDist = null;   // 실내용으로 줄였던 카메라 거리 복원용
let roomDome = null;       // 가람이의 방 배경 돔
let galleryDome = null;    // 갤러리 배경 돔
let partyDome = null;      // 방명록 파티룸 배경 돔
let clock;
let cloudGroup;
let shadowFrozen = false; // 정적 그림자맵 1회 베이크 후 고정 여부
let isMobile = false;     // 모바일 GPU 품질 분기 (AA·그림자해상도·블룸해상도)
let listenerAbort = null; // bindEvents 가 건 모든 리스너를 disposeWorld 에서 한 번에 끊는 신호

// ── 공유 컬렉션 (서브모듈로 ctx 객체로 전달) ──
const obstacles = []; // {x,z,r}
const pois      = []; // {id, x, z, r, el, prompt, panel, object, type}
const spinners  = []; // {mesh, speed, region?}
const floaters  = []; // {mesh, baseY, amp, phase, speed, region?}
const pulsers   = []; // {mat, base, phase, lo?, hi?, region?}

// ── region 게이팅 ──────────────────────────────────────────────
// 애니메이터(spinners/floaters/pulsers)와 배회 NPC(wanderer/villagers)는 화면에
// 안 보여도 매 프레임 업데이트된다. 멀리 둔 별도 섬을 추가하면 그 섬의 움직임이
// 안 보일 때도 CPU 를 계속 잡아먹으므로, 각 아이템에 소속 region 을 태그해 두고
// "현재 활성 region 인 것만" 업데이트한다.
//   • region 없음(undefined) → 글로벌 (구름·하늘처럼 항상 돈다)
//   • region 있음            → activeRegion 과 일치할 때만 돈다
// 기존 섬/실내는 모두 'island' 로 태그되고 activeRegion 기본값도 'island' 라
// 현재 동작은 그대로 보존된다. 새 섬을 추가할 땐 그 빌더가 만드는 애니메이터·NPC 에
// region:'island2' 를 달고, 진입 시 setActiveRegion('island2') / 퇴장 시
// setActiveRegion('island') 만 호출하면 안 보이는 섬은 자동으로 멈춘다.
let activeRegion = 'island';
const inActiveRegion = (o) => !o || !o.region || o.region === activeRegion;
function setActiveRegion(name) { activeRegion = name; }

// 실외 이동 클램프 — 현재 서 있는 섬의 중심·반경 (포털로 섬을 바꾸면 교체).
let islandClamp = { x: 0, z: 0, r: WALK_R };
let preIslandPos = null; // GAME ISLAND 입장 전 메인 섬 위치 (복귀용)

// ── 입력 / 물리 ──
const input = { f: 0, b: 0, l: 0, r: 0, shift: 0 };
const vel   = new THREE.Vector3();
const WALK_SPEED = 5.3;  // 기존 8 의 약 2/3
const RUN_SPEED  = 10.7; // 기존 16 의 약 2/3
let jumpY = 0, jumpVel = 0, grounded = true;
// 점프는 현재 비활성(숨김). 올라설 플랫폼이 아직 없어 의미가 없으므로 트리거·버튼·안내를 모두 막아둔다.
// 추후 게임섬 점프맵에서만 쓸 예정 — 그때 jumpEnabled 를 켜고(필요시 region 진입 시 토글)
// applyJumpVisibility() 로 모바일 점프 버튼을 다시 노출하면 된다.
let jumpEnabled = false;
const GRAVITY = -28, JUMP_V = 9.2;

// ── 카메라 / UI ──
const camState  = { yaw: 0.6, pitch: 0.62, dist: 8 };
let activePoi = null;
let frozen = false;
let inspect = false;
let started = false;
let panelOpen = false;   // 패널(고서) 열림 — 월드 렌더링을 절약 모드로
let panelOpenAt = 0;     // 열린 시각 — 펼침 연출이 끝나면 렌더링 완전 정지
let frameSkip = false;

// ── 가람 자막 대화 ──
let aboutVisits = 0;       // 가람에게 말 건 횟수 (첫 만남 = 풀 소개, 이후 = 짧은 인사)

const tmp  = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3(); // updateMovement 의 이동 방향 — 매 프레임 new 방지

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
async function init() {
  const canvas = document.getElementById('scene-canvas');
  isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  renderer = new THREE.WebGLRenderer({
    // 모바일은 MSAA 를 끈다 — 타일드 GPU 에서 비싸고, 픽셀비율 캡(1.5)이 계단을 충분히 가린다.
    canvas, antialias: !isMobile, alpha: true, preserveDrawingBuffer: true,
    powerPreference: 'high-performance', // 하이브리드 환경에서 외장 GPU 우선 요청
  });
  // 모바일은 GPU 부담·발열을 줄이려 픽셀 비율을 더 낮게 캡.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xbfe6f5, 80, 175);

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  // ── 조명 ──
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xbfcf9a, 0.95));
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sun.position.set(18, 34, 14);
  sun.castShadow = true;
  // 그림자는 1회 베이크 후 고정(shadowFrozen)이라 per-frame 비용은 없지만,
  // 모바일은 텍스처 메모리·대역폭을 아끼려 해상도를 절반(1024)으로.
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  const s = 70;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top  =  s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  scene.add(sun);

  // ── 씬 빌드 (각 서브모듈) ──
  const ctx = { scene, obstacles, pulsers, floaters, spinners, pois };

  await buildIsland(ctx);
  buildDecor(ctx);
  await buildPlaza(ctx);
  await buildNature(ctx);
  await buildOrchard(ctx); // 과수원 (과일가게 사장 배달 퀘스트) — 나무 스캐터 뒤에 배치

  const pResult  = await buildPlayer(ctx);
  player      = pResult.player;
  playerModel = pResult.playerModel;
  fireballs   = createFireballs(scene, renderer, camera); // F 키 마법 파이어볼 (셰이더 프리워밍 포함)

  const poiResult = await buildPOIs(ctx);
  npc      = poiResult.npc;
  npcModel = poiResult.npcModel;

  cloudGroup = buildClouds(ctx);

  // 여기까지(동기 빌드)는 전부 메인 섬 소속 — region 게이팅용으로 'island' 태그.
  // 이후 비동기로 합류하는 NPC·실내도 같은 섬 region 이라 각자 'island' 로 단다.
  // (??= 라 빌더가 이미 region 을 지정했으면 보존 — 미래의 별도 섬 빌더 대비)
  for (const s of spinners) s.region ??= 'island';
  for (const f of floaters) f.region ??= 'island';
  for (const p of pulsers)  p.region ??= 'island';

  // 광장 배회 NPC — 필수 콘텐츠가 아니라 로딩을 막지 않게 비동기로 합류.
  buildWanderer(ctx)
    .then((w) => {
      wanderer = w;
      w.region = 'island'; // region 게이팅 — 다른 섬에 있을 땐 큐비도 멈춘다
      setCube(w); // 순차 말풍선 — trash 단계 전엔 큐비 말풍선 숨김
      // 움직이는 NPC — follow 로 매 프레임 poi 좌표를 동기화 (updatePOIs).
      pois.push({
        id: 'helper', type: 'helper',
        x: w.root.position.x, z: w.root.position.z, r: 2.8,
        follow: w.root, object: w.root,
        prompt: '큐비와 대화하기',
      });
    })
    .catch((e) => console.warn('[wanderer] load failed:', e));

  // 가람이의 방 (실내 씬) — 입장 전까지 안 보이는 곳이라 비동기로 합류.
  buildRoom(ctx)
    .then((r) => { roomDome = r.dome; })
    .catch((e) => console.warn('[room] load failed:', e));

  // 스튜디오 갤러리 (작업&경력 실내 씬) — 마찬가지로 비동기 합류.
  buildGallery(ctx)
    .then((r) => { galleryDome = r.dome; })
    .catch((e) => console.warn('[gallery] load failed:', e));

  // 방명록 파티룸 (실내 씬) — 마찬가지로 비동기 합류.
  buildParty(ctx)
    .then((r) => { partyDome = r.dome; })
    .catch((e) => console.warn('[party] load failed:', e));

  // GAME ISLAND (두 번째 섬) — 멀리 떨어진 좌표에 지어두고 포털로 텔레포트.
  // 모든 애니메이터가 region:'island2' 라 메인 섬에 있을 땐 루프가 멈춘다.
  buildIsland2(ctx).catch((e) => console.warn('[island2] load failed:', e));

  // 스토리 NPC (경비·과일가게 사장) — 비동기 합류. 움직이므로 follow 로 좌표 동기화.
  buildStoryNpcs(ctx)
    .then((s) => {
      guard = s.guard; vendor = s.vendor;
      setStoryNpcs(guard, vendor); // 대화 중 플레이어를 바라보게(setTalking)
      pois.push({
        id: 'guard', type: 'guard',
        x: guard.root.position.x, z: guard.root.position.z, r: 2.6,
        follow: guard.root, object: guard.root,
        prompt: '경비와 대화하기',
      });
      pois.push({
        id: 'fruit-vendor', type: 'fruit-vendor',
        x: vendor.root.position.x, z: vendor.root.position.z, r: 2.6,
        follow: vendor.root, object: vendor.root,
        prompt: '과일가게 사장과 대화하기',
      });
    })
    .catch((e) => console.warn('[story-npc] load failed:', e));

  // 주민 NPC들 — 마찬가지로 비동기 합류 (실패한 모델은 buildVillagers 안에서 건너뜀).
  buildVillagers(ctx).then((vs) => {
    villagers = vs;
    vs.forEach((v, i) => {
      v.region = 'island'; // region 게이팅 — 다른 섬에 있을 땐 주민 이동 정지
      pois.push({
        id: `villager-${i}`, type: 'villager',
        x: v.root.position.x, z: v.root.position.z, r: 2.8,
        follow: v.root, object: v.root,
        prompt: v.prompt, villager: v,
      });
    });
  });

  // ── 대화·퀘스트 모듈에 월드 훅 주입 ──
  initDialogue({
    onOpen: () => { frozen = true; input.f = input.b = input.l = input.r = 0; hidePrompt(); },
    onClosed: () => { frozen = false; if (activePoi) showPrompt(activePoi.prompt); }, // 아직 근처면 프롬프트 복원
    openPanel, // 가람: 대화가 끝나면 소개 패널 오픈
  });
  initQuest({
    pois,
    obstacles,
    getWanderer: () => wanderer,
    onPoiRemoved: (poi) => { if (activePoi === poi) { activePoi = null; hidePrompt(); } },
  });
  // 인벤토리(가방) — 열면 플레이어를 멈추고 프롬프트를 숨긴다.
  initInventory({
    onOpen: () => { frozen = true; input.f = input.b = input.l = input.r = 0; hidePrompt(); onInventoryOpened(); },
    onClose: () => { frozen = false; if (activePoi) showPrompt(activePoi.prompt); },
    onHelpOpened: () => onHelpRead(), // 적응 훈련: 「조작 안내서」 읽음 기록
  });
  // 스킬(장착·시전) — 스킬바/스킬창. 시전은 마법 모션 + 파이어볼을 재사용.
  initSkills({
    getFireballs:   () => fireballs,
    getPlayer:      () => player,
    getPlayerModel: () => playerModel,
    castMagic:      (onRelease) => playerModel?.userData?.castMagic?.(onRelease),
    canCast:        () => started && !frozen && !panelOpen,
    canOpen:        () => started && !panelOpen,
    onOpen:  () => { frozen = true; input.f = input.b = input.l = input.r = 0; hidePrompt(); },
    onClose: () => { frozen = false; if (activePoi) showPrompt(activePoi.prompt); },
  });
  // 퀘스트 체인 (경비 → 가람 전시회 → 과일 배달 → 큐비 → 엔딩)
  initQuestChain({
    scene, pois, obstacles,
    getVillagers: () => villagers,
    onPoiRemoved: (poi) => { if (activePoi === poi) { activePoi = null; hidePrompt(); } },
  });
  setAboutBubble(npc.userData.questBubble); // 가람 머리 위 안내 풍선 (훈련 통과 후 표시)
  // 방명록 제출 → 엔딩 연출 (마지막 단계에서만)
  window.__onGuestbookSubmit = onGuestbookSubmit;

  // ── 루프 시작 ──
  clock = new THREE.Clock();
  installDebugApi(); // window.__world (디버그) — dispose 에서 delete 후 재마운트 시 재설치
  bindEvents();
  resize();
  renderer.setAnimationLoop(loop);

  requestAnimationFrame(() => {
    document.getElementById('loader')?.classList.add('hide');
  });

  loadBloom();
}

async function loadBloom() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ]);
    const c = new EffectComposer(renderer);
    c.addPass(new RenderPass(scene, camera));
    // 블룸 내부 렌더타깃 해상도 — 데스크톱 절반, 모바일은 1/4 로 더 낮춰 글로우는 유지하되
    // 포스트프로세싱 비용을 추가로 ~1/4 절감. (계단/번짐 차이는 발광부라 거의 안 보임)
    const bloomDiv = isMobile ? 4 : 2;
    c.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth / bloomDiv, window.innerHeight / bloomDiv), 0.6, 0.5, 0.92));
    c.setSize(window.innerWidth, window.innerHeight);
    composer = c;
  } catch (e) {
    composer = null;
  }
}

function makeSkyTexture() {
  const w = 512, h = 512;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  // 베이스: 상층의 깊은 파랑에서 지평선의 따뜻한 빛까지 단계 세분화
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0,  '#5fb4e8');
  g.addColorStop(0.18, '#74c2ee');
  g.addColorStop(0.38, '#93d4f3');
  g.addColorStop(0.55, '#b4e3f7');
  g.addColorStop(0.70, '#d2eefa');
  g.addColorStop(0.84, '#ecf6f2');
  g.addColorStop(1.0,  '#ffefd8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 태양 방향(우상단)의 은은한 빛 번짐
  const sunX = w * 0.68, sunY = h * 0.22;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.55);
  glow.addColorStop(0.0,  'rgba(255, 245, 220, 0.55)');
  glow.addColorStop(0.25, 'rgba(255, 240, 210, 0.22)');
  glow.addColorStop(0.6,  'rgba(255, 235, 205, 0.07)');
  glow.addColorStop(1.0,  'rgba(255, 235, 205, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // 지평선 부근 대기 헤이즈 밴드
  const haze = ctx.createLinearGradient(0, h * 0.62, 0, h);
  haze.addColorStop(0.0, 'rgba(255, 250, 238, 0)');
  haze.addColorStop(0.7, 'rgba(255, 248, 230, 0.30)');
  haze.addColorStop(1.0, 'rgba(255, 242, 214, 0.50)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // 미세 노이즈로 그라데이션 밴딩 완화
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let seed = 1234567;
  for (let i = 0; i < d.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed / 0x7fffffff) - 0.5) * 5;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────
function bindEvents() {
  // 모든 리스너를 한 신호에 묶어, disposeWorld 에서 abort() 한 번으로 전부 제거한다.
  listenerAbort = new AbortController();
  const sig = listenerAbort.signal;
  const opt = { signal: sig };

  window.addEventListener('resize', resize, opt);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    // 대화 중에는 키 입력을 대화 진행에만 사용 (이동·점프 차단).
    if (dialogueActive()) {
      if (dialogueChoosing()) {
        // 선택지: ←→(A/D) 로 고르고 E/Enter 로 확정
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveChoice(-1);
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveChoice(1);
        else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); pickSelected(); }
        else if (e.code === 'Escape') endDialogue();
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); advanceDialogue(); }
      else if (e.code === 'Escape') endDialogue();
      return;
    }
    // 지도창이 열려 있으면 Esc/I 로 지도창만 먼저 닫는다 (인벤토리는 뒤에 남는다).
    if (mapOpen()) {
      if (e.code === 'Escape' || e.code === 'KeyI') closeMap();
      return;
    }
    // 안내창(조작 안내 책)이 열려 있으면 Esc/I 로 안내창만 먼저 닫는다.
    if (helpOpen()) {
      if (e.code === 'Escape' || e.code === 'KeyI') closeHelp();
      return;
    }
    // 인벤토리 열림 중에는 I/Esc 로 닫기만 받고 나머지 입력은 차단.
    if (inventoryOpen()) {
      if (e.code === 'KeyI' || e.code === 'Escape') closeInventory();
      return;
    }
    // 스킬창 열림 중에는 K/Esc 로 닫기만 받고 나머지 입력은 차단.
    if (skillWindowOpen()) {
      if (e.code === 'KeyK' || e.code === 'Escape') closeSkillWindow();
      return;
    }
    // I — 인벤토리(가방) 토글. 패널(고서)·시작 전엔 무시.
    if (e.code === 'KeyI') { if (started && !panelOpen) toggleInventory(); return; }
    // K — 스킬창 토글.
    if (e.code === 'KeyK') { if (started && !panelOpen) toggleSkillWindow(); return; }
    setKey(e.code, true);
    if (e.code === 'KeyE' || e.code === 'Enter') tryInteract();
    // 스킬 시전 — 숫자키 1~4 로 장착 슬롯, F 는 1번 슬롯 단축.
    const dk = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
    if (dk) activateSkillSlot(+dk[1] - 1);
    if (e.code === 'KeyF') activateSkillSlot(0);
    if (e.code === 'Space') { e.preventDefault(); tryJump(); }
    if (e.code === 'Escape') closePanel();
  }, opt);
  window.addEventListener('keyup', (e) => setKey(e.code, false), opt);

  let dragging = false, lastX = 0, lastY = 0;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    closeMobileMenu(); // 화면을 누르면 ☰ 메뉴 팝업 닫기
    if (frozen || indoor) return; // 실내에선 연출된 고정 앵글 유지 (회전 잠금)
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  }, opt);
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    camState.yaw   -= dx * 0.005;
    camState.pitch  = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, 0.18, 1.05);
    if (dx || dy) onLooked(); // 적응 훈련: 시점 회전(드래그) 사용 기록
  }, opt);
  canvas.addEventListener('pointerup', () => { dragging = false; }, opt);
  canvas.addEventListener('wheel', (e) => {
    if (indoor) return; // 실내에선 줌 고정 — 방 밖이 보이지 않게
    camState.dist = THREE.MathUtils.clamp(camState.dist + Math.sign(e.deltaY) * 1.0, 8, 12);
  }, { passive: true, signal: sig });

  const prompt = document.getElementById('prompt');
  if (prompt) prompt.addEventListener('click', tryInteract, opt);
  const dlg = document.getElementById('npc-dialogue');
  if (dlg) dlg.addEventListener('click', advanceDialogue, opt);
  document.querySelectorAll('#npc-dialogue .dlg-choice').forEach((btn, i) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); pickChoice(i); }, opt);
  });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closePanel, opt));
  document.querySelector('#overlay .scrim')?.addEventListener('click', closePanel, opt);
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', startWorld, opt);

  if (matchMedia('(pointer: coarse)').matches) {
    document.body.classList.add('touch');
    // 키캡 표기를 터치용으로 — 프롬프트의 'E', 대화창 "계속하기 E" 힌트
    document.querySelectorAll('.pkey, .dlg-key').forEach((el) => { el.textContent = '탭'; });
    setupJoystick(sig);
    applyJumpVisibility(); // 점프 버튼 노출 여부 반영 (현재 비활성 → 숨김)
    const jb = document.getElementById('jump-btn');
    if (jb) jb.addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); }, opt);
    const ab = document.getElementById('act-btn');
    if (ab) ab.addEventListener('pointerdown', (e) => { e.preventDefault(); tryInteract(); }, opt);
  }

  // ☰ 통합 메뉴 — 데스크톱·모바일 공통. 버튼은 pointerdown 으로 팝업 토글, 항목은 click 으로
  // 동작(여는 탭의 잔여 click 이 새로 뜬 창의 스크림을 눌러 닫는 버그 회피).
  const mb = document.getElementById('menu-btn');
  if (mb) mb.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleMobileMenu(); }, opt);
  document.querySelectorAll('#menu-pop .menu-item').forEach((it) => {
    it.addEventListener('click', () => mobileMenuAction(it.getAttribute('data-menu')), opt);
  });
}

// ☰ 모바일 메뉴 팝업 토글/닫기 + 항목 동작(가방·스킬창·안내서).
function toggleMobileMenu() {
  if (dialogueActive() || panelOpen || !started) return;
  document.getElementById('menu-pop')?.classList.toggle('show');
}
function closeMobileMenu() {
  document.getElementById('menu-pop')?.classList.remove('show');
}
function mobileMenuAction(kind) {
  closeMobileMenu();
  if (!started || panelOpen) return;
  if (kind === 'bag') mobileToggleBag();
  else if (kind === 'skill') toggleSkillWindow();
  else if (kind === 'help') openHelp();
}

// 모바일 가방 버튼 — I 키 키다운 라우팅과 동일한 우선순위로 토글한다.
function mobileToggleBag() {
  if (dialogueActive()) return;
  if (mapOpen()) { closeMap(); return; }
  if (inventoryOpen()) { closeInventory(); return; }
  if (started && !panelOpen) toggleInventory();
}

function setKey(code, down) {
  const v = down ? 1 : 0;
  if (code === 'KeyW'      || code === 'ArrowUp')    input.f = v;
  if (code === 'KeyS'      || code === 'ArrowDown')  input.b = v;
  if (code === 'KeyA'      || code === 'ArrowLeft')  input.l = v;
  if (code === 'KeyD'      || code === 'ArrowRight') input.r = v;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.shift = v;
}

function setupJoystick(sig) {
  const joy = document.getElementById('joy');
  const nub = joy.querySelector('.nub');
  let active = false, cx = 0, cy = 0;
  const opt = { signal: sig };
  joy.addEventListener('pointerdown', (e) => {
    closeMobileMenu(); // 조이스틱을 잡으면 ☰ 메뉴 팝업 닫기
    active = true;
    const r = joy.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    joy.setPointerCapture(e.pointerId);
    move(e);
  }, opt);
  joy.addEventListener('pointermove', (e) => { if (active) move(e); }, opt);
  joy.addEventListener('pointerup', () => {
    active = false; input.f = input.b = input.l = input.r = 0;
    nub.style.transform = 'translate(-50%,-50%)';
  }, opt);
  function move(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = 38, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / max, ny = dy / max;
    input.r = Math.max(0, nx);  input.l = Math.max(0, -nx);
    input.b = Math.max(0, ny);  input.f = Math.max(0, -ny);
  }
}

// ─────────────────────────────────────────────
//  INTERACTION
// ─────────────────────────────────────────────
function tryInteract() {
  if (frozen || !started) return;
  if (!activePoi) return;
  if (activePoi.id === 'about') startDialogue(activePoi);
  else if (activePoi.id === 'work') enterGallery();
  else if (activePoi.id === 'guestbook') enterParty();
  else if (activePoi.type === 'guestbook-desk') openGuestbookPanel();
  else if (activePoi.type === 'guard') talkGuard();
  else if (activePoi.type === 'fruit-vendor') talkVendor();
  else if (activePoi.type === 'fruit') pickFruit(activePoi);
  else if (activePoi.type === 'helper') startHelperDialogue();
  // 배달 중인 주민이면 배달 처리, 아니면 일상 대화
  else if (activePoi.type === 'villager') { if (!tryDeliver(activePoi)) startVillagerDialogue(activePoi.villager); }
  else if (activePoi.type === 'box') pickupBox(activePoi);
  else if (activePoi.type === 'dumpster') useDumpster();
  else if (activePoi.type === 'house-enter') enterRoom();
  else if (activePoi.type === 'frame') { markFrameViewed(activePoi.idx); openWorkPanel(activePoi.idx); }
  else if (activePoi.type === 'work-board') { markBoardViewed(); openWorkPanel(); }
  else if (activePoi.type === 'house-exit' || activePoi.type === 'gallery-exit' || activePoi.type === 'party-exit') exitInterior();
  else if (activePoi.type === 'arcade-portal') enterIsland2();
  else if (activePoi.type === 'arcade-return') returnFromIsland2();
  else openPanel(activePoi);
}

// ─────────────────────────────────────────────
//  자막 대화 (가람 소개 + 큐비 퀘스트 + 안내 메시지)
// ─────────────────────────────────────────────
// 가람 전용 — 첫 만남이면 풀 소개, 이후엔 짧은 인사. 대화가 끝나면 소개 패널.
//  갤러리(액자 4개)를 다 보고 보고하러 왔으면 소개 대신 완료 대화 → 다음 단계로.
function startDialogue(poi) {
  if (galleryReadyToReport()) {
    openDialogue(GARAM_GALLERY_DONE, '가람', { onEnd: reportGallery });
    return;
  }
  const lines = aboutVisits === 0
    ? NPC_LINES_FIRST
    : NPC_LINES_AGAIN[(aboutVisits - 1) % NPC_LINES_AGAIN.length];
  aboutVisits++;
  openDialogue(lines, '가람', { poi });
}

// 주민 — 일상 대사를 말 걸 때마다 순서대로 돌려가며 보여준다.
function startVillagerDialogue(v) {
  const lines = v.lines[(v.visits || 0) % v.lines.length];
  v.visits = (v.visits || 0) + 1;
  v.setTalking(true);
  openDialogue(lines, v.name, { onEnd: () => v.setTalking(false) });
}

// 실내 공간 입장/퇴장 공통 — 섬 밖에 지어둔 실내로 텔레포트.
// region: 그 방의 region 으로 전환 → 방 안 애니메이터만 돌고 섬 애니메이터·배회 NPC 는 멈춘다.
function enterInterior({ bounds, spawn, dome, yaw, pitch, dist, greeting, region }) {
  outdoorPos = player.position.clone();
  player.position.set(spawn.x, 0, spawn.z);
  vel.set(0, 0, 0);
  indoor = bounds;
  if (region) setActiveRegion(region);
  indoorDome = dome || null;
  if (indoorDome) indoorDome.visible = true;
  savedCamDist = camState.dist;
  camState.dist = dist;
  camState.yaw = yaw;
  camState.pitch = pitch;
  activePoi = null;
  hidePrompt();
  snapCamera();
  if (greeting) openDialogue([greeting], '안내');
}

function exitInterior() {
  player.position.copy(outdoorPos || new THREE.Vector3(0, 0, 3.5));
  vel.set(0, 0, 0);
  indoor = null;
  setActiveRegion('island'); // 메인 섬 애니메이터·배회 NPC 재개
  if (indoorDome) { indoorDome.visible = false; indoorDome = null; }
  if (savedCamDist !== null) { camState.dist = savedCamDist; savedCamDist = null; }
  activePoi = null;
  hidePrompt();
  snapCamera();
}

// 가람이의 방 — 아이소메트릭 디오라마 앵글 (열린 면 침대가 안 가리는 각도)
function enterRoom() {
  enterInterior({
    bounds: ROOM, spawn: ROOM.spawn, dome: roomDome,
    yaw: 0.18, pitch: 0.55, dist: 8.5, region: 'room',
    greeting: '가람이의 방에 들어왔다.',
  });
}

// 스튜디오 갤러리 — 정면(북쪽 액자 벽)을 바라보는 전시장 앵글
function enterGallery() {
  enterInterior({
    bounds: GALLERY, spawn: GALLERY.spawn, dome: galleryDome,
    yaw: 0, pitch: 0.6, dist: 8.5, region: 'gallery',
    greeting: '가람의 스튜디오 갤러리에 들어왔다.',
  });
}

// 방명록 파티룸 — 친구들 사진과 풍선으로 꾸민 방, 테이블에서 방명록을 남긴다
function enterParty() {
  enterInterior({
    bounds: PARTY, spawn: PARTY.spawn, dome: partyDome,
    yaw: 0, pitch: 0.62, dist: 8.5, region: 'party',
    greeting: '방명록 파티룸에 들어왔다! 🎉',
  });
}

// GAME ISLAND (두 번째 섬) 입장 — 실내와 달리 자유 카메라/이동을 유지하고
// 이동 클램프 중심만 그 섬으로 옮긴다. region 을 'island2' 로 바꿔 그 섬의
// 애니메이터만 돌게 한다 (메인 섬은 자동으로 멈춤).
function enterIsland2() {
  preIslandPos = player.position.clone();
  player.position.set(ISLAND2_SPAWN.x, 0, ISLAND2_SPAWN.z);
  vel.set(0, 0, 0);
  islandClamp = { x: ISLAND2_CENTER.x, z: ISLAND2_CENTER.z, r: ISLAND2_WALK };
  setActiveRegion('island2');
  activePoi = null;
  hidePrompt();
  snapCamera(); // 먼 좌표로 순간이동 — 카메라가 가로질러 날아가지 않게 즉시 스냅
  openDialogue(['🎮 GAME ISLAND 에 도착했다! 중앙 포털로 마을에 돌아갈 수 있다.'], '안내');
}

// GAME ISLAND → 메인 섬 복귀
function returnFromIsland2() {
  player.position.copy(preIslandPos || new THREE.Vector3(0, 0, 3.5));
  vel.set(0, 0, 0);
  islandClamp = { x: 0, z: 0, r: WALK_R };
  setActiveRegion('island');
  activePoi = null;
  hidePrompt();
  snapCamera();
}

// 방명록 패널 — 파티룸 테이블에서 연다 (id 가 guestbook 이라 __initGuestbook 동작)
function openGuestbookPanel() {
  const panel = document.getElementById('panel-guestbook');
  if (panel) openPanel({ id: 'guestbook', panel });
}

// 작업&경력 패널 열기
//  soloIdx 지정(액자) → 해당 프로젝트 아티클만 단독 표시
//  null(경력 게시판)   → 전체 내용 표시
function openWorkPanel(soloIdx = null) {
  const panel = document.getElementById('panel-work');
  if (!panel) return;
  const body = panel.querySelector('.panel-body');
  if (body) {
    [...body.children].forEach((el) => {
      el.style.display = soloIdx === null || el.id === `proj-${soloIdx}` ? '' : 'none';
    });
  }
  openPanel({ id: 'work', panel });
}

// 텔레포트 직후 카메라가 섬을 가로질러 날아오지 않게 즉시 스냅.
function snapCamera() {
  const { yaw, pitch, dist } = camState;
  const target = tmp.copy(player.position).add(tmp2.set(0, 1.6, 0));
  camera.position.set(
    target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  camera.lookAt(target);
}

function tryJump() {
  if (!jumpEnabled) return; // 점프 비활성(추후 게임섬 점프맵에서만 사용)
  if (frozen || !started) return;
  if (playerModel?.userData?.isCasting?.()) return; // 시전 중엔 점프도 막아 완전 고정
  if (grounded) { jumpVel = JUMP_V; grounded = false; }
}

// 모바일 점프 버튼 노출 여부 — jumpEnabled 에 맞춰 body.jump-on 토글(CSS 가 보이기/숨기기).
function applyJumpVisibility() {
  document.body.classList.toggle('jump-on', jumpEnabled);
}


function openPanel(poi) {
  const overlay = document.getElementById('overlay');
  document.querySelectorAll('.panel').forEach((p) => (p.style.display = 'none'));
  if (poi.panel) poi.panel.style.display = 'flex';
  overlay.classList.add('open');
  frozen = true;
  panelOpen = true;
  panelOpenAt = performance.now();
  input.f = input.b = input.l = input.r = 0;
  hidePrompt();
  if (poi.id === 'guestbook' && window.__initGuestbook) window.__initGuestbook();
  if (poi.id === 'about') onAboutSeen(); // 소개(신원) 확인 → 경비 단계 통과 + 갤러리 퀘스트
  const body = poi.panel?.querySelector('.panel-body');
  if (body) body.scrollTop = 0;
}

function closePanel() {
  const overlay = document.getElementById('overlay');
  if (!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  panelOpen = false;
  setTimeout(() => { frozen = false; }, 120);
  // 패널(소개·액자)을 닫은 직후 이어질 가람의 퀘스트 대사·시작 배너가 있으면 띄운다.
  const next = takePending();
  if (next) setTimeout(() => {
    if (next.banner) showQuestStart(next.banner[0], next.banner[1]);
    openDialogue(next.lines, next.name);
  }, 180);
}

// NPC 와 "대화"하는 상호작용인지 — 모바일 상호작용 버튼 아이콘을 💬(대화) ↔ ✋(줍기/액션)로 분기.
const TALK_POI_TYPES = new Set(['guard', 'fruit-vendor', 'helper', 'villager']);
function isTalkPoi(poi) {
  return !!poi && (poi.id === 'about' || TALK_POI_TYPES.has(poi.type)); // about = 가람 NPC
}

function showPrompt(text) {
  const p = document.getElementById('prompt');
  p.querySelector('.ptxt').textContent = text;
  p.classList.add('show');
  // 모바일 상호작용 버튼 — NPC 대화면 💬 말풍선, 과일·박스 줍기 등은 ✋ 손.
  const ab = document.getElementById('act-btn');
  if (ab) {
    ab.textContent = isTalkPoi(activePoi) ? '💬' : '✋';
    ab.classList.add('show');
  }
}
function hidePrompt() {
  document.getElementById('prompt').classList.remove('show');
  document.getElementById('act-btn')?.classList.remove('show');
}
function startWorld() {
  started = true;
  document.getElementById('intro')?.classList.add('hide');
  revealSkillBar(); // 중앙 하단 스킬바 노출
}

// ─────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────
function loop() {
  // 패널(고서) 열림 중엔 월드가 스크림에 가려 거의 안 보임.
  // 펼침 연출(~0.9s) 동안만 절반 프레임 + 블룸 생략으로 배경을 유지하고,
  // 연출이 끝나면 렌더링을 완전히 멈춰 패널 스크롤에 자원을 모두 양보.
  if (panelOpen) {
    if (performance.now() - panelOpenAt > 1300) return;
    if ((frameSkip = !frameSkip)) return;
  }

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  // 그림자맵 고정: 비동기 프롭(주민·실내 등)이 다 합류한 뒤(~1.5s) 정적 그림자를
  // 마지막으로 1회 베이크하고, 이후 매 프레임 그림자 패스를 멈춘다. 씬의 모든
  // 그림자 캐스터가 정적(플레이어 그림자는 blob 으로 대체)이라 시각 변화는 없다.
  if (!shadowFrozen && t > 1.5) {
    renderer.shadowMap.needsUpdate = true; // 이 프레임에 마지막 베이크
    renderer.shadowMap.autoUpdate = false; // 다음 프레임부터 그림자 패스 정지
    shadowFrozen = true;
  }

  if (started && !frozen) updateMovement(dt);
  if (playerModel?.userData?.update) playerModel.userData.update(dt);
  fireballs?.update(dt);
  if (inActiveRegion(wanderer)) wanderer?.update(dt, player?.position);
  for (const v of villagers) if (inActiveRegion(v)) v.update(dt, player?.position);
  if (!inspect) updateCamera(dt, t);
  updatePOIs(t);
  updateAmbient(t);
  if (started) updateQuestChain(dt); // 배달 타이머·타깃 화살표
  if (started) updateMinimap(player.position.x, player.position.z, !indoor && activeRegion === 'island'); // 우측 미니맵 내 위치 (메인 섬에서만)
  updateLabels();

  if (composer && !panelOpen) composer.render();
  else renderer.render(scene, camera);
}

function updateMovement(dt) {
  const yaw     = camState.yaw;
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  // 시전 중에는 제자리에 고정 — 이동 입력을 무시하고 속도를 즉시 0 으로.
  const casting = !!playerModel?.userData?.isCasting?.();

  const dir     = tmp3.set(0, 0, 0);
  if (!casting) {
    dir.addScaledVector(forward, input.f - input.b);
    dir.addScaledVector(right,   input.r - input.l);
  }

  const moving = dir.lengthSq() > 0.0001;
  if (moving) {
    onPlayerMoved(input); // 경비 적응 훈련 — WASD 4방향 사용 추적
    dir.normalize();
    const speed = input.shift ? RUN_SPEED : WALK_SPEED;
    vel.lerp(dir.multiplyScalar(speed), 0.18);
  } else {
    vel.multiplyScalar(casting ? 0 : 0.8); // 시전 중 즉시 정지
  }

  player.position.addScaledVector(vel, dt);

  // 충돌 처리 — 제곱거리로 먼 obstacle 을 sqrt 없이 제외하고, 닿는 쌍만 sqrt.
  for (const o of obstacles) {
    const dx = player.position.x - o.x, dz = player.position.z - o.z;
    const min = o.r + 0.6;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-8) continue;
    const dist = Math.sqrt(d2);
    const push = min - dist;
    player.position.x += (dx / dist) * push;
    player.position.z += (dz / dist) * push;
  }

  // 경계 — 실내에선 그 공간 안, 실외에선 섬 안
  if (indoor) {
    const hx = indoor.halfX ?? indoor.half;
    const hz = indoor.halfZ ?? indoor.half;
    player.position.x = THREE.MathUtils.clamp(player.position.x, indoor.x - hx, indoor.x + hx);
    player.position.z = THREE.MathUtils.clamp(player.position.z, indoor.z - hz, indoor.z + hz);
  } else {
    // 현재 섬 중심 기준 반경 클램프 (메인 섬 = 원점, GAME ISLAND = 먼 좌표)
    const dx = player.position.x - islandClamp.x;
    const dz = player.position.z - islandClamp.z;
    const rr = Math.hypot(dx, dz);
    if (rr > islandClamp.r) {
      player.position.x = islandClamp.x + dx * (islandClamp.r / rr);
      player.position.z = islandClamp.z + dz * (islandClamp.r / rr);
    }
  }

  if (moving) playerModel.rotation.y = lerpAngle(playerModel.rotation.y, Math.atan2(vel.x, vel.z), 0.2);

  // 점프 물리
  jumpVel += GRAVITY * dt;
  jumpY   += jumpVel * dt;
  if (jumpY <= 0) { jumpY = 0; jumpVel = 0; grounded = true; }

  const blob = player.userData.blob;
  if (blob) {
    const k = Math.max(0.35, 1 - jumpY * 0.16);
    blob.scale.setScalar(k);
    blob.material.opacity = 0.18 * k;
  }

  const sp = vel.length();
  let bob = 0;
  if (sp > 0.3 && grounded) {
    const freq = input.shift ? 16 : 12;
    const amp  = input.shift ? 0.08 : 0.06;
    bob = Math.sin(clock.elapsedTime * freq) * amp * Math.min(sp / RUN_SPEED, 1);
    playerModel.rotation.z = Math.sin(clock.elapsedTime * freq) * 0.03 * Math.min(sp / RUN_SPEED, 1);
  } else {
    playerModel.rotation.z *= 0.8;
  }
  // 절차적 squash/stretch 는 절차적 캐릭터 전용 — 스킨드 FBX 에는 적용하지 않음
  // (점프 높이는 아래 position.y, 다리 모션은 애니메이션 클립이 담당).
  if (!playerModel.userData.animated) {
    const stretch = grounded ? 1 : THREE.MathUtils.clamp(1 + jumpVel * 0.012, 0.9, 1.12);
    playerModel.scale.y += (stretch - playerModel.scale.y) * 0.3;
    playerModel.scale.x += (1 / Math.sqrt(playerModel.scale.y) - playerModel.scale.x) * 0.3;
    playerModel.scale.z  = playerModel.scale.x;
  }
  playerModel.position.y = jumpY + bob;

  if (playerModel.userData.animated) {
    playerModel.userData.setMotion(sp, grounded, RUN_SPEED);
  } else {
    animateLimbs(playerModel, sp, !grounded, jumpVel, clock.elapsedTime);
  }
}

function updateCamera(dt, t) {
  const { yaw, pitch, dist } = camState;
  const target  = tmp.copy(player.position).add(tmp2.set(0, 1.6, 0));
  const desired = tmp2.set(
    target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  if (!started) desired.y += Math.sin(t * 0.6) * 0.4;
  camera.position.lerp(desired, started ? 0.12 : 0.04);
  camera.lookAt(target);
}

function updatePOIs(t) {
  if (npc) {
    const dx = player.position.x - npc.position.x;
    const dz = player.position.z - npc.position.z;
    npcModel.rotation.y = lerpAngle(npcModel.rotation.y, Math.atan2(dx, dz), 0.06);
    npcModel.position.y = Math.sin(t * 2) * 0.04;
    animateLimbs(npcModel, 0, false, 0, t, 1.7);
  }
  let nearest = null, best = Infinity;
  for (const p of pois) {
    if (p.hidden) continue; // 숨겨진 POI(미수락 쓰레기 등)는 상호작용 대상 제외
    if (p.follow) { p.x = p.follow.position.x; p.z = p.follow.position.z; }
    const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
    p._dist = d;
    if (d < p.r && d < best) { best = d; nearest = p; }
  }
  if (nearest !== activePoi) {
    activePoi = nearest;
    if (started) { if (activePoi) showPrompt(activePoi.prompt); else hidePrompt(); }
  }
}

function updateAmbient(t) {
  for (const s of spinners) { if (!inActiveRegion(s)) continue; s.mesh.rotation.y += s.speed * 0.02; }
  for (const f of floaters) { if (!inActiveRegion(f)) continue; f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * f.amp; }
  for (const p of pulsers) {
    if (!inActiveRegion(p)) continue;
    const lo = p.lo ?? 0.6, hi = p.hi ?? 1.0;
    const k = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 2.4 + p.phase));
    p.mat.color.setHex(p.base);
    p.mat.color.multiplyScalar(k);
  }
  if (cloudGroup) {
    cloudGroup.children.forEach((c) => {
      c.userData.angle += c.userData.speed * 0.02;
      c.position.x = Math.cos(c.userData.angle) * c.userData.rad;
      c.position.z = Math.sin(c.userData.angle) * c.userData.rad;
    });
  }
  pois.forEach((p) => {
    if (p.object?.userData?.env) p.object.userData.env.position.y = 4.6 + Math.sin(t * 1.6) * 0.18;
  });
}

function updateLabels() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  for (const p of pois) {
    if (!p.el) continue;
    // 다른 섬에 있을 땐 그 라벨을 숨긴다 — DOM 투영은 안개·거리를 무시해서
    // GAME ISLAND 에서도 마을 섬 이름표가 화면에 찍히기 때문. (태그 없는 POI = 메인 섬)
    if ((p.region || 'island') !== activeRegion) {
      if (p._vis !== false) { p.el.style.opacity = '0'; p._vis = false; }
      continue;
    }
    tmp.set(p.x, p.labelY || 3.2, p.z);
    tmp.project(camera);
    if (tmp.z > 1) {
      if (p._vis !== false) { p.el.style.opacity = '0'; p._vis = false; } // 카메라 뒤 — 1회만 숨김
      continue;
    }
    // transform 은 카메라를 따라 매 프레임 갱신 (부드러운 추적).
    p.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    const near = p._dist !== undefined && p._dist < p.r;
    // opacity·테두리 색은 근접 상태가 바뀔 때만 DOM 에 쓴다. (매 프레임 querySelector 제거)
    if (p._near !== near || p._vis === false) {
      p.el.style.opacity = near ? '1' : '0.82';
      if (!p._chip) p._chip = p.el.querySelector('.chip');
      if (p._chip) p._chip.style.borderColor = near ? `var(--poi-${p.id})` : 'var(--line)';
      p._near = near;
    }
    p._vis = true;
  }
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // 패널 열림으로 렌더링이 정지된 상태에서도 배경이 깨지지 않게 한 프레임 갱신
  if (panelOpen) renderer.render(scene, camera);
}

// ─────────────────────────────────────────────
//  DEBUG API
// ─────────────────────────────────────────────
// init 에서 호출 — disposeWorld 에서 delete 하므로, 재마운트 시 다시 설치되도록 함수로 둔다.
function installDebugApi() {
  window.__world = {
  closePanel, startWorld,
  getState: () => ({
    started, frozen,
    sceneChildren: scene.children.length,
    player: player ? [+player.position.x.toFixed(2), +player.position.z.toFixed(2)] : null,
    cam: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)],
    activePoi: activePoi?.id ?? null,
    running: !!input.shift,
    jumpY: +jumpY.toFixed(3), grounded,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  }),
  setInput:  (k, v)  => { if (k in input) input[k] = v; },
  jump:      ()      => tryJump(),
  teleport:  (x, z)  => { player.position.set(x, 0, z); },
  openPoi:   (id)    => { const p = pois.find((q) => q.id === id); if (p) openPanel(p); },
  faceCam: (dist = 1.5) => {
    const hp = player.position;
    camera.position.set(hp.x, 1.55 + (dist - 1.5) * 0.35, hp.z + dist);
    camera.lookAt(hp.x, 1.4, hp.z);
    playerModel.rotation.y = 0;
    inspect = true; frozen = true;
  },
  unFaceCam: ()      => { inspect = false; },
  renderOnce:()      => { if (composer) composer.render(); else renderer.render(scene, camera); },
  shibaInfo: ()      => ({ children: playerModel.children.length, hasTail: !!playerModel.userData.tail, hasArms: !!playerModel.userData.leftArm }),
  modelRef:  ()      => playerModel,
  obstacles: ()      => obstacles.map((o) => ({ x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r })),
  topView:   (h = 80) => { inspect = true; frozen = true; camera.position.set(0, h, 0.01); camera.lookAt(0, 0, 0); },
  lookAtPoint: (x, z, dist = 14, h = 7) => { inspect = true; frozen = true; const k = Math.hypot(x, z) || 1; camera.position.set(x + (x / k) * dist, h, z + (z / k) * dist); camera.lookAt(x, 3, z); },
  freeCam: (cx, cy, cz, tx, ty, tz) => { inspect = true; frozen = true; camera.position.set(cx, cy, cz); camera.lookAt(tx, ty ?? 2, tz); },
  spinModel: (rad)   => { playerModel.rotation.y = rad; },





  npcCam: (dist = 3.2) => {
    inspect = true; frozen = true;
    npcModel.rotation.y = 0;
    camera.position.set(npc.position.x, 1.7, npc.position.z + dist);
    camera.lookAt(npc.position.x, 1.5, npc.position.z);
  },
  };
}

// ─────────────────────────────────────────────
//  TEARDOWN — 언마운트/재마운트 시 RAF·렌더러·리스너·GPU 리소스를 모두 해제
// ─────────────────────────────────────────────
export function disposeWorld(): void {
  if (!__booted) return;

  // 1) 렌더 루프 정지
  try { renderer?.setAnimationLoop(null); } catch {}

  // 2) bindEvents/setupJoystick 가 건 모든 리스너 일괄 제거
  try { listenerAbort?.abort(); } catch {}
  listenerAbort = null;

  // 3) 포스트프로세싱·렌더러·WebGL 컨텍스트 해제.
  //    forceContextLoss 가 GL 컨텍스트를 통째로 destroy 하므로 GPU 메모리(지오·텍스처)는
  //    전부 회수된다. 서브모듈들이 들고 있는 공유 지오/텍스처 싱글톤은 모듈 캐시상 살아남아
  //    재init 시 새 컨텍스트에 다시 업로드되므로, 여기서 per-object dispose 는 일부러 하지 않는다
  //    (dispose 하면 캐시된 싱글톤이 깨져 재마운트 후 렌더가 망가짐).
  try { composer?.dispose?.(); } catch {}
  try { renderer?.dispose(); } catch {}
  try { renderer?.forceContextLoss?.(); } catch {}

  // 4) window 전역 제거 — 디버그 API 가 잡고 있던 씬/플레이어 참조까지 끊는다
  try { delete window.__world; } catch {}
  try { delete window.__onGuestbookSubmit; } catch {}

  // 5) 모듈 상태 리셋 — 다음 마운트가 깨끗하게 재init 되도록
  renderer = scene = camera = composer = null;
  player = playerModel = npc = npcModel = wanderer = null;
  fireballs = null;
  villagers = []; guard = null; vendor = null;
  obstacles.length = 0; pois.length = 0;
  spinners.length = 0; floaters.length = 0; pulsers.length = 0;
  indoor = null; indoorDome = null; outdoorPos = null;
  roomDome = null; galleryDome = null; partyDome = null;
  started = false; frozen = false; inspect = false;
  panelOpen = false; shadowFrozen = false;
  activeRegion = 'island';
  islandClamp = { x: 0, z: 0, r: WALK_R };
  aboutVisits = 0;

  __booted = false;
}

// ─────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────
let __booted = false;
export function initWorld(): void {
  if (typeof window === 'undefined' || __booted) return;
  __booted = true;
  init();
}
