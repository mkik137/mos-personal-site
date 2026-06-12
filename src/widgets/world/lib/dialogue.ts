// @ts-nocheck
// ─────────────────────────────────────────────
//  dialogue — 자막 대화 엔진 (타이핑 연출 · 예/아니오 선택지 · 화자 색상)
//  월드와의 결합(이동 정지·프롬프트 복원·패널 오픈)은 initDialogue 훅으로 주입받는다.
// ─────────────────────────────────────────────
import { SPEAKER_COLORS } from './dialogueLines';

// { onOpen: 대화 시작(이동 정지 등), onClosed: 대화 종료(이동 재개·프롬프트 복원),
//   openPanel: poi 패널 열기 (가람 소개 등 대화 후 패널로 이어질 때) }
let hooks = { onOpen: () => {}, onClosed: () => {}, openPanel: () => {} };
let dialogue = null; // { lines, index, poi, onEnd, choices, choosing, selected, typing, full, timer }

export function initDialogue(h): void {
  hooks = h;
}

export const dialogueActive = () => !!dialogue;
export const dialogueChoosing = () => !!dialogue?.choosing;

// 공용 자막 대화 오픈 — poi 가 있으면 종료 후 해당 패널을 연다(가람 소개).
// choices: [{ label, onPick }] — 마지막 줄이 끝나면 선택지를 띄운다.
export function openDialogue(lines, name, { poi = null, onEnd = null, choices = null } = {}): void {
  hooks.onOpen();
  const dlg = document.getElementById('npc-dialogue');
  dlg?.classList.remove('choosing');
  dlg?.style.setProperty('--dlg-accent', SPEAKER_COLORS[name] || '#ff5b35');
  const nameEl = document.querySelector('#npc-dialogue .dlg-name');
  if (nameEl) nameEl.textContent = name;
  dialogue = { lines, index: -1, poi, onEnd, choices, choosing: false, selected: 0, typing: false, full: '', timer: 0 };
  dlg?.classList.add('show');
  nextDialogueLine();
}

// E / 클릭: 타이핑 중이면 즉시 완성, 아니면 다음 줄 (끝이면 패널 오픈)
export function advanceDialogue(): void {
  if (!dialogue) return;
  if (dialogue.choosing) return; // 선택지 표시 중엔 버튼/키로만 진행
  if (dialogue.typing) { finishTyping(); return; }
  nextDialogueLine();
}

export function endDialogue(): void {
  const d = dialogue;
  if (d) clearInterval(d.timer);
  const dlg = document.getElementById('npc-dialogue');
  dlg?.classList.remove('show');
  dlg?.classList.remove('choosing');
  dialogue = null;
  if (d?.poi) hooks.openPanel(d.poi); // 가람: 대화가 끝나면 소개 패널 오픈
  else hooks.onClosed();
  d?.onEnd?.();
}

// ── 선택지 (예/아니오) ──
export function moveChoice(dir): void {
  if (!dialogue?.choosing) return;
  dialogue.selected = (dialogue.selected + dir + dialogue.choices.length) % dialogue.choices.length;
  updateChoiceSel();
}

export function pickChoice(i): void {
  if (!dialogue?.choosing) return;
  const choice = dialogue.choices[i];
  document.getElementById('npc-dialogue')?.classList.remove('choosing');
  dialogue = null; // onPick 이 새 대화를 열거나, 아니면 그대로 닫힌 상태
  choice.onPick();
}

// 키보드 확정용 — 현재 하이라이트된 선택지를 고른다.
export function pickSelected(): void {
  if (dialogue?.choosing) pickChoice(dialogue.selected);
}

function showChoices() {
  dialogue.choosing = true;
  dialogue.selected = 0;
  const btns = document.querySelectorAll('#npc-dialogue .dlg-choice');
  dialogue.choices.forEach((c, i) => { if (btns[i]) btns[i].textContent = c.label; });
  document.getElementById('npc-dialogue')?.classList.add('choosing');
  updateChoiceSel();
}

function updateChoiceSel() {
  document.querySelectorAll('#npc-dialogue .dlg-choice').forEach((b, i) => {
    b.classList.toggle('sel', i === dialogue?.selected);
  });
}

function nextDialogueLine() {
  dialogue.index++;
  if (dialogue.index >= dialogue.lines.length) {
    if (dialogue.choices && !dialogue.choosing) { showChoices(); return; }
    endDialogue();
    return;
  }
  typeLine(dialogue.lines[dialogue.index]);
}

function typeLine(text) {
  const el = document.querySelector('#npc-dialogue .dlg-text');
  if (!el) return;
  clearInterval(dialogue.timer);
  dialogue.full = text;
  dialogue.typing = true;
  el.textContent = '';
  let i = 0;
  dialogue.timer = window.setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(dialogue.timer); dialogue.typing = false; }
  }, 32);
}

function finishTyping() {
  if (!dialogue) return;
  clearInterval(dialogue.timer);
  const el = document.querySelector('#npc-dialogue .dlg-text');
  if (el) el.textContent = dialogue.full;
  dialogue.typing = false;
}
