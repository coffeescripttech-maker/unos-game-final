import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDObjectivePayload } from '@shared/events';

export default function HUDObjective() {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(0);

  usePhaserEvent(GAME_EVENTS.HUD_OBJECTIVE, (payload: HUDObjectivePayload) => {
    setText(payload.text);
    setProgress(payload.progress);
    setTarget(payload.target);
  });

  if (!text) return null;

  const pct = target > 0 ? Math.min(1, progress / target) : 0;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 retro-card !p-2 !bg-storm-dark/80 min-w-[200px] text-center">
      <div className="font-body text-xs text-white/80">{text}</div>
      {target > 0 && (
        <div className="mt-1 flex items-center gap-2 justify-center">
          <div className="w-24 h-2.5 bg-ui-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all duration-300 rounded-full"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className="font-display text-xs text-white tabular-nums">
            {Math.min(progress, target)}/{target}
          </span>
        </div>
      )}
    </div>
  );
}
