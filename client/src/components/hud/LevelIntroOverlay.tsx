import { useState, useCallback, useRef } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLevelIntroPayload } from '@shared/events';

const MECH_COLORS: Record<string, string> = {
  '☀️': 'text-accent-yellow',
  '💧': 'text-ocean-surface',
  '☁️': 'text-gray-300',
  '🌡️': 'text-warning-orange',
  '💨': 'text-cyan-300',
};

const MECH_BARS: Record<string, string> = {
  '☀️': 'border-accent-yellow',
  '💧': 'border-ocean-surface',
  '☁️': 'border-gray-400',
  '🌡️': 'border-warning-orange',
  '💨': 'border-cyan-300',
};

export default function LevelIntroOverlay() {
  const { game } = useGameContext();
  const [intro, setIntro] = useState<HUDLevelIntroPayload | null>(null);
  // Keeps the current level's mechanics so the 📖 button can re-open them
  const lastIntro = useRef<HUDLevelIntroPayload | null>(null);
  const introOpen = useRef(false);
  // Tracks which scenes WE paused, so dismiss resumes exactly those
  const pausedKeys = useRef<Set<string>>(new Set());

  // Mid-game pause (📖 re-open only): freeze running scenes while reading.
  const pauseScenes = useCallback(() => {
    if (!game) return;
    game.scene.getScenes().forEach(s => {
      try {
        if (game.scene.isActive(s.scene.key)) {
          game.scene.pause(s.scene.key);
          pausedKeys.current.add(s.scene.key);
        }
      } catch {
        /* scene mid-transition — skip */
      }
    });
  }, [game]);

  const resumeScenes = useCallback(() => {
    if (!game) return;
    // Resume every scene we paused…
    pausedKeys.current.forEach(key => {
      try {
        game.scene.resume(key);
      } catch {
        /* ignore */
      }
    });
    pausedKeys.current.clear();
    // …plus a safety net: unfreeze any scene left paused for any reason.
    game.scene.getScenes().forEach(s => {
      try {
        if (game.scene.isPaused(s.scene.key)) game.scene.resume(s.scene.key);
      } catch {
        /* ignore */
      }
    });
  }, [game]);

  // First intro: scenes gate their own gameplay on HUD_INTRO_DISMISS
  // (startGame hasn't run yet), so NO pause here — pausing mid-create()
  // interrupts Phaser's scene start sequence and freezes the level.
  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INTRO, (payload: HUDLevelIntroPayload) => {
    lastIntro.current = payload;
    introOpen.current = true;
    setIntro(payload);
  });

  // 📖 Instructions button (HUD top bar) → re-open this level's mechanics.
  // Pause is deferred one tick so we never pause during a scene transition.
  usePhaserEvent(GAME_EVENTS.HUD_REQUEST_INTRO, () => {
    if (!lastIntro.current) return;
    introOpen.current = true;
    setIntro(lastIntro.current);
    setTimeout(() => {
      if (introOpen.current) pauseScenes();
    }, 0);
  });

  const handleDismiss = useCallback(() => {
    if (!game) return;
    introOpen.current = false;
    // Scene-level listeners (e.g. startGame) fire on this event…
    game.events.emit(GAME_EVENTS.HUD_INTRO_DISMISS);
    setIntro(null);
    // …then unfreeze the scene so gameplay resumes cleanly.
    resumeScenes();
  }, [game, resumeScenes]);

  if (!intro) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-2">
      <div className="retro-card modal-card max-w-md w-[95%] max-h-[95vh] overflow-y-auto !bg-storm-dark animate-in zoom-in-95 duration-300">
        {/* ── Level badge ── */}
        <div className="flex justify-center -mt-1">
          <span className="retro-badge bg-warning-red text-white text-xs px-6 py-1 -translate-y-1/2">
            {intro.badge}
          </span>
        </div>

        {/* ── Title ── */}
        <div
          className="font-display text-3xl text-accent-yellow text-center mt-2"
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          {intro.title}
        </div>

        {/* ── Subtitle ── */}
        <div
          className="font-body text-sm text-white/60 text-center mt-1 mb-4"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}
        >
          {intro.subtitle}
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent-yellow/50 to-transparent mx-2 mb-4" />

        {/* ── Mechanics list ── */}
        <div className="space-y-2.5 px-2">
          {intro.mechanics.map((m, i) => {
            const textColor = MECH_COLORS[m.icon] ?? 'text-white';
            const barColor = MECH_BARS[m.icon] ?? 'border-white/40';
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-2.5 rounded-sm bg-black/20 border-l-3 ${barColor}`}
              >
                <span className="text-lg shrink-0 w-6 text-center">{m.icon}</span>
                <span
                  className={`font-body text-sm ${textColor}`}
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.9)' }}
                >
                  {m.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Start button ── */}
        <button
          onClick={handleDismiss}
          className="retro-btn retro-btn-primary w-full mt-6 text-sm animate-pulse-subtle"
        >
          ▶  Click to continue
        </button>
      </div>
    </div>
  );
}
