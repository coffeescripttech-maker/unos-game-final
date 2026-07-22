import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload } from '@shared/events';

export default function HUDTimer() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);

  usePhaserEvent(GAME_EVENTS.HUD_TIMER, (payload: HUDTimerPayload) => {
    setRemaining(payload.remaining);
    setTotal(payload.total);
  });

  if (total === 0) return null;

  const pct = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 10 && remaining > 0;
  const isExpired = remaining <= 0;

  return (
    <div className="absolute top-2 right-2 flex items-center gap-2 retro-card !p-2 !bg-storm-dark/80 min-w-[100px]">
      <div className="font-display text-xs text-white/70">TIME</div>
      <div
        className={`font-display text-lg tabular-nums ${
          isExpired ? 'text-warning-red' : isUrgent ? 'text-warning-red animate-pulse' : 'text-white'
        }`}
      >
        {remaining}s
      </div>
      {/* Mini progress bar */}
      <div className="w-12 h-2 bg-ui-black/50 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isUrgent ? 'bg-warning-red' : 'bg-ocean-surface'
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
