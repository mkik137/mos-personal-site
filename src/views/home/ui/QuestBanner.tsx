import "./QuestBanner.css";

// 퀘스트 완료 연출 배너 — questChain.showQuestComplete(name)가 .qb-sub 텍스트를 채우고
// .show 클래스를 토글한다 (각 퀘스트를 NPC에게 보고할 때).
export default function QuestBanner() {
  return (
    <div id="quest-banner" aria-live="polite">
      <div className="qb-inner">
        <div className="qb-kicker">QUEST COMPLETE</div>
        <div className="qb-title">퀘스트 완료!</div>
        <div className="qb-sub" />
      </div>
    </div>
  );
}
