import "./InventoryPanel.css";

// 인벤토리(가방) 창 — world 엔진(inventory.ts)이 .show 토글 + 슬롯을 명령형으로 채운다.
// I 키로 열고 닫는다. (world.ts bindEvents 의 KeyI 분기)
export default function InventoryPanel() {
  return (
    <div id="inventory" aria-hidden="true" aria-label="가방">
      <div className="inv-scrim" data-inv-close />
      <div className="inv-window" role="dialog" aria-modal="true">
        <div className="inv-head">
          <span className="inv-title">
            <span className="inv-bag">🎒</span> 가방
          </span>
          <span className="inv-count" id="inv-count" />
          <button className="inv-close" type="button" data-inv-close>
            닫기 <kbd>I</kbd>
          </button>
        </div>
        <div className="inv-grid" id="inv-grid" />
        <div className="inv-detail" id="inv-detail">
          <p className="inv-d-empty">아이템을 선택하면 설명이 보여요.</p>
        </div>
      </div>
    </div>
  );
}
