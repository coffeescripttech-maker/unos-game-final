import { useState, useCallback, useEffect } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDResultPayload } from '@shared/events';
import type { LevelId } from '@shared/types';
import { EDUCATIONAL_FACTS, LEVEL_CONFIGS } from '@shared/constants';
import { GameManager } from '../../game/managers/GameManager';
import { speakPraise, speak } from '../../services/speech';

/** One-line "what happens next" teaser shown after every win (R4). */
const NEXT_PREVIEW: Record<string, { icon: string; text: string }> = {
  tutorial: { icon: '☀️', text: 'Next: heat the ocean until water turns into vapor.' },
  evaporation: { icon: '☁️', text: 'Next: the vapor rises, cools, and condenses into clouds.' },
  condensation: { icon: '💨', text: 'Next: air pressure differences create the wind.' },
  pressure: { icon: '🌀', text: "Next: Earth's spin curves the wind into a swirling storm." },
  rotation: { icon: '🌪️', text: 'Next: combine heat, vapor, pressure, and spin to form a typhoon.' },
  typhoon: { icon: '🚤', text: 'Next: sail into the storm and collect real weather data.' },
  boss: { icon: '🏆', text: 'You completed the whole campaign. You are a storm scientist!' },
};

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

  // Praise (or encourage) out loud whenever the result card appears.
  useEffect(() => {
    if (!result) return;
    if (result.type === 'complete') {
      speakPraise(`${result.stars} star${result.stars === 1 ? '' : 's'}!`);
    } else {
      speak('Good try! Let us try again.');
    }
  }, [result]);

  if (!result) return null;

  const fact = EDUCATIONAL_FACTS.find(f => result.factsUnlocked.includes(f.id));
  const starDisplay = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
  const isWin = result.type === 'complete';

  const nextLevel = isWin ? GameManager.getNextLevel(result.levelId as LevelId) : null;
  const preview = isWin ? NEXT_PREVIEW[result.levelId] : null;
  const nextName = nextLevel
    ? LEVEL_CONFIGS[nextLevel]?.name ?? nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1)
    : null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-2">
      <div className="retro-card modal-card max-w-sm w-[95%] max-h-[95vh] overflow-y-auto text-center space-y-3 !bg-ocean-deep">
        {/* Title */}
        <div
          className={`font-display text-3xl ${isWin ? 'text-accent-green' : 'text-warning-red'}`}
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          {result.title}
        </div>

        {result.subtitle && (
          <div className="font-body text-base text-white/75">{result.subtitle}</div>
        )}

        {/* Stars */}
        <div className="font-display text-3xl text-accent-yellow" style={{ textShadow: '1px 1px 0px #000' }}>
          {starDisplay}
        </div>

        {/* Score */}
        <div className="retro-card !bg-storm-dark !p-3 !border-white/20">
          <div className="font-display text-sm text-white/60 uppercase tracking-wider">Score</div>
          <div className="font-display text-3xl text-accent-yellow">{result.score.toLocaleString()}</div>
        </div>

        {/* Educational Fact */}
        {fact && (
          <div className="retro-card !bg-ocean-mid/50 !p-3 !border-accent-yellow/30">
            <div className="font-display text-sm text-accent-yellow mb-1">💡 Science Fact</div>
            <div className="font-body text-sm text-white/90 leading-relaxed">{fact.text}</div>
            <div className="font-body text-xs text-white/40 mt-1">— {fact.source}</div>
          </div>
        )}

        {/* What happens next (R4: keep learning continuous) */}
        {preview && (
          <div className="retro-card !bg-ocean-surface/15 !p-3 !border-ocean-surface/50 text-left">
            <div className="font-display text-xs text-ocean-surface uppercase tracking-wider mb-1">
              {nextLevel ? '🔭 What happens next' : '🏁 Campaign complete'}
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xl leading-none">{preview.icon}</span>
              <div className="min-w-0">
                {nextName && (
                  <div className="font-display text-sm text-white">{nextName}</div>
                )}
                <div className="font-body text-xs text-white/80 leading-snug mt-0.5">
                  {preview.text}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue button (sticky so it is reachable on short screens) */}
        <div className="result-cta">
          <button
            onClick={handleContinue}
            className={`retro-btn w-full text-base ${
              isWin ? 'retro-btn-success' : 'retro-btn-primary'
            }`}
          >
            {nextLevel ? '→ Next Level' : isWin ? '→ Back to Map' : 'Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}
