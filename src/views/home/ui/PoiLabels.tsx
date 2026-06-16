import "./PoiLabels.css";

export default function PoiLabels() {
  return (
    <div id="labels">
      {/* 가람은 NPC 라 머리 위 이름표(3D)로 표시 — 건물용 떠다니는 칩은 두지 않는다. */}
      <div className="poi-label" data-poi="work">
        <span className="chip">
          <span className="dot" /> 작업 &amp; 경력 <span className="sub">WORK</span>
        </span>
        <span className="tail" />
      </div>
      <div className="poi-label" data-poi="guestbook">
        <span className="chip">
          <span className="dot" /> 방명록 <span className="sub">GUESTBOOK</span>
        </span>
        <span className="tail" />
      </div>
      <div className="poi-label" data-poi="garam-house">
        <span className="chip">
          <span className="dot" /> 가람이의 집 <span className="sub">HOME</span>
        </span>
        <span className="tail" />
      </div>
    </div>
  );
}
