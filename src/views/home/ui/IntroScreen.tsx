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
        <p className="credits">
          3D models:{" "}
          <a href="https://poly.pizza/u/J-Toastie" target="_blank" rel="noreferrer">
            J-Toastie
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/4C84tfa0NdC" target="_blank" rel="noreferrer">
            Khor Chin Heong
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/4KKY7CmNe_r" target="_blank" rel="noreferrer">
            Poly by Google
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/OhXey2fljr" target="_blank" rel="noreferrer">
            Zsky
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/6ijQclm8jxw" target="_blank" rel="noreferrer">
            Jeremy Eyring
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/cA_lcvRC4NA" target="_blank" rel="noreferrer">
            Bruno Oliveira
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/1lXSlSX7KrD" target="_blank" rel="noreferrer">
            Seth Plechas
          </a>
          ,{" "}
          <a href="https://poly.pizza/m/1aw3zdwyJo" target="_blank" rel="noreferrer">
            Nick Slough
          </a>{" "}
          (CC-BY 3.0) · Quaternius · Kay Lousberg —{" "}
          <a href="https://poly.pizza" target="_blank" rel="noreferrer">
            poly.pizza
          </a>
        </p>
      </div>
    </div>
  );
}
