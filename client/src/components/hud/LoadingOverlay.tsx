import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS, type HUDLoadingPayload } from '@shared/events';

const LOADING_TIPS = [
  'Warm oceans fuel the storm...',
  'Evaporation creates rising air...',
  'Low pressure pulls in surrounding air...',
  'The Coriolis effect starts the spin...',
  'Clouds form from rising vapor...',
  'Wind flows from high to low pressure...',
  'A typhoon eye is calm at the center...',
  'Warm water above 26°C is needed...',
];

export default function LoadingOverlay() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  usePhaserEvent(GAME_EVENTS.HUD_LOADING, (payload: HUDLoadingPayload) => {
    setProgress(payload.progress);
    if (payload.progress >= 1) {
      // Brief delay then fade
      setTimeout(() => setVisible(false), 400);
    }
  });

  if (!visible) return null;

  const pct = Math.round(progress * 100);
  const tipIndex = Math.min(
    Math.floor(progress * LOADING_TIPS.length),
    LOADING_TIPS.length - 1,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#0A2472] via-[#0d1b2a] to-[#1a1a3e]">
      <div className="flex flex-col items-center gap-6">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl">🌀</span>
          <h1
            className="text-3xl font-display tracking-wide"
            style={{ color: '#4fc3f7', textShadow: '0 4px 12px rgba(79,195,247,0.4)' }}
          >
            UNOS
          </h1>
          <p className="text-sm font-body text-gray-400">
            Typhoon Formation Simulator
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-72">
          {/* Bar track */}
          <div className="relative h-5 overflow-hidden rounded-full border-3 border-black shadow-retro bg-white">
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 transition-all duration-200 ease-out"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #3A87C4, #6DB3E6, #06D6A0)',
              }}
            />
          </div>

          {/* Percentage */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-body text-gray-400">
              {LOADING_TIPS[tipIndex]}
            </span>
            <span className="text-sm font-display text-white">{pct}%</span>
          </div>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: pct > i * 33 ? '#06D6A0' : '#ffffff20',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
