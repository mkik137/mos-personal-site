import "./HelpWindow.css";

// 조작 안내 책 — 인벤토리에서 '안내서' 아이템을 누르면 world 엔진(inventory.ts)이 .show 토글.
// (지도창과 동일한 모달 패턴 — 정적 내용이라 엔진은 열고/닫기만 한다.)
// 데스크톱은 키보드 안내(.hw-desktop), 모바일(body.touch)은 조이스틱·버튼 안내(.hw-touch)로 교체.
export default function HelpWindow() {
  return (
    <div id="help-window" aria-hidden="true" aria-label="조작 안내">
      <div className="hw-scrim" data-help-close />
      <div className="hw-panel" role="dialog" aria-modal="true">
        <div className="hw-head">
          <span className="hw-title">
            <span className="hw-icon">📖</span> 조작 안내
          </span>
          <button className="hw-close" type="button" data-help-close>
            닫기 <kbd>Esc</kbd>
          </button>
        </div>

        {/* ── 데스크톱(키보드) ── */}
        <ul className="hw-list hw-desktop">
          <li>
            <span className="hw-keys">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
            </span>
            <span className="hw-desc">이동 (방향키도 가능)</span>
          </li>
          <li>
            <span className="hw-keys"><kbd>Shift</kbd></span>
            <span className="hw-desc">달리기</span>
          </li>
          <li>
            <span className="hw-keys"><kbd>드래그</kbd></span>
            <span className="hw-desc">시점 회전</span>
          </li>
          <li>
            <span className="hw-keys"><kbd>E</kbd></span>
            <span className="hw-desc">대화 · 입장 · 상호작용</span>
          </li>
          <li>
            <span className="hw-keys">
              <kbd>1</kbd>
              <kbd>2</kbd>
              <kbd>3</kbd>
              <kbd>4</kbd>
            </span>
            <span className="hw-desc">스킬 시전 (시전 중엔 이동 불가)</span>
          </li>
          <li>
            <span className="hw-keys"><kbd>K</kbd></span>
            <span className="hw-desc">스킬창 — 스킬 장착</span>
          </li>
          <li>
            <span className="hw-keys"><kbd>I</kbd></span>
            <span className="hw-desc">가방 (인벤토리)</span>
          </li>
        </ul>

        {/* ── 모바일(터치) ── */}
        <ul className="hw-list hw-touch">
          <li>
            <span className="hw-keys"><span className="hw-chip">🕹️</span></span>
            <span className="hw-desc">왼쪽 조이스틱으로 이동</span>
          </li>
          <li>
            <span className="hw-keys"><span className="hw-chip">🖐️ 드래그</span></span>
            <span className="hw-desc">화면을 끌어 시점 회전</span>
          </li>
          <li>
            <span className="hw-keys"><span className="hw-chip">✋</span></span>
            <span className="hw-desc">대화 · 입장 · 상호작용</span>
          </li>
          <li>
            <span className="hw-keys"><span className="hw-chip">🔥 스킬</span></span>
            <span className="hw-desc">우하단 스킬 버튼으로 시전 (시전 중엔 이동 불가)</span>
          </li>
          <li>
            <span className="hw-keys"><span className="hw-chip">☰ 메뉴</span></span>
            <span className="hw-desc">우상단 메뉴 → 가방 · 스킬창(장착) · 안내서</span>
          </li>
        </ul>

        <p className="hw-foot hw-desktop">
          가방·스킬창·안내서는 <kbd>I</kbd>·<kbd>K</kbd> 또는 우상단 ☰ 메뉴로 열 수 있어요.
        </p>
        <p className="hw-foot hw-touch">
          스킬은 우하단 🔥 버튼으로 쓰고, 가방·스킬창은 우상단 ☰ 메뉴에서 열어요.
        </p>
      </div>
    </div>
  );
}
