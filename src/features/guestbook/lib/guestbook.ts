// @ts-nocheck
// Ported from assets/guestbook.js — sets window.__initGuestbook on load.
// ─────────────────────────────────────────────
//  guestbook.js — localStorage mock board (panel)
//  exposes window.__initGuestbook() — runs once when panel opens
// ─────────────────────────────────────────────
(function () {
  const KEY = 'hg_guestbook_v1';
  const PALETTE = ['#ff5b35', '#2f6bff', '#caa24a', '#2bb673', '#a855f7'];

  const seed = [
    { name: '도윤',  msg: '漂流 작업 라이브로 봤는데 진짜 숨 막혔어요. 파티클이 음악 따라 흐르는 거 어떻게 한 거예요…', t: Date.now() - 36e5 * 26 },
    { name: 'minji', msg: '월드 돌아다니는 거 너무 귀여워요. 가람이한테 말 걸었더니 소개가 떠서 깜짝 ㅋㅋ', t: Date.now() - 36e5 * 50 },
    { name: '준',    msg: '結 프로젝트에서 노드 2만 개를 부드럽게 돌린 비결이 궁금합니다. 커피 한 잔 사고 싶네요!', t: Date.now() - 36e5 * 96 },
    { name: 'Elena', msg: 'Walked into the studio and the whole vibe is so warm. Beautiful little world!', t: Date.now() - 36e5 * 140 },
  ];

  let entries = null;
  let inited = false;

  window.__initGuestbook = function () {
    if (inited) return;
    inited = true;

    entries = load();
    const form = document.getElementById('gb-form');
    const nameIn = document.getElementById('gb-name');
    const msgIn = document.getElementById('gb-msg');
    const msgCount = document.getElementById('gb-msgcount');

    render();

    msgIn.addEventListener('input', () => { msgCount.textContent = `${msgIn.value.length} / 280`; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameIn.value.trim() || '익명의 방문자';
      const msg = msgIn.value.trim();
      if (!msg) { msgIn.focus(); return; }
      entries.unshift({ name, msg, t: Date.now() });
      save();
      nameIn.value = ''; msgIn.value = ''; msgCount.textContent = '0 / 280';
      render(true);
      // 퀘스트 체인 엔딩 훅 — 마지막 단계에서 방명록을 남기면 엔딩 연출.
      window.__onGuestbookSubmit?.();
    });
  };

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return seed.slice();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch (e) {} }

  function initials(n) { return (n.trim()[0] || '?').toUpperCase(); }
  function colorFor(n) { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
  function timeAgo(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return '방금 전';
    const m = Math.floor(s / 60); if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24); if (d < 30) return `${d}일 전`;
    return new Date(t).toLocaleDateString('ko-KR');
  }
  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function render(animateFirst = false) {
    const listEl = document.getElementById('gb-list');
    const countEl = document.getElementById('gb-count');
    countEl.textContent = String(entries.length).padStart(2, '0');
    listEl.innerHTML = '';
    if (!entries.length) {
      listEl.innerHTML = '<p style="color:var(--muted);font-family:Space Mono,monospace;font-size:.85rem;padding:30px 0;text-align:center">아직 남겨진 글이 없습니다. 첫 흔적을 남겨보세요.</p>';
      return;
    }
    entries.forEach((en, i) => {
      const col = colorFor(en.name);
      const card = document.createElement('article');
      card.className = 'gb-card' + (animateFirst && i === 0 ? ' gb-new' : '');
      card.innerHTML = `
        <div class="top">
          <span class="av" style="background:${col}">${esc(initials(en.name))}</span>
          <div style="min-width:0">
            <div class="nm">${esc(en.name)}</div>
            <div class="tm">${timeAgo(en.t)}</div>
          </div>
        </div>
        <p>${esc(en.msg)}</p>`;
      listEl.appendChild(card);
    });
  }
})();

export {};
