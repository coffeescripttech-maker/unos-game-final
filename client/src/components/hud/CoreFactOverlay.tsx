import { useState, useCallback, useEffect, useRef } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { CoreFactPayload } from '@shared/events';
import { speak, stopSpeaking } from '../../services/speech';

/**
 * Core-learning pop-up.
 *
 * Phaser emits `HUD_CORE_FACT` the moment a science idea happens (sun heats the
 * ocean, vapor condenses, pressure makes wind, …). The card floats above the
 * game, is read aloud, and auto-dismisses so the child never has to leave the
 * level and open the Walkthrough.
 */
export default function CoreFactOverlay() {
  const { game } = useGameContext();
  const [fact, setFact] = useState<CoreFactPayload | null>(null);
  // Mirror of `fact` for event handlers so two facts fired in the same tick
  // don't overwrite each other.
  const factRef = useRef<CoreFactPayload | null>(null);
  const queue = useRef<CoreFactPayload[]>([]);
  const timer = useRef<number | null>(null);

  const setCurrent = useCallback((next: CoreFactPayload | null) => {
    factRef.current = next;
    setFact(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    setCurrent(next ?? null);
  }, [setCurrent]);

  const dismiss = useCallback(() => {
    clearTimer();
    stopSpeaking();
    game?.events.emit(GAME_EVENTS.HUD_CORE_FACT_DISMISS);
    // Small gap so consecutive facts don't flash on top of each other.
    window.setTimeout(showNext, 250);
  }, [game, clearTimer, showNext]);

  usePhaserEvent(GAME_EVENTS.HUD_CORE_FACT, (payload: CoreFactPayload) => {
    if (!payload) return;
    if (factRef.current) {
      // Don't stack cards — queue behind the one being read.
      queue.current.push(payload);
      return;
    }
    setCurrent(payload);
  });

  // Speak + auto-dismiss whenever a new fact appears.
  useEffect(() => {
    if (!fact) return;
    speak(`${fact.title}. ${fact.text}`, { interrupt: true, rate: 0.9 });
    const ms = fact.duration ?? 9000;
    if (ms > 0) {
      clearTimer();
      timer.current = window.setTimeout(dismiss, ms);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fact]);

  // Clear everything when leaving the level.
  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => {
    queue.current = [];
    clearTimer();
    setCurrent(null);
  });

  if (!fact) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-2">
      <div
        className="core-fact-card pointer-events-auto w-[95%] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="status"
        aria-live="polite"
      >
        <div className="retro-card !bg-storm-dark/95 !border-accent-yellow/60 !p-3 flex items-start gap-3 shadow-xl shadow-black/50">
          <div className="text-2xl shrink-0 leading-none pt-0.5">{fact.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm text-accent-yellow uppercase tracking-wide">
              {fact.title}
            </div>
            <div className="font-body text-sm text-white/90 leading-snug mt-1">
              {fact.text}
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border-2 border-black bg-ocean-surface/80 text-white text-xs hover:bg-ocean-surface active:scale-95"
            title="Close"
            aria-label="Close learning tip"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}