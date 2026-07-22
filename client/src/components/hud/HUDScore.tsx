import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDScorePayload } from '@shared/events';

export default function HUDScore() {
  const [score, setScore] = useState(0);
  const [label, setLabel] = useState('Score');

  usePhaserEvent(GAME_EVENTS.HUD_SCORE, (payload: HUDScorePayload) => {
    setScore(payload.score);
    if (payload.label) setLabel(payload.label);
  });

  return (
    <div className="absolute top-2 left-2 retro-card !p-2 !bg-storm-dark/80 min-w-[80px]">
      <div className="font-display text-[10px] text-white/70 uppercase tracking-wider">{label}</div>
      <div className="font-display text-lg text-accent-yellow tabular-nums">{score.toLocaleString()}</div>
    </div>
  );
}
