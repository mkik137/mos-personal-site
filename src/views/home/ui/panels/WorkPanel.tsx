import "./WorkPanel.css";

export default function WorkPanel() {
  return (
    <section className="panel" id="panel-work">
      <div className="panel-head">
        <span className="panel-eyebrow">— 작업 &amp; 경력</span>
        <button className="panel-close" data-close>
          닫기 <span>✕</span>
        </button>
      </div>
      <div className="panel-body">
        <p className="kicker">Selected Work · 2023—2025</p>
        <h1 className="title">작업 &amp; 경력</h1>
        <p className="lead">
          디자인과 코드 사이에서 만든 인터랙티브 작업들. 아래는 직접 설계·개발한 대표
          프로젝트입니다.
        </p>

        <hr className="rule" />

        <article className="proj" id="proj-0">
          <div className="shot">
            <span className="idx">01</span>
            <span className="cap">漂流 / DRIFT — WebGL · 2025</span>
          </div>
          <div className="meta">
            <h3>漂流 — Drift</h3>
            <div className="role">REAL-TIME SOUND VISUALIZER · 기획·디자인·개발</div>
            <p>
              마이크 입력을 실시간 분석해 수백만 개의 파티클이 물결처럼 흐르는 제너러티브
              비주얼라이저. 라이브 공연 백드롭으로 제작.
            </p>
            <div className="tags">
              <span>Three.js</span>
              <span>GLSL</span>
              <span>Web Audio API</span>
            </div>
          </div>
        </article>

        <article className="proj" id="proj-1">
          <div className="shot">
            <span className="idx">02</span>
            <span className="cap">結 / KNOT — D3 · 2024</span>
          </div>
          <div className="meta">
            <h3>結 — Knot</h3>
            <div className="role">INTERACTIVE NETWORK GRAPH · 데이터·프론트엔드</div>
            <p>
              문화예술계 인물·기관의 협업 관계를 잇는 인터랙티브 그래프. 2만여 노드를
              부드럽게 탐색하도록 물리 시뮬레이션과 LOD 렌더링을 구현.
            </p>
            <div className="tags">
              <span>D3.js</span>
              <span>Canvas</span>
              <span>TypeScript</span>
            </div>
          </div>
        </article>

        <article className="proj" id="proj-2">
          <div className="shot">
            <span className="idx">03</span>
            <span className="cap">餘白 / MARGIN — SITE · 2023</span>
          </div>
          <div className="meta">
            <h3>餘白 — Margin</h3>
            <div className="role">BRAND CAMPAIGN MICROSITE · 아트디렉션·개발</div>
            <p>
              &apos;여백&apos;을 주제로 한 가구 브랜드 시즌 캠페인. 스크롤에 따라 제품이 비워지고
              채워지는 시퀀스를 스크롤리텔링으로 구성.
            </p>
            <div className="tags">
              <span>GSAP</span>
              <span>Lenis</span>
              <span>Next.js</span>
            </div>
          </div>
        </article>

        <article className="proj" id="proj-3">
          <div className="shot">
            <span className="idx">04</span>
            <span className="cap">巡 / TOUR — WEBGL · 2025</span>
          </div>
          <div className="meta">
            <h3>巡 — Tour</h3>
            <div className="role">INTERACTIVE WORLD ENGINE · 기획·디자인·개발</div>
            <p>
              지금 둘러보고 있는 이 섬. Three.js 로 직접 만든 3D 월드 엔진 위에 NPC·퀘스트·실내
              씬을 얹은 인터랙티브 포트폴리오. 걸어다니며 작업과 경력을 만난다.
            </p>
            <div className="tags">
              <span>Three.js</span>
              <span>Next.js</span>
              <span>FSD</span>
            </div>
          </div>
        </article>

        <hr className="rule" />

        <p className="kicker" style={{ marginBottom: 14 }}>— 경력</p>
        <div className="tl">
          <div className="row">
            <div className="yr">2024 —</div>
            <div>
              <h4>프리랜스 크리에이티브 디벨로퍼</h4>
              <p>독립 작업 · 브랜드 / 전시</p>
            </div>
          </div>
          <div className="row">
            <div className="yr">2021–24</div>
            <div>
              <h4>스튜디오 노이즈 · 인터랙션 디자이너</h4>
              <p>프론트엔드 팀 리드 · Seoul</p>
            </div>
          </div>
          <div className="row">
            <div className="yr">2018–21</div>
            <div>
              <h4>한국예술종합대학교</h4>
              <p>시각디자인 / 컴퓨터공학 복수전공</p>
            </div>
          </div>
        </div>

        <hr className="rule" />

        <p className="kicker" style={{ marginBottom: 14 }}>— 다루는 도구</p>
        <div className="skills">
          <div className="cell">
            <div className="h">CREATIVE CODE</div>
            <ul>
              <li>Three.js / WebGL</li>
              <li>GLSL Shaders</li>
              <li>Canvas / SVG</li>
              <li>GSAP</li>
            </ul>
          </div>
          <div className="cell">
            <div className="h">FRONTEND</div>
            <ul>
              <li>TypeScript</li>
              <li>React / Next.js</li>
              <li>Tailwind CSS</li>
              <li>Vite</li>
            </ul>
          </div>
          <div className="cell">
            <div className="h">DESIGN</div>
            <ul>
              <li>Figma</li>
              <li>Blender</li>
              <li>아트디렉션</li>
              <li>모션</li>
            </ul>
          </div>
        </div>

        <hr className="rule" />
        <p className="kicker">— 함께 만들어요</p>
        <a className="cta-mail" href="mailto:hello@example.com">
          hello@example.com
        </a>
        <div className="social">
          <a href="#">GITHUB</a>
          <a href="#">INSTAGRAM</a>
          <a href="#">LINKEDIN</a>
        </div>
      </div>
    </section>
  );
}
