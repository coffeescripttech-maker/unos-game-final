import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLevelInfoPayload } from '@shared/events';

/**
 * Small top-left legend that pins down what each science icon means, so the
 * Evaporation ☀️ / Condensation 💧 symbols stay consistent across levels.
 * Hides itself on the World Map (mirrors HUDTopBar's visibility rule).
 */
const LEGEND: { icon: string; label: string }[] = [
  { icon: '☀️', label: 'Heat → Evaporation' },
  { icon: '💧', label: 'Vapor → Condensation' },
  { icon: '🌡️', label: 'Pressure' },
  { icon: '🌀', label: 'Rotation' },
  { icon: '🌪️', label: 'Typhoon' },
];

export default function LevelLegend() {
  const [levelName, setLevelName] = useState('');

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setLevelName(payload.name);
  });

  if (!levelName || levelName === 'World Map') return null;

  return (
    <div className="absolute top-[120px] left-2 z-30 flex flex-wrap gap-1.5 pointer-events-none max-w-[300px]">
      {LEGEND.map(item => (
        <div
          key={item.label}
          className="retro-card !bg-storm-dark/85 !border-white/25 !p-1 !px-2 flex items-center gap-1.5 rounded-md"
        >
          <span className="text-sm md:text-base">{item.icon}</span>
          <span className="font-body text-xs md:text-sm text-white/85">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
