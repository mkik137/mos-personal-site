export default function AboutPanel() {
  return (
    <section className="panel" id="panel-about">
      <div className="panel-head">
        <span className="panel-eyebrow">— 가람 / 소개</span>
        <button className="panel-close" data-close>
          닫기 <span>✕</span>
        </button>
      </div>
      <div className="panel-body">
        <p className="kicker">Creative Technologist · Seoul, KR</p>
        <h1 className="title">
          안녕하세요,
          <br />
          저는 가람입니다.
        </h1>
        <p className="lead">
          화면 위에서 움직이는 것들을 만듭니다. 코드와 디자인 사이, 인터랙션이 일어나는
          자리에서 작업해요. 정적인 화면을 믿지 않습니다 — 좋은 인터페이스는 반응하고, 숨
          쉬고, 기억에 남아야 한다고 생각합니다.
        </p>

        <hr className="rule" />

        <div className="stat-row">
          <div className="stat">
            <div className="n">8<em>+</em></div>
            <div className="l">YEARS<br />EXPERIENCE</div>
          </div>
          <div className="stat">
            <div className="n">40<em>+</em></div>
            <div className="l">PROJECTS<br />SHIPPED</div>
          </div>
          <div className="stat">
            <div className="n">12</div>
            <div className="l">AWARDS &amp;<br />FEATURES</div>
          </div>
        </div>

        <hr className="rule" />

        <p className="kicker" style={{ marginBottom: 14 }}>— 연혁 / 학력</p>
        <div className="tl">
          <div className="row">
            <div className="yr">2024 —</div>
            <div>
              <h4>프리랜스 크리에이티브 디벨로퍼</h4>
              <p>브랜드 웹사이트와 인터랙티브 설치 작업. WebGL·모션 중심.</p>
            </div>
          </div>
          <div className="row">
            <div className="yr">2021–24</div>
            <div>
              <h4>스튜디오 노이즈 · 인터랙션 디자이너</h4>
              <p>디지털 캠페인·전시 콘텐츠 개발, 프론트엔드 팀 리드.</p>
            </div>
          </div>
          <div className="row">
            <div className="yr">2018–21</div>
            <div>
              <h4>한국예술종합대학교</h4>
              <p>시각디자인 / 컴퓨터공학 복수전공 · 졸업작품 우수상.</p>
            </div>
          </div>
          <div className="row">
            <div className="yr">2015–18</div>
            <div>
              <h4>서울예술고등학교 · 미술과</h4>
              <p>회화와 조형으로 시각 언어의 기초를 다진 시기.</p>
            </div>
          </div>
        </div>

        <hr className="rule" />
        <p className="kicker">— 더 보기</p>
        <p className="lead" style={{ marginTop: 12 }}>
          스튜디오에 들어가면 작업과 경력을, 방명록 키오스크에서 한마디를 남길 수 있어요.
          섬을 천천히 둘러보세요. 🌿
        </p>
      </div>
    </section>
  );
}
