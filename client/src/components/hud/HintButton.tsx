import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLevelInfoPayload } from '@shared/events';

/**
 * Floating 💡 Hint button.
 *
 * Kids can tap it at any time to re-open the current level's instructions
 * (the same card the 📖 button shows). The game pauses while the guide is open
 * so nothing is missed.
 */
export default function HintButton() {
  const { game } = useGameContext();
  const [active, setActive] = useState(false);

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setActive(!!payload?.name && payload.name !== 'World Map');
  });

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INTRO, () => setActive(false));
  usePhaserEvent(GAME_EVENTS.HUD_INTRO_DISMISS, () => setActive(true));
  usePhaserEvent(GAME_EVENTS.HUD_RESULT, () => setActive(false));
  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => setActive(false));

  const handleHint = useCallback(() => {
    game?.events.emit(GAME_EVENTS.HUD_REQUEST_INTRO);
  }, [game]);

  if (!active) return null;

  return (
    <button
      onClick={handleHint}
      className="hint-button absolute right-3 bottom-20 sm:bottom-24 z-20 flex items-center gap-1.5 rounded-md border-2 border-black bg-accent-yellow px-3 py-2 font-display text-sm text-storm-dark shadow-retro transition-transform hover:brightness-110 active:scale-95"
      title="Show a hint / the instructions"
      aria-label="Show a hint"
    >
      <span className="text-base leading-none">💡</span>
      <span>Hint</span>
    </button>
  );
}
