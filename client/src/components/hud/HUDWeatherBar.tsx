import { useState, useMemo } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDWeatherPayload, HUDLevelInfoPayload } from '@shared/events';

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

export default function HUDWeatherBar() {
  const [weather, setWeather] = useState<HUDWeatherPayload | null>(null);
  const [levelName, setLevelName] = useState('');

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (_payload: HUDLevelInfoPayload) => {
    setLevelName(_payload.name);
    // Reset weather on level change
    setWeather(null);
  });

  usePhaserEvent(GAME_EVENTS.HUD_WEATHER, (payload: HUDWeatherPayload) => {
    setWeather(payload);
  });

  // Normalise temperature to 0-100 scale for the bar fill (always before any early return)
  const tempBarValue = useMemo(() => {
    if (weather?.temperature === undefined) return 0;
    // Evaporation scene maps 25–75°C; clamp to 0–100
    return Math.max(0, Math.min(100, ((weather.temperature - 20) / 60) * 100));
  }, [weather?.temperature]);

  const fillHue = useMemo(() => tempToHue(tempBarValue), [tempBarValue]);

  // Only show during active gameplay (level loaded)
  if (!levelName || levelName === 'World Map') return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2.5 px-3 py-1 bg-storm-dark/70 border-b border-black/20">
      {weather?.temperature !== undefined && (
        <div className="flex items-center gap-1 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-sm">🌡</span>
          {/* Spectrum bar */}
          <div className="relative w-16 sm:w-20 h-2.5 rounded-full overflow-hidden border border-white/20 bg-black/30">
            {/* Full spectrum background */}
            <div className="absolute inset-0 rounded-full" style={{ background: SPECTRUM_GRADIENT }} />
            {/* Fill mask — right side darkens the unfilled portion */}
            <div
              className="absolute inset-y-0 right-0 rounded-r-full bg-black/55 transition-all duration-300"
              style={{ width: `${100 - tempBarValue}%` }}
            />
            {/* Glowing knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-[0_0_4px_rgba(255,255,255,0.6)] transition-all duration-300"
              style={{
                left: `calc(${tempBarValue}% - 4px)`,
                backgroundColor: `hsl(${fillHue}, 100%, 55%)`,
              }}
            />
          </div>
          <span className="font-display text-[11px] text-white tabular-nums min-w-[2.5rem]">{weather.temperature}°C</span>
        </div>
      )}
      {weather?.humidity !== undefined && (
        <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-sm">💧</span>
          <span className="font-display text-[11px] text-ocean-surface tabular-nums">{weather.humidity}%</span>
        </div>
      )}
      {weather?.windSpeed !== undefined && (
        <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-sm">💨</span>
          <span className="font-display text-[11px] text-white tabular-nums">{weather.windSpeed}</span>
        </div>
      )}
      {weather?.stormLevel !== undefined && (
        <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-sm">🌀</span>
          <span className="font-display text-[11px] text-warning-orange tabular-nums">{weather.stormLevel}</span>
        </div>
      )}
      {weather?.powerup && (
        <div className="flex items-center gap-0.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-sm">⚡</span>
          <span className="font-display text-[11px] text-accent-yellow">{weather.powerup}</span>
        </div>
      )}

      {/* If no weather data yet, show a simple hint */}
      {!weather && (
        <span className="font-display text-[10px] text-storm-light/60">Waiting for weather data...</span>
      )}
    </div>
  );
}
