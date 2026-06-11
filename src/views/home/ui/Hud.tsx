import "./Hud.css";

export default function Hud() {
  return (
    <>
      <div className="hud" id="hud-brand">
        <span className="seal" /> 가람의 섬
      </div>

      <div className="hud" id="hud-help">
        <span className="k">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> 이동
        </span>
        <span className="k">
          <kbd>Shift</kbd> 달리기
        </span>
        <span className="k">
          <kbd>Space</kbd> 점프
        </span>
        <span className="k">
          <kbd>드래그</kbd> 회전
        </span>
        <span className="k">
          <kbd>E</kbd> 상호작용
        </span>
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
      </div>
    </>
  );
}
