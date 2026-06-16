import "./QuestHud.css";

// 퀘스트 체인 HUD — world 엔진(questChain.ts)이 .show 토글 + 텍스트를 명령형으로 갱신.
//  · #quest-log        중앙 좌측 퀘스트 로그 (메인 퀘스트 목록 + 현재 진행 내용)
//  · #delivery-timer   배달 타임어택 카운트다운
//  · #delivery-result  배달 등급(S/A/B) 팝
//  · #ending-banner    방명록 제출 후 엔딩 연출
export default function QuestHud() {
  return (
    <>
      <div id="quest-log" aria-live="polite">
        <div className="ql-head">
          <span>📜</span> 퀘스트
        </div>
        <ul className="ql-list">
          <li className="ql-item" data-q="guard">
            <i className="ql-mark" />
            <span className="ql-title">적응 훈련</span>
          </li>
          <li className="ql-item" data-q="gallery">
            <i className="ql-mark" />
            <span className="ql-title">전시회 관람</span>
          </li>
          <li className="ql-item" data-q="ending">
            <i className="ql-mark" />
            <span className="ql-title">방명록 남기기</span>
          </li>
          <li className="ql-sub">선택 퀘스트</li>
          <li className="ql-item" data-q="fruit">
            <i className="ql-mark" />
            <span className="ql-title">과일 수확 &amp; 배달</span>
          </li>
          <li className="ql-item" data-q="trash">
            <i className="ql-mark" />
            <span className="ql-title">마을 청소</span>
          </li>
        </ul>
        <div className="ql-current">
          <span className="qo-pin" />
          <span className="qo-text" />
        </div>
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
          <div className="eb-kicker">STORY CLEAR</div>
          <div className="eb-title">방명록을 남겼어요</div>
          <div className="eb-sub">이제 과일가게 사장·큐비를 자유롭게 도와줄 수 있어요 ♡</div>
        </div>
      </div>
    </>
  );
}
