import "./NpcDialogue.css";

export default function NpcDialogue() {
  return (
    <div id="npc-dialogue" aria-live="polite">
      <div className="dlg-box">
        <span className="dlg-name">가람</span>
        <p className="dlg-text" />
        <span className="dlg-hint">
          계속하기 <span className="dlg-key">E</span>
        </span>
      </div>
    </div>
  );
}
