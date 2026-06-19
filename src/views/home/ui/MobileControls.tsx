import "./MobileControls.css";

export default function MobileControls() {
  return (
    <>
      <div id="joy">
        <span className="nub" />
      </div>
      <button id="act-btn" aria-label="상호작용">
        ✋
      </button>
      <button id="jump-btn" aria-label="점프">
        {/* 점프하는 사람 아이콘 (MingCute, Apache-2.0) — public/icons/jump.svg */}
        <img className="jb-svg" src="/icons/jump.svg" alt="" aria-hidden="true" />
      </button>
      {/* ☰ 통합 메뉴 — 탭하면 가방·스킬창·안내서가 펼쳐진다 (하단 버튼 수를 줄이기 위함).
          팝업 토글·항목 동작은 world.ts bindEvents 에서 연결. */}
      <button id="menu-btn" aria-label="메뉴">
        ☰
      </button>
      <div id="menu-pop" aria-hidden="true">
        <button className="menu-item" type="button" data-menu="bag">
          <span className="mi-ic">🎒</span> 가방
        </button>
        <button className="menu-item" type="button" data-menu="skill">
          <span className="mi-ic">🪄</span> 스킬창
        </button>
        <button className="menu-item" type="button" data-menu="help">
          <span className="mi-ic">📖</span> 안내서
        </button>
      </div>
    </>
  );
}
