import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLevelInfoPayload } from '@shared/events';

export default function WorldMapHeader() {
  const { game } = useGameContext();
  const [visible, setVisible] = useState(false);

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setVisible(payload.name === 'World Map');
  });

  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => setVisible(false));

  const handleBack = () => {
    if (!game) return;
    setVisible(false);
    game.events.emit(GAME_EVENTS.NAVIGATE_HOME);
  };

  if (!visible) return null;

  return (
    <div className="world-map-header absolute top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="relative flex items-center justify-between px-4 py-2 bg-storm-dark/80 border-b-3 border-black shadow-lg shadow-black/30 pointer-events-auto">
        <h1
          className="world-map-title text-lg font-display text-accent-yellow flex items-center gap-1.5"
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
          <span className="title-label">World Map</span>
        </h1>

        <button
          onClick={handleBack}
          className="world-map-back retro-btn bg-storm-mid text-white text-sm flex items-center gap-1.5"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          <span className="back-label">Back</span>
        </button>
      </div>
    </div>
  );
}
