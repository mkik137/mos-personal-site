// @ts-nocheck
// ─────────────────────────────────────────────
//  skills — 스킬 장착/시전 시스템
//   • 중앙 하단 스킬바(#skillbar): 장착된 4개 슬롯을 보여주고, 클릭/숫자키(1~4)로 시전
//   • 스킬창(#skill-window): K 키로 열어 보유 스킬을 슬롯에 장착
//  React 가 렌더한 정적 DOM(#skillbar/#skill-window)을 엔진이 명령형으로 채운다.
//  월드 훅(canCast/castMagic/getFireballs 등)은 initSkills 로 주입.
// ─────────────────────────────────────────────
import * as THREE from 'three';

// 모든 스킬은 같은 마법 시전 모션 + 불꽃 발사체를 공유하고, 발사 패턴/속도/색만 다르다.
//  shots: 발사할 투사체 목록 — a(정면 기준 각도 rad)·speed·size·life
//  model: 발사체 모델 키 (fireball.ts MODELS — fire/rock/bolt). 발광은 모델 emissive 로 처리.
export const SKILL_CATALOG = [
  { id: 'fireball', name: '파이어볼', icon: '🔥', desc: '정면으로 불덩이를 발사한다.', model: 'fire',
    shots: [{ a: 0, speed: 17, size: 1.0, life: 1.1 }] },
  { id: 'triple', name: '삼연사', icon: '☄️', desc: '세 갈래로 퍼지는 화염탄.', model: 'fire',
    shots: [{ a: -0.28, speed: 16, size: 0.85, life: 1.05 }, { a: 0, speed: 16, size: 0.85, life: 1.05 }, { a: 0.28, speed: 16, size: 0.85, life: 1.05 }] },
  { id: 'meteor', name: '스톤 불릿', icon: '🪨', desc: '단단한 바윗덩이를 쏘아 보낸다.', model: 'meteor',
    shots: [{ a: 0, speed: 11, size: 1.7, life: 1.5 }] },
  { id: 'bolt', name: '라이트닝', icon: '⚡', desc: '빠르게 직진하는 번개.', model: 'bolt',
    shots: [{ a: 0, speed: 27, size: 0.62, life: 0.95 }] },
];

const SLOTS = 4;
const equipped = ['fireball', null, null, null]; // 슬롯별 장착 스킬 id (기본: 1번에 파이어볼)
let selSlot = 0;        // 스킬창에서 선택된 장착 슬롯
let winOpen = false;
let openedAt = 0;       // 스킬창을 연 시각 — 여는 탭의 잔여 click 으로 즉시 닫히는 것 방지(모바일)
let deps = {};
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

let bar = null, win = null, winSlots = null, winCatalog = null;
function dom() {
  if (!bar) {
    bar = document.getElementById('skillbar');
    win = document.getElementById('skill-window');
    winSlots = document.getElementById('sw-slots');
    winCatalog = document.getElementById('sw-catalog');
  }
  return bar;
}

const skillById = (id) => SKILL_CATALOG.find((s) => s.id === id) || null;

export function initSkills(d) {
  deps = d || {};
  if (!dom()) return;
  win?.querySelectorAll('[data-skill-close]').forEach((b) => b.addEventListener('click', closeSkillWindowFromUI));
  renderBar();
  renderWindow();
}

// 시작 시 호출 — 인트로가 사라진 뒤 스킬바를 노출한다.
export function revealSkillBar() {
  if (dom()) bar.classList.add('on');
}

// ── 시전 ────────────────────────────────────────────────────────
export function activateSkillSlot(i) {
  if (winOpen) return;
  if (!deps.canCast?.()) return;
  const skill = skillById(equipped[i]);
  if (!skill) return;
  const ok = deps.castMagic?.(() => fireSkill(skill));
  if (ok) flashSlot(i);
}

function fireSkill(skill) {
  const fb = deps.getFireballs?.();
  const player = deps.getPlayer?.();
  const pm = deps.getPlayerModel?.();
  if (!fb || !player || !pm) return;
  const ry = pm.rotation.y; // 발사 시점에 바라보는 방향이 정면
  const origin = player.position.clone()
    .add(new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(0.7)) // 몸 앞쪽
    .add(new THREE.Vector3(0, 1.15, 0)); // 가슴 높이
  for (const sh of skill.shots) {
    const a = ry + sh.a;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    fb.spawn(origin.clone(), dir, { speed: sh.speed, size: sh.size, life: sh.life, model: skill.model });
  }
}

function flashSlot(i) {
  const el = bar?.querySelector(`.skill-slot[data-slot="${i}"]`);
  if (!el) return;
  el.classList.add('cast');
  setTimeout(() => el.classList.remove('cast'), 220);
}

// ── 스킬창 열기/닫기 ─────────────────────────────────────────────
export function skillWindowOpen() { return winOpen; }

export function openSkillWindow() {
  if (winOpen || !dom() || !win) return;
  winOpen = true;
  openedAt = nowMs();
  renderWindow();
  win.classList.add('show');
  win.setAttribute('aria-hidden', 'false');
  deps.onOpen?.();
}
export function closeSkillWindow() {
  if (!winOpen || !dom() || !win) return;
  winOpen = false;
  win.classList.remove('show');
  win.setAttribute('aria-hidden', 'true');
  deps.onClose?.();
}
// 스크림·닫기 버튼 전용 닫기 — 여는 탭(pointerdown)의 잔여 click/pointerup 이
// 곧바로 스크림에 닿아 스킬창을 닫아버리는 모바일 버그를 막는다(여는 직후 350ms 무시).
function closeSkillWindowFromUI() {
  if (nowMs() - openedAt < 350) return;
  closeSkillWindow();
}
export function toggleSkillWindow() {
  if (winOpen) closeSkillWindow();
  else openSkillWindow();
}

// ── 렌더 ────────────────────────────────────────────────────────
// 중앙 하단 스킬바 — 4개 장착 슬롯(아이콘 + 단축키 1~4).
function renderBar() {
  if (!dom() || !bar) return;
  bar.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const skill = skillById(equipped[i]);
    const slot = document.createElement('button');
    slot.className = 'skill-slot' + (skill ? ' filled' : '');
    slot.setAttribute('data-slot', String(i));
    slot.type = 'button';
    slot.innerHTML =
      `<span class="ss-key">${i + 1}</span>` +
      `<span class="ss-icon">${skill ? skill.icon : ''}</span>`;
    slot.setAttribute('aria-label', skill ? `${skill.name} (${i + 1}번)` : `빈 슬롯 ${i + 1}`);
    slot.addEventListener('pointerdown', (e) => { e.preventDefault(); activateSkillSlot(i); });
    bar.appendChild(slot);
  }
  // 스킬창 열기 버튼은 따로 두지 않는다 — 데스크톱은 K 키, 모바일은 ☰ 통합 메뉴 → '스킬창' 항목.
}

// 스킬창 — 장착 슬롯(선택/해제) + 보유 스킬 카탈로그.
function renderWindow() {
  if (!dom()) return;
  if (winSlots) {
    winSlots.innerHTML = '';
    for (let i = 0; i < SLOTS; i++) {
      const skill = skillById(equipped[i]);
      const slot = document.createElement('div');
      slot.className = 'sw-slot' + (skill ? ' filled' : '') + (i === selSlot ? ' sel' : '');
      slot.innerHTML =
        `<span class="sw-slot-key">${i + 1}</span>` +
        `<span class="sw-slot-icon">${skill ? skill.icon : ''}</span>` +
        (skill ? '<button class="sw-slot-clear" type="button" aria-label="해제">✕</button>' : '');
      slot.addEventListener('click', () => { selSlot = i; renderWindow(); });
      slot.querySelector('.sw-slot-clear')?.addEventListener('click', (e) => {
        e.stopPropagation();
        equipped[i] = null;
        renderBar(); renderWindow();
      });
      winSlots.appendChild(slot);
    }
  }
  if (winCatalog) {
    winCatalog.innerHTML = '';
    for (const skill of SKILL_CATALOG) {
      const card = document.createElement('button');
      card.className = 'sw-card' + (equipped.includes(skill.id) ? ' equipped' : '');
      card.type = 'button';
      card.innerHTML =
        `<span class="sw-card-icon">${skill.icon}</span>` +
        `<span class="sw-card-name">${skill.name}</span>` +
        `<span class="sw-card-desc">${skill.desc}</span>`;
      card.addEventListener('click', () => {
        // 중복 장착 금지 — 같은 스킬이 다른 슬롯에 있으면 비우고(이동) 선택 슬롯에 장착.
        for (let s = 0; s < SLOTS; s++) if (s !== selSlot && equipped[s] === skill.id) equipped[s] = null;
        equipped[selSlot] = skill.id;
        renderBar(); renderWindow();
      });
      winCatalog.appendChild(card);
    }
  }
}
