"use client";

import { useEffect } from "react";
import SceneCanvas from "./SceneCanvas";
import PoiLabels from "./PoiLabels";
import Hud from "./Hud";
import InteractionPrompt from "./InteractionPrompt";
import MobileControls from "./MobileControls";
import WorldOverlay from "./WorldOverlay";
import InventoryPanel from "./InventoryPanel";
import SkillBar from "./SkillBar";
import SkillWindow from "./SkillWindow";
import MapWindow from "./MapWindow";
import HelpWindow from "./HelpWindow";
import Minimap from "./Minimap";
import NpcDialogue from "./NpcDialogue";
import QuestBanner from "./QuestBanner";
import QuestHud from "./QuestHud";
import IntroScreen from "./IntroScreen";
import Loader from "./Loader";

export default function HomePage() {
  useEffect(() => {
    const failsafe = window.setTimeout(() => {
      document.getElementById("loader")?.classList.add("hide");
    }, 9000);

    let cancelled = false;
    let dispose: (() => void) | null = null;
    (async () => {
      await import("@/features/guestbook");
      const mod = await import("@/widgets/world");
      if (cancelled) return;
      dispose = mod.disposeWorld;
      mod.initWorld();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      // 언마운트(라우트 이동·StrictMode 재마운트) 시 엔진 완전 해제 → RAF·WebGL·리스너 누수 방지
      dispose?.();
    };
  }, []);

  return (
    <>
      <SceneCanvas />
      <PoiLabels />
      <Hud />
      <InteractionPrompt />
      <MobileControls />
      <WorldOverlay />
      <InventoryPanel />
      <SkillBar />
      <SkillWindow />
      <MapWindow />
      <HelpWindow />
      <Minimap />
      <NpcDialogue />
      <QuestBanner />
      <QuestHud />
      <IntroScreen />
      <Loader />
    </>
  );
}
