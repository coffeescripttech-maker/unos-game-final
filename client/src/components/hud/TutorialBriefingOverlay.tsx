import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';

export default function TutorialBriefingOverlay() {
  const { game } = useGameContext();
  const [visible, setVisible] = useState(false);

  usePhaserEvent(GAME_EVENTS.HUD_TUTORIAL_BRIEFING, () => {
    setVisible(true);
  });

  usePhaserEvent(GAME_EVENTS.HUD_TUTORIAL_HIDE, () => {
    setVisible(false);
  });

  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => {
    setVisible(false);
  });

  const handleBegin = useCallback(() => {
    if (!game) return;
    setVisible(false);
    game.events.emit(GAME_EVENTS.HUD_INTRO_DISMISS);
  }, [game]);

  const handleBack = useCallback(() => {
    if (!game) return;
    setVisible(false);
    game.events.emit(GAME_EVENTS.NAVIGATE_HOME);
  }, [game]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-300">
      {/* Main briefing card — retro terminal panel */}
      <div
        className="w-[92%] max-w-lg bg-storm-dark border-3 border-black shadow-retro animate-in zoom-in-95 duration-300"
        style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.6)' }}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-storm-mid/80 border-b-3 border-black">
          <button
            onClick={handleBack}
            className="retro-btn bg-storm-dark/60 text-white text-xs flex items-center gap-1.5 !px-2.5 !py-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 19-7-7 7-7"></path>
              <path d="M19 12H5"></path>
            </svg>
            Back
          </button>
          <span className="font-display text-sm text-accent-yellow tracking-wider" style={{ textShadow: '1px 1px 0px #000000' }}>
            TUTORIAL MISSION
          </span>
          {/* Spacer to keep title centered-ish */}
          <div className="w-[60px]" />
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 space-y-5">
          {/* ── Top section: illustration + briefing ── */}
          <div className="flex gap-4">
            {/* Illustration box */}
            <div className="shrink-0 w-[110px] h-[100px] bg-storm-dark/60 border-2 border-black/40 rounded-sm flex items-center justify-center">
              <span className="text-4xl">🏝️</span>
            </div>

            {/* Mission Briefing text */}
            <div className="flex-1 min-w-0">
              <h2
                className="font-display text-base text-accent-yellow mb-1"
                style={{ textShadow: '1px 1px 0px #000000' }}
              >
                Mission Briefing
              </h2>
              <p className="font-body text-xs text-white/70 leading-relaxed">
                Welcome aboard the UNOS Weather Research Program. Your role as a
                field meteorologist is to observe, measure, and predict weather
                phenomena across the archipelago.
              </p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-gradient-to-r from-transparent via-accent-yellow/40 to-transparent" />

          {/* ── Bottom section: objectives + learning goal + meta ── */}
          <div className="flex gap-6">
            {/* Objectives */}
            <div className="flex-1">
              <h3 className="font-display text-xs text-accent-yellow/80 uppercase tracking-wider mb-2">Objectives</h3>
              <ul className="space-y-1.5">
                {[
                  'Explore the Research Base',
                  'Complete 3 training exercises',
                  'Prepare for fieldwork',
                ].map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#06d6a0] text-sm mt-0.5 shrink-0">☑</span>
                    <span className="font-body text-xs text-white/70">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Learning Goal */}
            <div className="flex-1">
              <h3 className="font-display text-xs text-accent-yellow/80 uppercase tracking-wider mb-2">Learning Goal</h3>
              <p className="font-body text-xs text-white/60 leading-relaxed">
                Learn the basic controls and understand your role as a weather researcher in the field.
              </p>
            </div>
          </div>

          {/* ── Meta row: difficulty + time ── */}
          <div className="flex items-center justify-between px-3 py-2 bg-black/20 border border-white/5 rounded-sm">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs text-white/50 uppercase tracking-wider">Difficulty</span>
              <span className="text-accent-yellow text-sm">★</span>
              <span className="text-white/20 text-sm">★★★★</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 text-xs">⏱</span>
              <span className="font-body text-xs text-white/50">~3 min</span>
            </div>
          </div>

          {/* ── Begin button ── */}
          <button
            onClick={handleBegin}
            className="retro-btn retro-btn-primary w-full text-sm py-2.5 animate-pulse-subtle"
          >
            ▶  Begin Expedition
          </button>
        </div>
      </div>
    </div>
  );
}
