import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDScorePayload, HUDLevelInfoPayload } from '@shared/events';

export default function HUDTopBar() {
  const { game } = useGameContext();
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

  const timerPct = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10 && remaining > 0;

  // If no level loaded yet, or on world map, don't render
  if (!levelName || levelName === 'World Map') return null;

  // Format time as MM:SS
  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3 bg-storm-dark/90 border-b-3 border-black shadow-lg shadow-black/30">
      {/* Exit button + Level name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleExit}
          className="retro-btn bg-warning-red/80 text-white text-xs !px-2.5 !py-1.5 flex items-center gap-1.5 hover:bg-warning-red transition-colors"
          title="Exit to menu"
        >
          ✕ Back
        </button>
        <span className="font-display text-lg text-accent-yellow truncate drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{levelName}</span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2">
        <span className="font-display text-sm text-white/60 uppercase tracking-wider">{label}</span>
        <span className="font-display text-2xl text-accent-yellow tabular-nums drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{score.toLocaleString()}</span>
      </div>

      {/* Timer */}
      {showTimer && (
        <div className={`flex items-center gap-3 px-3 py-1 rounded-md ${isUrgent ? 'bg-warning-red/20 animate-pulse' : 'bg-white/5'}`}>
          <div className="w-20 h-4 bg-ui-black/50 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isUrgent ? 'bg-warning-red' : 'bg-accent-yellow'
              }`}
              style={{ width: `${Math.max(0, timerPct * 100)}%` }}
            />
          </div>
          <span
            className={`font-display text-2xl tabular-nums min-w-[64px] text-center drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] ${
              remaining <= 0 ? 'text-warning-red' : isUrgent ? 'text-warning-red' : 'text-white'
            }`}
          >
            {timeStr}
          </span>
        </div>
      )}
    </div>
  );
}
