import "./Minimap.css";

// 우측 미니맵 — 지도 아이템을 가지고 있을 때 표시. world 엔진(inventory.updateMinimap)이
// 베이스 지도(#minimap-img)를 채우고 내 위치 점(#minimap-player)을 매 프레임 옮긴다.
export default function Minimap() {
  return (
    <div id="minimap" aria-hidden="true" aria-label="미니맵">
      <img id="minimap-img" className="mm-base" alt="" />
      <div id="minimap-player" className="mm-dot" />
      <span className="mm-label">현위치</span>
    </div>
  );
}
