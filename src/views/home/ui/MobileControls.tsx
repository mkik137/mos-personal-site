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
      <button id="bag-btn" aria-label="가방 열기">
        🎒
      </button>
    </>
  );
}
