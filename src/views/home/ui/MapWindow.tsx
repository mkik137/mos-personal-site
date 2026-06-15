import "./MapWindow.css";

// 별도 지도창 — 인벤토리에서 '지도' 아이템을 누르면 world 엔진(inventory.ts)이 .show 토글.
// 지도 이미지(#mw-map-img)는 inventory.ts 가 캔버스로 그려 src 를 채운다.
export default function MapWindow() {
  return (
    <div id="map-window" aria-hidden="true" aria-label="가람의 섬 지도">
      <div className="mw-scrim" data-map-close />
      <div className="mw-panel" role="dialog" aria-modal="true">
        <div className="mw-head">
          <span className="mw-title">
            <span className="mw-icon">🗺️</span> 가람의 섬 지도
          </span>
          <button className="mw-close" type="button" data-map-close>
            닫기 <kbd>Esc</kbd>
          </button>
        </div>
        <img className="mw-map" id="mw-map-img" alt="가람의 섬 지도" />
        <p className="mw-desc">광장을 중심으로 길을 따라 마을 곳곳을 둘러볼 수 있어요.</p>
      </div>
    </div>
  );
}
