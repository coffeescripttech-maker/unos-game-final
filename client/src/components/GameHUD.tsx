import HUDTopBar from './hud/HUDTopBar';
import HUDObjectiveBar from './hud/HUDObjectiveBar';
import HUDHealth from './hud/HUDHealth';
import HUDWeatherBar from './hud/HUDWeatherBar';
import LevelSelectCards from './hud/LevelSelectCards';
import WorldMapHeader from './hud/WorldMapHeader';
import ResultOverlay from './hud/ResultOverlay';
import LevelIntroOverlay from './hud/LevelIntroOverlay';
import TutorialBriefingOverlay from './hud/TutorialBriefingOverlay';
import TutorialStepOverlay from './hud/TutorialStepOverlay';

export default function GameHUD() {
  return (
    <>
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

      {/* ── Bottom bar: Weather conditions ── */}
      <HUDWeatherBar />

      {/* ── Result overlay (win/fail) ── */}
      <ResultOverlay />

      {/* ── Level intro overlay (mechanics explainer) ── */}
      <LevelIntroOverlay />

      {/* ── Tutorial briefing overlay (custom mission card) ── */}
      <TutorialBriefingOverlay />

      {/* ── Tutorial step overlay (step indicator + instruction text) ── */}
      <TutorialStepOverlay />
    </>
  );
}
