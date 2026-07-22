import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDObjectivePayload, HUDLevelInfoPayload } from '@shared/events';

export default function HUDObjectiveBar() {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(0);
  const [levelName, setLevelName] = useState('');

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setLevelName(payload.name);
  });

  usePhaserEvent(GAME_EVENTS.HUD_OBJECTIVE, (payload: HUDObjectivePayload) => {
    setText(payload.text);
    setProgress(payload.progress);
    setTarget(payload.target);
  });

  // Don't render until a level is loaded AND objective is set
  if (!levelName || !text) return null;

  const pct = target > 0 ? Math.min(1, progress / target) : 0;

  return (
    <div className="absolute top-[60px] left-0 right-0 z-30 flex items-center gap-4 px-5 py-2.5 bg-storm-dark/80 border-b border-black/30 shadow-md shadow-black/20">
      <span className="font-display text-sm text-white/90 whitespace-nowrap drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">{text}</span>
      {target > 0 && (
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1 h-4 bg-ui-black/50 rounded-full overflow-hidden max-w-[280px] border border-white/10 shadow-inner">
            <div
              className="h-full bg-accent-green transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(6,214,160,0.4)]"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className="font-display text-sm text-white tabular-nums drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
            {Math.min(progress, target)}/{target}
          </span>
        </div>
      )}
    </div>
  );
}
