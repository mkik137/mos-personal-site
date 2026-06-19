import "./SkillWindow.css";

// 스킬창 — K 키로 열어 보유 스킬을 슬롯에 장착. world 엔진(skills.ts)이 .show 토글 +
// 슬롯/카탈로그를 명령형으로 채운다. (slots → #sw-slots, 카탈로그 → #sw-catalog)
export default function SkillWindow() {
  return (
    <div id="skill-window" aria-hidden="true" aria-label="스킬창">
      <div className="sw-scrim" data-skill-close />
      <div className="sw-panel" role="dialog" aria-modal="true">
        <div className="sw-head">
          <span className="sw-title">
            <span className="sw-star">✨</span> 스킬
          </span>
          <button className="sw-close" type="button" data-skill-close>
            닫기 <kbd>K</kbd>
          </button>
        </div>
        <div className="sw-label">장착 슬롯</div>
        <div id="sw-slots" className="sw-slots" />
        <div className="sw-label">보유 스킬</div>
        <div id="sw-catalog" className="sw-catalog" />
        <p className="sw-hint">슬롯을 고른 뒤 아래 스킬을 누르면 장착돼요. 슬롯의 ✕ 로 해제.</p>
      </div>
    </div>
  );
}
