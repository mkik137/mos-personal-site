import "./Hud.css";

export default function Hud() {
  return (
    <>
      <div className="hud" id="hud-brand">
        <span className="seal" /> 가람의 섬
      </div>

      <div className="hud" id="hud-dir">
        <div className="row">
          <span className="pin" /> 가람에게 말 걸기 — 소개
        </div>
        <div className="row">
          <span className="pin b" /> 작업 &amp; 경력 둘러보기
        </div>
        <div className="row">
          <span className="pin g" /> 방명록 — 흔적 남기기
        </div>
        <div className="row">
          <span className="pin h" /> 가람이의 집 — 방 구경하기
        </div>
      </div>
    </>
  );
}
