import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTutorialStepPayload } from '@shared/events';

const DOT_COLORS: Record<string, string> = {
  beacon: 'bg-[#d62828]',
  streams: 'bg-[#6db3e6]',
  burst: 'bg-[#ffd166]',
  complete: 'bg-[#06d6a0]',
};

const STEP_LABELS = ['Alert Beacon', 'Data Streams', 'Burst Calibration', 'Complete'];

export default function TutorialStepOverlay() {
  const { game } = useGameContext();
  const [step, setStep] = useState<HUDTutorialStepPayload | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_TUTORIAL_STEP, (payload: HUDTutorialStepPayload) => {
    setStep(payload);
  });

  usePhaserEvent(GAME_EVENTS.HUD_TUTORIAL_HIDE, () => {
    setStep(null);
  });

  const handleSkip = useCallback(() => {
    if (!game) return;
    game.events.emit(GAME_EVENTS.HUD_TUTORIAL_SKIP);
    setStep(null);
  }, [game]);

  const handleContinue = useCallback(() => {
    if (!game) return;
    // Let Phaser handle the navigation + progress saving
    game.events.emit(GAME_EVENTS.HUD_TUTORIAL_CONTINUE);
    setStep(null);
  }, [game]);

  if (!step) return null;

  const { currentStep, totalSteps, task, instruction, stepId } = step;

  // ═══════════════════════════════════════════
  //  COMPLETE MODE — Full-screen success modal
  // ═══════════════════════════════════════════

  if (stepId === 'complete') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-300">
        <div className="retro-card max-w-sm w-[85%] !bg-storm-dark !overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Badge */}
          <div className="flex justify-center -mt-1">
            <span className="retro-badge bg-[#06d6a0] text-white text-xs px-6 py-1 -translate-y-1/2">
              ✓ TRAINING COMPLETE
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-display text-2xl text-[#06d6a0] text-center mt-2"
            style={{ textShadow: '2px 2px 0px #000000' }}
          >
            Briefing Complete
          </h2>

          {/* Subtitle */}
          <p
            className="font-body text-sm text-white/60 text-center mt-1 mb-3"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}
          >
            All systems operational!
          </p>

          {/* Decorative divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#06d6a0]/50 to-transparent mx-2 mb-4" />

          {/* Description */}
          <p className="font-body text-xs text-white/40 text-center px-4 leading-relaxed">
            You've completed the research base briefing.
            <br />
            Head to the World Map to begin your fieldwork!
          </p>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="retro-btn retro-btn-primary w-full mt-6 text-sm animate-pulse-subtle"
          >
            ▶  Continue to World Map
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  NORMAL MODE — Step indicator + instructions
  // ═══════════════════════════════════════════

  return (
    <div className="absolute top-0 left-0 right-0 z-40">
      {/* Dim background for readability */}
      <div className="absolute inset-0 h-[140px] bg-gradient-to-b from-black/70 via-black/40 to-transparent pointer-events-none" />

      {/* ── Step progress dots (bigger) ── */}
      <div className="relative flex items-center justify-center gap-0 pt-5 pointer-events-auto">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isPast = i < currentStep;
          const isCurrent = i === currentStep;

          return (
            <div key={i} className="flex items-center">
              {/* Connector line between dots */}
              {i > 0 && (
                <div
                  className={`w-8 h-0.5 ${
                    i <= currentStep ? 'bg-accent-yellow/60' : 'bg-white/10'
                  }`}
                />
              )}
              <div className="flex flex-col items-center relative">
                {/* Dot — bigger: w-4 h-4 */}
                <div
                  className={`rounded-full border-2 transition-all duration-300 ${
                    isPast
                      ? 'w-4 h-4 bg-[#06d6a0] border-[#06d6a0]'
                      : isCurrent
                      ? `w-5 h-5 ${DOT_COLORS[stepId]} border-white/70`
                      : 'w-4 h-4 bg-white/10 border-white/15'
                  }`}
                />
                {/* Label below dot */}
                {isCurrent && (
                  <span className="text-[10px] font-semibold text-white/50 mt-1.5 whitespace-nowrap absolute top-full left-1/2 -translate-x-1/2">
                    {STEP_LABELS[i]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task + instruction ── */}
      <div className="relative text-center mt-6 px-6 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
        <h2
          className="font-display text-xl text-accent-yellow"
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          {task}
        </h2>
        <p
          className="font-body text-sm text-white/90 mt-1 max-w-md mx-auto"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}
        >
          {instruction}
        </p>
      </div>

      {/* ── Skip button ── */}
      <div className="absolute top-4 right-5 pointer-events-auto">
        <button
          onClick={handleSkip}
          className="retro-btn bg-storm-mid text-gray-400 hover:text-white text-sm px-4 py-1.5"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
