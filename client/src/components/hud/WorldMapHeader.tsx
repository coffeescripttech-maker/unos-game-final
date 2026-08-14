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
    <div className="world-map-header absolute top-2 left-2 z-30 pointer-events-none">
      <button
        onClick={handleBack}
        className="world-map-back retro-btn bg-storm-mid text-white text-sm flex items-center gap-1.5 pointer-events-auto shadow-retro"
        aria-label="Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 19-7-7 7-7"></path>
          <path d="M19 12H5"></path>
        </svg>
        <span className="back-label">Back</span>
      </button>
    </div>
  );
}
