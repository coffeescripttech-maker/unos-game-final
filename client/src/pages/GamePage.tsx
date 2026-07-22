import { useNavigate } from 'react-router-dom';
import { GameProvider, useGameContext } from '../contexts/GameContext';
import { usePhaserEvent } from '../hooks/usePhaserEvent';
import { GAME_EVENTS } from '@shared/events';
import GameCanvas from '../components/GameCanvas';
import GameHUD from '../components/GameHUD';

function GameContent() {
  const navigate = useNavigate();

  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => {
    navigate('/');
  });

  return (
    <div className="absolute inset-0">
      <GameCanvas />
      <GameHUD />
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
            'radial-gradient(ellipse at center, #1e5aa0 0%, #0a2472 50%, #060a1a 100%)'
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
