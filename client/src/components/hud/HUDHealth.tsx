import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDHealthPayload } from '@shared/events';

export default function HUDHealth() {
  const [bars, setBars] = useState<HUDHealthPayload[]>([]);

  usePhaserEvent(GAME_EVENTS.HUD_HEALTH, (payload: HUDHealthPayload) => {
    setBars(prev => {
      const idx = prev.findIndex(b => b.label === payload.label);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
  });

  if (bars.length === 0) return null;

  return (
    <div className="absolute top-[110px] left-1/2 -translate-x-1/2 z-30 flex gap-5 retro-card !p-3 !bg-storm-dark/80 shadow-lg shadow-black/20">
      {bars.map(bar => {
        const pct = bar.max > 0 ? bar.current / bar.max : 0;
        const isLow = pct < 0.3;
        return (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="font-display text-xs text-white/80 uppercase tracking-wider drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{bar.label}</span>
            <div className="w-28 h-4 bg-ui-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <div
                className={`h-full transition-all duration-300 rounded-full shadow-[0_0_6px_rgba(214,40,40,0.3)] ${
                  isLow ? 'bg-warning-red' : bar.label === 'Storm' ? 'bg-warning-red/70' : 'bg-accent-green'
                }`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <span className="font-display text-sm text-white tabular-nums drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{Math.ceil(bar.current)}</span>
          </div>
        );
      })}
    </div>
  );
}
