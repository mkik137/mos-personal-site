import "./QuestHud.css";

// 퀘스트 체인 HUD — world 엔진(questChain.ts)이 .show 토글 + 텍스트를 명령형으로 갱신.
//  · #quest-objective  현재 목표 (항상 상단)
//  · #delivery-timer   배달 타임어택 카운트다운
//  · #delivery-result  배달 등급(S/A/B) 팝
//  · #ending-banner    방명록 제출 후 엔딩 연출
export default function QuestHud() {
  return (
    <>
      <div id="quest-objective" aria-live="polite">
        <span className="qo-pin" />
        <span className="qo-text" />
      </div>

      <div id="delivery-timer" aria-live="off">
        <div className="dt-top">
          <span className="dt-label">배달까지</span>
          <span className="dt-time">50</span>
          <span className="dt-unit">초</span>
        </div>
        <div className="dt-bar">
          <div className="dt-fill" />
        </div>
      </div>

      <div id="quest-start" aria-live="polite">
        <div className="qs-inner">
          <div className="qs-kicker">NEW QUEST</div>
          <div className="qs-title" />
          <div className="qs-sub" />
        </div>
      </div>

      <div id="delivery-result" aria-live="polite">
        <div className="dr-inner">
          <div className="dr-kicker">DELIVERY COMPLETE</div>
          <div className="dr-grade">S</div>
          <div className="dr-text">신선 배달 성공!</div>
        </div>
      </div>

      <div id="ending-banner" aria-live="polite">
        <div className="eb-inner">
          <div className="eb-kicker">THE END</div>
          <div className="eb-title">여정의 끝</div>
          <div className="eb-sub">가람의 섬을 끝까지 둘러봐 주셔서 고마워요 ♡</div>
        </div>
      </div>
    </>
  );
}
