import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDResultPayload } from '@shared/events';
import { EDUCATIONAL_FACTS } from '@shared/constants';

export default function ResultOverlay() {
  const { game } = useGameContext();
  const [result, setResult] = useState<HUDResultPayload | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_RESULT, (payload: HUDResultPayload) => {
    setResult(payload);
  });

  const handleContinue = useCallback(() => {
    if (!game) return;
    game.events.emit(GAME_EVENTS.HUD_CONTINUE);
    setResult(null);
  }, [game]);

  if (!result) return null;

  const fact = EDUCATIONAL_FACTS.find(f => result.factsUnlocked.includes(f.id));
  const starDisplay = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
  const isWin = result.type === 'complete';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="retro-card max-w-sm w-[90%] text-center space-y-4 !bg-ocean-deep">
        {/* Title */}
        <div
          className={`font-display text-3xl ${isWin ? 'text-accent-green' : 'text-warning-red'}`}
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          {result.title}
        </div>

        {result.subtitle && (
          <div className="font-body text-sm text-white/70">{result.subtitle}</div>
        )}

        {/* Stars */}
        <div className="font-display text-2xl text-accent-yellow" style={{ textShadow: '1px 1px 0px #000' }}>
          {starDisplay}
        </div>

        {/* Score */}
        <div className="retro-card !bg-storm-dark !p-3 !border-white/20">
          <div className="font-display text-xs text-white/60 uppercase tracking-wider">Score</div>
          <div className="font-display text-2xl text-accent-yellow">{result.score.toLocaleString()}</div>
        </div>

        {/* Educational Fact */}
        {fact && (
          <div className="retro-card !bg-ocean-mid/50 !p-3 !border-accent-yellow/30">
            <div className="font-display text-xs text-accent-yellow mb-1">💡 Did you know?</div>
            <div className="font-body text-xs text-white/90 leading-relaxed">{fact.text}</div>
            <div className="font-body text-[10px] text-white/40 mt-1">— {fact.source}</div>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className={`retro-btn w-full text-sm ${
            isWin ? 'retro-btn-success' : 'retro-btn-primary'
          }`}
        >
          {isWin ? 'Continue →' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
