import AboutPanel from "./panels/AboutPanel";
import WorkPanel from "./panels/WorkPanel";
import GuestbookPanel from "./panels/GuestbookPanel";

export default function WorldOverlay() {
  return (
    <div id="overlay">
      <div className="scrim" />
      <AboutPanel />
      <WorkPanel />
      <GuestbookPanel />
    </div>
  );
}
