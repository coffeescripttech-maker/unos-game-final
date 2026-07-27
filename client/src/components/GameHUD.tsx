import LoadingOverlay from './hud/LoadingOverlay';
import HUDTopBar from './hud/HUDTopBar';
import HUDObjectiveBar from './hud/HUDObjectiveBar';
import HUDHealth from './hud/HUDHealth';
import LevelSelectCards from './hud/LevelSelectCards';
import WorldMapHeader from './hud/WorldMapHeader';
import ResultOverlay from './hud/ResultOverlay';
import LevelIntroOverlay from './hud/LevelIntroOverlay';
import TutorialBriefingOverlay from './hud/TutorialBriefingOverlay';
import TutorialStepOverlay from './hud/TutorialStepOverlay';
import PatternReviewOverlay from './hud/PatternReviewOverlay';
import PressureControls from './hud/PressureControls';
import TyphoonControls from './hud/TyphoonControls';

export default function GameHUD() {
  return (
    <>
      {/* ── Loading overlay (full-screen, hides when assets loaded) ── */}
      <LoadingOverlay />

      {/* ── World map header: Back button + title ── */}
      <WorldMapHeader />

      {/* ── Top bar: Level Name | Score | Timer ── */}
      <HUDTopBar />

      {/* ── Objective bar: Objective text + progress ── */}
      <HUDObjectiveBar />

      {/* ── Health bars (boss scene) ── */}
      <HUDHealth />

      {/* ── Level selection cards (world map) ── */}
      <LevelSelectCards />

      {/* ── Result overlay (win/fail) ── */}
      <ResultOverlay />

      {/* ── Level intro overlay (mechanics explainer) ── */}
      <LevelIntroOverlay />

      {/* ── Tutorial briefing overlay (custom mission card) ── */}
      <TutorialBriefingOverlay />

      {/* ── Tutorial step overlay (step indicator + instruction text) ── */}
      <TutorialStepOverlay />

      {/* ── Pattern review overlay (shows correct H/L pattern between rounds) ── */}
      <PatternReviewOverlay />

      {/* ── Pressure Controls (joystick-style H/L buttons, Stage 3) ── */}
      <PressureControls />

      {/* ── Typhoon Controls (React sliders with Lucide icons, Stage 5) ── */}
      <TyphoonControls />
    </>
  );
}
