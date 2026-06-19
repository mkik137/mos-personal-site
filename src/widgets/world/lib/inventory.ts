// @ts-nocheck
// ─────────────────────────────────────────────
//  inventory — I 키로 여는 가방(인벤토리) 창
//  모델(아이템 목록)을 들고, #inventory DOM 을 명령형으로 갱신한다.
//  월드 훅(onOpen/onClose: 플레이어 정지·프롬프트 숨김 등)은 initInventory 로 주입.
//  '지도' 아이템 선택 시 우리 마을 지도를 캔버스로 그려 보여준다.
// ─────────────────────────────────────────────
import { ISLAND_R } from './constants';
import { PATHS, pathPoints } from './layout';

const SLOTS = 20; // 고정 슬롯 수 (빈 칸 포함 격자)

// ── 우리 마을 지도 (지도 아이템 선택 시 표시) — 실제 월드 좌표로 그린다 ──
const MAP_POIS = [
  { x: 0,      z: 0,     label: '광장',     dot: '#ff5b35' },
  { x: 0,      z: -21.5, label: '가람',     dot: '#ff5b35' },
  { x: -26.25, z: 21,    label: '스튜디오', dot: '#2f6bff' },
  { x: 21,     z: 10.5,  label: '방명록',   dot: '#2bb673' },
  { x: -28.5,  z: -18,   label: '가람의 집', dot: '#caa24a' },
  { x: -7.5,   z: 31.5,  label: '마켓',     dot: '#e8743b' },
  { x: -16,    z: 21,    label: '과수원',   dot: '#3aa55a' },
];
let mapURL = null; // 한 번만 그려 캐시

function villageMapURL() {
  if (mapURL) return mapURL;
  const CW = 360, PAD = 24, dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CW * dpr; cv.height = CW * dpr;
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const cx = CW / 2, cy = CW / 2;
  const s = (CW / 2 - PAD) / ISLAND_R;
  const X = (wx) => cx + wx * s;
  const Y = (wz) => cy + wz * s; // 월드 -z = 북(위)

  // 바다
  c.fillStyle = '#a9dcef'; c.fillRect(0, 0, CW, CW);
  // 섬(잔디) + 해안 모래
  c.beginPath(); c.arc(cx, cy, ISLAND_R * s, 0, Math.PI * 2);
  c.fillStyle = '#9fd17a'; c.fill();
  c.lineWidth = 5; c.strokeStyle = '#e7d6a8'; c.stroke();
  // 길
  c.strokeStyle = '#dccfa3'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of PATHS) {
    const pts = pathPoints(p);
    c.beginPath();
    pts.forEach(([wx, wz], i) => (i ? c.lineTo(X(wx), Y(wz)) : c.moveTo(X(wx), Y(wz))));
    c.stroke();
  }
  // 광장
  c.beginPath(); c.arc(cx, cy, 9.6 * s, 0, Math.PI * 2);
  c.fillStyle = '#efe3c3'; c.fill();
  c.lineWidth = 1.5; c.strokeStyle = '#dccfa3'; c.stroke();
  // 마커 + 라벨
  c.textAlign = 'center';
  for (const p of MAP_POIS) {
    const px = X(p.x), py = Y(p.z);
    c.beginPath(); c.arc(px, py, 4.5, 0, Math.PI * 2);
    c.fillStyle = p.dot; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
    c.font = '600 11px Pretendard, sans-serif';
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.strokeText(p.label, px, py - 7); // 가독성 위해 흰 외곽선
    c.fillStyle = '#3b2c18'; c.fillText(p.label, px, py - 7);
  }
  // 나침반 N
  c.font = '700 12px "Noto Serif KR", serif';
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.strokeText('N', cx, 15); c.fillStyle = '#8b3a1d'; c.fillText('N', cx, 15);
  // 프레임
  c.lineWidth = 2; c.strokeStyle = '#6e542f'; c.strokeRect(2, 2, CW - 4, CW - 4);

  mapURL = cv.toDataURL();
  return mapURL;
}

// items: { id, name, icon, count, desc }
const items = [];
let open = false;
let selected = null;        // 선택된 아이템 id (설명 표시용)
let deps = { onOpen() {}, onClose() {} };

// DOM 캐시 (월드 마운트 후 첫 호출 때 조회)
let root = null, grid = null, detail = null, countEl = null;
let mapWin = null, mapImg = null; // 별도 지도창
let helpWin = null;               // 조작 안내 책 창
let minimap = null, mmImg = null, mmDot = null; // 우측 미니맵
function dom() {
  if (!root) {
    root   = document.getElementById('inventory');
    grid   = document.getElementById('inv-grid');
    detail = document.getElementById('inv-detail');
    countEl = document.getElementById('inv-count');
    mapWin = document.getElementById('map-window');
    mapImg = document.getElementById('mw-map-img');
    helpWin = document.getElementById('help-window');
    minimap = document.getElementById('minimap');
    mmImg = document.getElementById('minimap-img');
    mmDot = document.getElementById('minimap-player');
  }
  return root;
}

// 우측 미니맵 — 지도를 가지고 있을 때 표시하고, 내 캐릭터 위치(world x,z)를 점으로 찍는다.
//  show=false(실내 등)면 숨긴다. villageMap 투영(CW=360, PAD=24)과 동일 좌표계.
//  매 프레임 호출되므로 값이 바뀔 때만 DOM 에 쓴다(불필요한 스타일 쓰기 방지).
let mmShown = false, mmLastL = '', mmLastT = '';
export function updateMinimap(x, z, show): void {
  if (!dom() || !minimap) return;
  const want = !!(show && hasItem('map'));
  if (want !== mmShown) { mmShown = want; minimap.classList.toggle('show', want); }
  if (!want || !mmDot) return;
  if (mmImg && !mmImg.getAttribute('src')) mmImg.setAttribute('src', villageMapURL());
  const s = (180 - 24) / ISLAND_R;
  const l = `${(((180 + x * s) / 360) * 100).toFixed(1)}%`;
  const t = `${(((180 + z * s) / 360) * 100).toFixed(1)}%`;
  if (l !== mmLastL) { mmDot.style.left = l; mmLastL = l; }
  if (t !== mmLastT) { mmDot.style.top = t; mmLastT = t; }
}

export function initInventory(d): void {
  deps = { onOpen() {}, onClose() {}, ...d };
  // 시작 아이템 — 섬 지도. (조작 안내서는 ☰ 메뉴 → 안내서 로 이동했으므로 가방에서 제외)
  if (items.length === 0) {
    items.push({
      id: 'map', name: '가람의 섬 지도', icon: '🗺️', count: 1,
      desc: '가람의 섬 전체가 그려진 지도. 슬롯을 누르면 지도창이 열려요.',
    });
  }
  // 닫기 버튼 / 스크림 클릭으로도 닫기
  if (dom()) {
    root.querySelectorAll('[data-inv-close]').forEach((b) =>
      b.addEventListener('click', closeInventory));
    mapWin?.querySelectorAll('[data-map-close]').forEach((b) =>
      b.addEventListener('click', closeMap));
    helpWin?.querySelectorAll('[data-help-close]').forEach((b) =>
      b.addEventListener('click', closeHelp));
  }
  renderGrid();
}

// 아이템 추가 — 같은 id 는 수량만 증가(스택).
export function addItem(item): void {
  const found = items.find((it) => it.id === item.id);
  if (found) found.count += item.count || 1;
  else items.push({ count: 1, ...item });
  renderGrid();
}

// 아이템 제거 — 수량 차감, 0 이하면 슬롯 삭제.
export function removeItem(id, n = 1): void {
  const i = items.findIndex((it) => it.id === id);
  if (i === -1) return;
  items[i].count -= n;
  if (items[i].count <= 0) {
    items.splice(i, 1);
    if (selected === id) selected = null;
  }
  renderGrid();
}

export function hasItem(id): boolean {
  return items.some((it) => it.id === id);
}

export function itemCount(id): number {
  return items.find((it) => it.id === id)?.count ?? 0;
}

export function inventoryOpen(): boolean {
  return open;
}

export function openInventory(): void {
  if (open || !dom()) return;
  open = true;
  selected = selected ?? items[0]?.id ?? null;
  renderGrid();
  root.classList.add('show');
  root.setAttribute('aria-hidden', 'false');
  deps.onOpen();
}

export function closeInventory(): void {
  if (!open || !dom()) return;
  open = false;
  closeMap();  // 지도창이 열려 있으면 함께 닫는다
  closeHelp(); // 안내창도 함께 닫는다
  root.classList.remove('show');
  root.setAttribute('aria-hidden', 'true');
  deps.onClose();
}

// ── 별도 지도창 — 지도 아이템을 누르면 인벤토리 위로 뜬다 ──
export function mapOpen(): boolean {
  return !!mapWin?.classList.contains('show');
}
export function openMap(): void {
  if (!dom() || !mapWin) return;
  if (mapImg && !mapImg.getAttribute('src')) mapImg.setAttribute('src', villageMapURL());
  mapWin.classList.add('show');
  mapWin.setAttribute('aria-hidden', 'false');
}
export function closeMap(): void {
  if (!mapWin) return;
  mapWin.classList.remove('show');
  mapWin.setAttribute('aria-hidden', 'true');
}

// ── 조작 안내 책 창 — 안내서 아이템을 누르면 인벤토리 위로 뜬다 (정적 내용) ──
export function helpOpen(): boolean {
  return !!helpWin?.classList.contains('show');
}
export function openHelp(): void {
  if (!dom() || !helpWin) return;
  helpWin.classList.add('show');
  helpWin.setAttribute('aria-hidden', 'false');
  deps.onHelpOpened?.(); // 적응 훈련 등 외부 훅에 안내서 읽음 알림
}
export function closeHelp(): void {
  if (!helpWin) return;
  helpWin.classList.remove('show');
  helpWin.setAttribute('aria-hidden', 'true');
}

export function toggleInventory(): void {
  if (open) closeInventory();
  else openInventory();
}

// #inv-grid 를 SLOTS 칸으로 다시 그린다 (채워진 칸 + 빈 칸).
function renderGrid() {
  if (!dom() || !grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const it = items[i];
    const slot = document.createElement('button');
    slot.className = 'inv-slot' + (it ? ' filled' : '');
    if (it) {
      if (it.id === selected) slot.classList.add('sel');
      slot.innerHTML =
        `<span class="inv-icon">${it.icon}</span>` +
        (it.count > 1 ? `<span class="inv-qty">${it.count}</span>` : '');
      slot.setAttribute('aria-label', `${it.name} ×${it.count}`);
      slot.addEventListener('click', () => {
        selected = it.id;
        renderGrid();
        if (it.id === 'map') openMap();   // 지도는 별도 창으로
      });
    } else {
      slot.disabled = true;
    }
    grid.appendChild(slot);
  }
  if (countEl) countEl.textContent = `${items.length} / ${SLOTS}`;
  renderDetail();
}

// 선택된 아이템 설명 패널 갱신 (텍스트만 — 지도는 별도 창으로 띄운다).
function renderDetail() {
  if (!detail) return;
  const it = items.find((x) => x.id === selected);
  if (!it) {
    detail.innerHTML = '<p class="inv-d-empty">아이템을 선택하면 설명이 보여요.</p>';
    return;
  }
  detail.innerHTML =
    `<div class="inv-d-name"><span class="inv-d-icon">${it.icon}</span>${it.name}</div>` +
    `<p class="inv-d-desc">${it.desc}</p>`;
}
