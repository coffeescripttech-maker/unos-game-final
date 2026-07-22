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
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="relative flex items-center px-5 py-3 bg-storm-dark/90 border-b-3 border-black shadow-lg shadow-black/30 pointer-events-auto">
        <button
          onClick={handleBack}
          className="retro-btn bg-storm-mid text-white text-sm flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          Back
        </button>
        <h1
          className="absolute left-1/2 -translate-x-1/2 text-2xl font-display text-accent-yellow flex items-center gap-2 whitespace-nowrap"
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
          World Map
        </h1>
      </div>
    </div>
  );
}
