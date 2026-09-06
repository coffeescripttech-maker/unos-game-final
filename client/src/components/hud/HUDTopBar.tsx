import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDScorePayload, HUDLevelInfoPayload } from '@shared/events';
import { useFullscreen } from '../../hooks/useFullscreen';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function HUDTopBar() {
  const { game } = useGameContext();
  const { isFullscreen, isSupported, toggle } = useFullscreen();
  const [score, setScore] = useState(0);
  const [label, setLabel] = useState('Score');
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [levelName, setLevelName] = useState('');
  const [showTimer, setShowTimer] = useState(false);

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setLevelName(payload.name);
  });

  usePhaserEvent(GAME_EVENTS.HUD_SCORE, (payload: HUDScorePayload) => {
    setScore(payload.score);
    if (payload.label) setLabel(payload.label);
  });

  usePhaserEvent(GAME_EVENTS.HUD_TIMER, (payload: HUDTimerPayload) => {
    setRemaining(payload.remaining);
    setTotal(payload.total);
    setShowTimer(true);
  });

  const handleExit = useCallback(() => {
    if (game) {
      game.events.emit(GAME_EVENTS.NAVIGATE_HOME);
    }
  }, [game]);

  // 📖 Re-open the current level's instructions (works on every level)
  const handleShowIntro = useCallback(() => {
    if (game) {
      game.events.emit(GAME_EVENTS.HUD_REQUEST_INTRO);
    }
  }, [game]);

  const timerPct = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10 && remaining > 0;

  // If no level loaded yet, or on world map, don't render
  if (!levelName || levelName === 'World Map') return null;

  // Format time as MM:SS
  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="hud-topbar absolute top-0 left-0 right-0 z-30 grid grid-cols-3 items-center px-5 py-3 bg-storm-dark/90 border-b-3 border-black shadow-lg shadow-black/30 pointer-events-none">
      {/* Left: Level name */}
      <div className="flex items-center min-w-0">
        <span className="font-display text-base lg:text-lg text-accent-yellow truncate drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] max-w-[140px] lg:max-w-[240px]">{levelName}</span>
      </div>

      {/* Center: Score */}
      <div className="flex items-center justify-center gap-1.5 lg:gap-2">
        <span className="hidden md:inline font-display text-sm text-white/60 uppercase tracking-wider">{label}</span>
        <span className="font-display text-xl lg:text-2xl text-accent-yellow tabular-nums drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{score.toLocaleString()}</span>
      </div>

      {/* Right: Timer → Exit → Fullscreen */}
      <div className="flex items-center justify-end gap-2">
        {showTimer && (
          <div className={`hud-timer flex items-center gap-2 px-2 py-1 rounded-md ${isUrgent ? 'bg-warning-red/20 animate-pulse' : 'bg-white/5'}`}>
            <div className="w-16 lg:w-20 h-3.5 lg:h-4 bg-ui-black/50 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isUrgent ? 'bg-warning-red' : 'bg-accent-yellow'
                }`}
                style={{ width: `${Math.max(0, timerPct * 100)}%` }}
              />
            </div>
            <span
              className={`font-display text-lg lg:text-2xl tabular-nums min-w-[48px] lg:min-w-[64px] text-center drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] ${
                remaining <= 0 ? 'text-warning-red' : isUrgent ? 'text-warning-red' : 'text-white'
              }`}
            >
              {timeStr}
            </span>
          </div>
        )}

        <button
          onClick={handleShowIntro}
          className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border-2 border-black bg-ocean-surface/90 text-white shadow-retro transition-transform hover:bg-ocean-surface active:scale-95 pointer-events-auto text-sm"
          title="Show instructions"
          aria-label="Show instructions"
        >
          📖
        </button>

        <button
          onClick={handleExit}
          className="hud-back flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border-2 border-black bg-warning-red/90 text-white shadow-retro transition-transform hover:bg-warning-red active:scale-95 pointer-events-auto"
          title="Exit to menu"
          aria-label="Exit to menu"
        >
          ✕
        </button>

        {isSupported && (
          <button
            onClick={toggle}
            className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border-2 border-black bg-storm-mid text-white shadow-retro transition-transform hover:bg-storm-light active:scale-95 pointer-events-auto"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
