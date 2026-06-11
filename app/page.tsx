"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // loader failsafe — never trap the user on the loader
    const failsafe = window.setTimeout(() => {
      document.getElementById("loader")?.classList.add("hide");
    }, 9000);

    // guestbook registers window.__initGuestbook; world boots the 3D scene
    let cancelled = false;
    (async () => {
      await import("@/lib/guestbook");
      const { initWorld } = await import("@/lib/world");
      if (!cancelled) initWorld();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <>
      {/* sky behind transparent canvas */}
      <div id="sky" />
      <canvas id="scene-canvas" />

      {/* floating POI labels (positions driven by lib/world.ts) */}
      <div id="labels">
        <div className="poi-label" data-poi="about">
          <span className="chip">
            <span className="dot" /> 가람 <span className="sub">SAY HELLO</span>
          </span>
          <span className="tail" />
        </div>
        <div className="poi-label" data-poi="work">
          <span className="chip">
            <span className="dot" /> Studio Archive <span className="sub">WORK</span>
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

      {/* HUD */}
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
          <span className="pin b" /> Studio — 작업 &amp; 경력
        </div>
        <div className="row">
          <span className="pin g" /> 방명록 — 흔적 남기기
        </div>
      </div>

      {/* interaction prompt */}
      <div id="prompt">
        <span className="ptxt">상호작용</span>
        <span className="pkey">E</span>
      </div>

      {/* mobile joystick */}
      <div id="joy">
        <span className="nub" />
      </div>
      <button id="jump-btn" aria-label="점프">
        ⤒
      </button>

      {/* ─────────── CONTENT OVERLAY ─────────── */}
      <div id="overlay">
        <div className="scrim" />

        {/* 소개 */}
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
                <div className="n">
                  8<em>+</em>
                </div>
                <div className="l">
                  YEARS
                  <br />
                  EXPERIENCE
                </div>
              </div>
              <div className="stat">
                <div className="n">
                  40<em>+</em>
                </div>
                <div className="l">
                  PROJECTS
                  <br />
                  SHIPPED
                </div>
              </div>
              <div className="stat">
                <div className="n">12</div>
                <div className="l">
                  AWARDS &amp;
                  <br />
                  FEATURES
                </div>
              </div>
            </div>

            <hr className="rule" />

            <p className="kicker" style={{ marginBottom: 14 }}>
              — 연혁 / 학력
            </p>
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

        {/* 작업 & 경력 */}
        <section className="panel" id="panel-work">
          <div className="panel-head">
            <span className="panel-eyebrow">— Studio Archive / 작업 &amp; 경력</span>
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

            <article className="proj">
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

            <article className="proj">
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

            <article className="proj">
              <div className="shot">
                <span className="idx">03</span>
                <span className="cap">餘白 / MARGIN — SITE · 2023</span>
              </div>
              <div className="meta">
                <h3>餘白 — Margin</h3>
                <div className="role">BRAND CAMPAIGN MICROSITE · 아트디렉션·개발</div>
                <p>
                  '여백'을 주제로 한 가구 브랜드 시즌 캠페인. 스크롤에 따라 제품이 비워지고
                  채워지는 시퀀스를 스크롤리텔링으로 구성.
                </p>
                <div className="tags">
                  <span>GSAP</span>
                  <span>Lenis</span>
                  <span>Next.js</span>
                </div>
              </div>
            </article>

            <hr className="rule" />

            <p className="kicker" style={{ marginBottom: 14 }}>
              — 경력
            </p>
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

            <p className="kicker" style={{ marginBottom: 14 }}>
              — 다루는 도구
            </p>
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

        {/* 방명록 */}
        <section className="panel" id="panel-guestbook">
          <div className="panel-head">
            <span className="panel-eyebrow">— Guestbook / 방명록</span>
            <button className="panel-close" data-close>
              닫기 <span>✕</span>
            </button>
          </div>
          <div className="panel-body">
            <p className="kicker">Leave a trace</p>
            <h1 className="title">방명록</h1>
            <p className="lead">
              지나가다 들른 당신의 한마디가 다음 작업의 씨앗이 됩니다. 짧아도 좋으니 편하게
              남겨주세요.
            </p>

            <hr className="rule" />

            <form className="gb-form" id="gb-form">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label htmlFor="gb-name">이름 / 별명</label>
                  <input id="gb-name" type="text" maxLength={24} placeholder="익명의 방문자" />
                </div>
                <div>
                  <label htmlFor="gb-msg">메시지</label>
                  <textarea
                    id="gb-msg"
                    rows={3}
                    maxLength={280}
                    placeholder="여기에 흔적을 남겨주세요…"
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    <span
                      id="gb-msgcount"
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 11,
                        letterSpacing: ".08em",
                        color: "var(--faint)",
                      }}
                    >
                      0 / 280
                    </span>
                    <button type="submit" className="gb-submit">
                      남기기 →
                    </button>
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  letterSpacing: ".06em",
                  color: "var(--faint)",
                  margin: "14px 0 0",
                }}
              >
                * 데모용 방명록입니다. 작성한 글은 이 브라우저에만 저장됩니다.
              </p>
            </form>

            <div
              style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30 }}
            >
              <h2
                style={{
                  fontFamily: "'Poppins','Pretendard'",
                  fontWeight: 600,
                  fontSize: "1.3rem",
                  margin: 0,
                }}
              >
                남겨진 글
              </h2>
              <span
                id="gb-count"
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 13,
                  color: "var(--accent)",
                }}
              >
                00
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            <div id="gb-list" />
          </div>
        </section>
      </div>

      {/* intro */}
      <div id="intro">
        <div className="card">
          <div className="badge">An explorable portfolio</div>
          <h1>
            가람의 섬에
            <br />
            오신 걸 환영해요
          </h1>
          <p>작은 섬을 걸어다니며 가람을 만나고, 스튜디오와 방명록을 둘러보세요.</p>
          <div className="keys">
            <span className="item">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> 이동
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

      {/* loader */}
      <div id="loader">
        <div className="dots">
          <i />
          <i />
          <i />
        </div>
      </div>
    </>
  );
}
