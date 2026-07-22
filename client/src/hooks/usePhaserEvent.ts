import { useEffect } from 'react';
import { useGameContext } from '../contexts/GameContext';

/**
 * Subscribe to a Phaser event from within a React component.
 * Automatically cleans up on unmount.
 */
export function usePhaserEvent(
  eventName: string,
  handler: (...args: any[]) => void,
) {
  const { game } = useGameContext();

  useEffect(() => {
    if (!game) return;

    game.events.on(eventName, handler);
    return () => {
      game.events.off(eventName, handler);
    };
  }, [game, eventName, handler]);
}
