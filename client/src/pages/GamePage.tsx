import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameProvider, useGameContext } from '../contexts/GameContext';
import { usePhaserEvent } from '../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import GameCanvas from '../components/GameCanvas';
import GameHUD from '../components/GameHUD';
import RotateDeviceOverlay from '../components/RotateDeviceOverlay';

function GameContent() {
  const navigate = useNavigate();

  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => {
    navigate('/');
  });

  useEffect(() => {
    const lockLandscape = async () => {
      try {
        const orientation = (screen as Screen & { orientation?: { lock?: (orientation: string) => Promise<void> } }).orientation;
        if (orientation?.lock) {
          await orientation.lock('landscape');
        }
      } catch {
        // Ignore: lock may be denied on some devices / iframes / desktops
      }
    };

    const mobileSized = window.innerWidth < 1024 && Math.min(window.innerWidth, window.innerHeight) < 600;
    if (mobileSized) {
      void lockLandscape();
    }
  }, []);

  return (
    <div className="absolute inset-0">
      <GameCanvas />
      <GameHUD />
      <RotateDeviceOverlay />
    </div>
  );
}

export default function GamePage() {
  return (
    <GameProvider>
      <div
        className="w-full h-full flex flex-col relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 50%, #000000 100%)'
        }}>
        {/* Subtle ambient glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.8) 100%)'
          }}
        />
        <GameContent />
      </div>
    </GameProvider>
  );
}
