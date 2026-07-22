import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import type { HUDWeatherPayload, HUDLevelInfoPayload } from '@shared/events';

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

  // Only show during active gameplay (level loaded)
  if (!levelName || levelName === 'World Map') return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-5 sm:gap-8 px-5 py-3 bg-storm-dark/85 border-t-3 border-black/30 shadow-lg shadow-black/30">
      {weather?.temperature !== undefined && (
        <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-xl">🌡</span>
          <span className="font-display text-base text-white tabular-nums">{weather.temperature}°C</span>
        </div>
      )}
      {weather?.humidity !== undefined && (
        <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-xl">💧</span>
          <span className="font-display text-base text-ocean-surface tabular-nums">{weather.humidity}%</span>
        </div>
      )}
      {weather?.windSpeed !== undefined && (
        <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-xl">💨</span>
          <span className="font-display text-base text-white tabular-nums">{weather.windSpeed} km/h</span>
        </div>
      )}
      {weather?.stormLevel !== undefined && (
        <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-xl">🌀</span>
          <span className="font-display text-base text-warning-orange tabular-nums">Lv.{weather.stormLevel}</span>
        </div>
      )}
      {weather?.powerup && (
        <div className="flex items-center gap-1.5 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
          <span className="text-xl">⚡</span>
          <span className="font-display text-base text-accent-yellow">{weather.powerup}</span>
        </div>
      )}

      {/* If no weather data yet, show a simple hint */}
      {!weather && (
        <span className="font-display text-xs text-storm-light/60">Waiting for weather data...</span>
      )}
    </div>
  );
}
