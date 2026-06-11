"use client";

import { useEffect } from "react";
import SceneCanvas from "./SceneCanvas";
import PoiLabels from "./PoiLabels";
import Hud from "./Hud";
import InteractionPrompt from "./InteractionPrompt";
import MobileControls from "./MobileControls";
import WorldOverlay from "./WorldOverlay";
import NpcDialogue from "./NpcDialogue";
import IntroScreen from "./IntroScreen";
import Loader from "./Loader";

export default function HomePage() {
  useEffect(() => {
    const failsafe = window.setTimeout(() => {
      document.getElementById("loader")?.classList.add("hide");
    }, 9000);

    let cancelled = false;
    (async () => {
      await import("@/features/guestbook");
      const { initWorld } = await import("@/widgets/world");
      if (!cancelled) initWorld();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
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
      <NpcDialogue />
      <IntroScreen />
      <Loader />
    </>
  );
}
