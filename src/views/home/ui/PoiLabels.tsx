import "./PoiLabels.css";

export default function PoiLabels() {
  return (
    <div id="labels">
      <div className="poi-label" data-poi="about">
        <span className="chip">
          <span className="dot" /> 가람 <span className="sub">SAY HELLO</span>
        </span>
        <span className="tail" />
      </div>
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
    </div>
  );
}
