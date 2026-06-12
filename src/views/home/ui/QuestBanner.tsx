import "./QuestBanner.css";

// 퀘스트 완료 연출 배너 — world.ts(showQuestBanner)가 .show 클래스를 토글한다.
export default function QuestBanner() {
  return (
    <div id="quest-banner" aria-live="polite">
      <div className="qb-inner">
        <div className="qb-kicker">QUEST COMPLETE</div>
        <div className="qb-title">퀘스트 완료!</div>
        <div className="qb-sub">광장 대청소 — 큐비의 부탁</div>
      </div>
    </div>
  );
}
