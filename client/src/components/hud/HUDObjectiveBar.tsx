import { useState, useMemo } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDObjectivePayload, HUDLevelInfoPayload, HUDWeatherPayload } from '@shared/events';

/** Map 0–100 to a hue angle (240 = blue, 0 = red) for the spectrum bar. */
function tempToHue(value: number): number {
  return Math.max(0, Math.min(240, 240 - (value / 100) * 240));
}

/** Build a CSS `background` string for the full spectrum gradient. */
const SPECTRUM_GRADIENT = (() => {
  const stops = [0, 20, 40, 60, 80, 100];
  const colors = stops.map(pct => {
    const hue = tempToHue(pct);
    return `hsl(${hue}, 100%, 50%) ${pct}%`;
  });
  return `linear-gradient(to right, ${colors.join(', ')})`;
})();

export default function HUDObjectiveBar() {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(0);
  const [levelName, setLevelName] = useState('');
  const [weather, setWeather] = useState<HUDWeatherPayload | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setLevelName(payload.name);
    setWeather(null);
  });

  usePhaserEvent(GAME_EVENTS.HUD_OBJECTIVE, (payload: HUDObjectivePayload) => {
    setText(payload.text);
    setProgress(payload.progress);
    setTarget(payload.target);
  });

  usePhaserEvent(GAME_EVENTS.HUD_WEATHER, (payload: HUDWeatherPayload) => {
    setWeather(payload);
  });

  // Normalise temperature to 0-100 scale for the bar fill
  const tempBarValue = useMemo(() => {
    if (weather?.temperature === undefined) return 0;
    return Math.max(0, Math.min(100, ((weather.temperature - 20) / 60) * 100));
  }, [weather?.temperature]);

  const fillHue = useMemo(() => tempToHue(tempBarValue), [tempBarValue]);

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

      {/* Weather data — right side */}
      {weather && (
        <div className="flex items-center gap-3 ml-auto">
          {weather.temperature !== undefined && (
            <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              <span className="text-sm">🌡</span>
              <div className="relative w-16 sm:w-20 h-2.5 rounded-full overflow-hidden border border-white/20 bg-black/30">
                <div className="absolute inset-0 rounded-full" style={{ background: SPECTRUM_GRADIENT }} />
                <div
                  className="absolute inset-y-0 right-0 rounded-r-full bg-black/55 transition-all duration-300"
                  style={{ width: `${100 - tempBarValue}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-[0_0_4px_rgba(255,255,255,0.6)] transition-all duration-300"
                  style={{
                    left: `calc(${tempBarValue}% - 4px)`,
                    backgroundColor: `hsl(${fillHue}, 100%, 55%)`,
                  }}
                />
              </div>
              <span className="font-display text-[11px] text-white tabular-nums">{weather.temperature}°C</span>
            </div>
          )}
          {weather.humidity !== undefined && (
            <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              <span className="text-sm">💧</span>
              <span className="font-display text-[11px] text-ocean-surface tabular-nums">{weather.humidity}%</span>
            </div>
          )}
          {weather.windSpeed !== undefined && (
            <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              <span className="text-sm">💨</span>
              <span className="font-display text-[11px] text-white tabular-nums">{weather.windSpeed}</span>
            </div>
          )}
          {weather.stormLevel !== undefined && (
            <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              <span className="text-sm">🌀</span>
              <span className="font-display text-[11px] text-warning-orange tabular-nums">{weather.stormLevel}</span>
            </div>
          )}
          {weather.powerup && (
            <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              <span className="text-sm">⚡</span>
              <span className="font-display text-[11px] text-accent-yellow">{weather.powerup}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
