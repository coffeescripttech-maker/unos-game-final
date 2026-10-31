import { useState, useCallback, useEffect } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { GuidedPreviewPayload } from '@shared/events';
import { speakSequence, stopSpeaking } from '../../services/speech';

/**
 * Guided preview — a short, animated "here's what will happen" walkthrough that
 * runs after the intro card and before the level starts. It exists so kids can
 * visualize the mechanic (especially Level 2 condensation) before touching it.
 */
export default function GuidedPreviewOverlay() {
  const { game } = useGameContext();
  const [preview, setPreview] = useState<GuidedPreviewPayload | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_GUIDED_PREVIEW, (payload: GuidedPreviewPayload) => {
    if (!payload) return;
    setPreview(payload);
  });

  const dismiss = useCallback(() => {
    stopSpeaking();
    setPreview(null);
    game?.events.emit(GAME_EVENTS.HUD_GUIDED_PREVIEW_DONE);
  }, [game]);

  useEffect(() => {
    if (!preview) return;
    speakSequence([preview.title, ...preview.steps.map(s => s.text)]);
    return () => stopSpeaking();
  }, [preview]);

  // Enter / Space also starts the level.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, dismiss]);

  if (!preview) return null;

  const isCondensation = preview.levelId === 'condensation';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-2">
      <div className="retro-card modal-card guided-preview-modal max-w-lg w-[96%] max-h-[96vh] overflow-y-auto !bg-storm-dark animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="font-display text-xs text-ocean-surface uppercase tracking-[0.2em]">
            👀 Watch first
          </div>
          <div
            className="font-display text-2xl sm:text-3xl text-accent-yellow mt-1"
            style={{ textShadow: '2px 2px 0px #000000' }}
          >
            {preview.title}
          </div>
          {preview.subtitle && (
            <div className="font-body text-sm text-white/70 mt-1">{preview.subtitle}</div>
          )}
        </div>

        {isCondensation && <CondensationDiagram />}

        <div className="space-y-2 mt-3">
          {preview.steps.map((s, i) => (
            <div
              key={i}
              className="guided-preview-step flex items-center gap-3 p-2 rounded-sm bg-black/25 border-l-3 border-ocean-surface/70"
            >
              <span className="text-lg shrink-0 w-6 text-center">{s.icon}</span>
              <span className="font-body text-sm text-white/90 leading-snug">{s.text}</span>
            </div>
          ))}
        </div>

        <div className="guided-preview-cta">
          <button
            onClick={dismiss}
            className="retro-btn retro-btn-primary w-full mt-4 text-base animate-pulse-subtle"
          >
            {preview.cta ?? '▶ Start the level'}
          </button>
          <div className="text-center mt-2">
            <button
              onClick={dismiss}
              className="font-body text-xs text-white/50 hover:text-white/80 underline"
            >
              Skip preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini "where does each bubble go?" diagram for Level 2.
 * Blue = heavy vapor → warm ocean air (bottom)
 * White = light vapor → cold sky (top)
 * Yellow = normal vapor → middle / sweet spot
 */
function CondensationDiagram() {
  return (
    <div className="condensation-diagram mt-3 rounded-md border-2 border-black overflow-hidden">
      <div className="condensation-layer condensation-layer--cold">
        <span className="condensation-layer__label">❄️ COLD SKY · light vapor goes here</span>
        <span className="condensation-bubble condensation-bubble--white">⚪</span>
      </div>
      <div className="condensation-layer condensation-layer--mid">
        <span className="condensation-layer__label">✨ MIDDLE · normal vapor (sweet spot)</span>
        <span className="condensation-bubble condensation-bubble--yellow">✨</span>
      </div>
      <div className="condensation-layer condensation-layer--warm">
        <span className="condensation-layer__label">🌊 WARM OCEAN AIR · heavy vapor goes here</span>
        <span className="condensation-bubble condensation-bubble--blue">💧</span>
      </div>
      <div className="condensation-zone-row">
        <span className="condensation-zone">❄ Drag a cold zone to a layer</span>
        <span className="condensation-zone">👆 Then tap it to release cold air</span>
      </div>
    </div>
  );
}
