import "./IntroScreen.css";

export default function IntroScreen() {
  return (
    <div id="intro">
      <div className="card">
        <div className="badge">An explorable portfolio</div>
        <h1>
          가람의 섬에
          <br />
          오신 걸 환영해요
        </h1>
        <p>작은 섬을 걸어다니며 가람을 만나고, 작업 &amp; 경력과 방명록을 둘러보세요.</p>
        <div className="keys">
          <span className="item">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> 이동
          </span>
          <span className="item">
            <kbd>Shift</kbd> 달리기
          </span>
          <span className="item">
            <kbd>Space</kbd> 점프
          </span>
          <span className="item">
            <kbd>드래그</kbd> 시점 회전
          </span>
          <span className="item">
            <kbd>E</kbd> 대화 / 입장
          </span>
        </div>
        <button className="start" id="start-btn">
          섬 둘러보기 <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}
