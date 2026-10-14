import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { TrackingCompletePayload } from '@shared/events';
import {
  PAST_TRACK,
  NEXT_OPTIONS,
  FORECAST_CONE,
  LANDFALL_CONTEXT,
  TRACKING_QUESTION,
  TRACKING_FACT,
} from '../../game/TrackingData';

const TITLE_SHADOW = 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]';
const LABEL_SHADOW = 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]';

type Phase = 'track' | 'signal' | 'done';

/** Simplified Philippine archipelago used as the tracking chart backdrop. */
function PhilippinesSilhouette() {
  return (
    <g opacity="0.9">
      {/* Luzon */}
      <polygon
        points="150,86 170,94 176,116 160,130 138,120 130,100"
        fill="#1b4332"
        stroke="#2d6a4f"
        strokeWidth="1.5"
      />
      <text x="152" y="112" fill="#95d5b2" fontSize="8" fontFamily="monospace">LUZON</text>
      {/* Visayas */}
      <ellipse cx="158" cy="156" rx="9" ry="10" fill="#1b4332" stroke="#2d6a4f" strokeWidth="1.5" />
      <ellipse cx="146" cy="170" rx="7" ry="8" fill="#1b4332" stroke="#2d6a4f" strokeWidth="1.5" />
      <ellipse cx="172" cy="166" rx="6" ry="7" fill="#1b4332" stroke="#2d6a4f" strokeWidth="1.5" />
      <text x="130" y="158" fill="#95d5b2" fontSize="7" fontFamily="monospace">VISAYAS</text>
      {/* Mindanao */}
      <polygon
        points="150,198 178,194 186,214 170,232 146,228 138,210"
        fill="#1b4332"
        stroke="#2d6a4f"
        strokeWidth="1.5"
      />
      <text x="150" y="216" fill="#95d5b2" fontSize="8" fontFamily="monospace">MINDANAO</text>
    </g>
  );
}

/**
 * Typhoon Tracking challenge — after the final science quiz and before the
 * results screen. It has two steps:
 *   1. Track: infer the storm's next position along the WNP west/northwest track.
 *   2. Signal: convert the storm's intensity into a PAGASA TCWS warning.
 */
export default function TrackingOverlay() {
  const { game } = useGameContext();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('track');
  const [mistakes, setMistakes] = useState(0);
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [signalPick, setSignalPick] = useState<number | null>(null);
  const [announce, setAnnounce] = useState<string>('');

  usePhaserEvent(GAME_EVENTS.HUD_TRACKING_ALERT, () => {
    setVisible(true);
    setPhase('track');
    setMistakes(0);
    setWrongOption(null);
    setSignalPick(null);
    setAnnounce('');
  });

  const handleTrackPick = useCallback((id: string) => {
    const opt = NEXT_OPTIONS.find(o => o.id === id);
    if (!opt) return;
    if (opt.correct) {
      setAnnounce('✅ Correct! Steering winds push it west-northwest.');
      setWrongOption(null);
      setPhase('signal');
    } else {
      setMistakes(m => Math.min(m + 1, 2));
      setWrongOption(id);
      setAnnounce('❌ Not likely — WNP typhoons are steered west/northwest by the subtropical ridge.');
    }
  }, []);

  const handleSignalPick = useCallback((idx: number) => {
    if (signalPick !== null) return;
    setSignalPick(idx);
    if (idx !== TRACKING_QUESTION.answer) {
      setMistakes(m => m + 1);
    }
  }, [signalPick]);

  const handleFinish = useCallback(() => {
    const correct = Math.max(0, 2 - mistakes);
    const bonus = Math.max(0, 300 - mistakes * 100);
    const payload: TrackingCompletePayload = { correct, total: 2, bonus };
    setVisible(false);
    if (game) game.events.emit(GAME_EVENTS.HUD_TRACKING_COMPLETE, payload);
  }, [game, mistakes]);

  if (!visible) return null;

  const last = PAST_TRACK[PAST_TRACK.length - 1];

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-2">
      <div className="retro-card modal-card !bg-storm-dark border-accent-yellow/50 shadow-[0_0_20px_rgba(255,215,0,0.25)] w-full max-w-lg max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col gap-3 pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`font-display text-sm uppercase tracking-widest text-accent-yellow ${LABEL_SHADOW}`}>
            🛰️ Typhoon Tracking
          </span>
          <span className={`font-body text-xs uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>
            PAGASA Watch
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 -mt-1">
          <span className={`text-xs font-display ${phase === 'track' ? 'text-accent-yellow' : 'text-accent-green'}`}>
            1. Track
          </span>
          <span className="text-white/30">›</span>
          <span className={`text-xs font-display ${phase === 'signal' ? 'text-accent-yellow' : phase === 'done' ? 'text-accent-green' : 'text-white/40'}`}>
            2. Wind Signal
          </span>
        </div>

        {/* ── Step 1: Track ── */}
        {phase === 'track' && (
          <>
            <p className={`text-center font-body text-sm text-storm-light/90 ${LABEL_SHADOW}`}>
              The storm was monitored for 3 days. Where will it go next? Tap the most likely next position.
            </p>

            <div className="flex justify-center">
              <svg viewBox="0 0 400 300" className="w-full max-w-[380px] h-auto select-none" role="img" aria-label="Typhoon tracking chart">
                <rect x="0" y="0" width="400" height="300" rx="10" fill="#0b1d33" opacity="0.7" />
                {/* grid */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <line key={`v${i}`} x1={40 + i * 53} y1="10" x2={40 + i * 53} y2="290" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={`h${i}`} x1="10" y1={50 + i * 53} x2="390" y2={50 + i * 53} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}

                <PhilippinesSilhouette />

                {/* Past track line */}
                <polyline
                  points={PAST_TRACK.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#ffd166"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Forecast cone (grows past the last point) */}
                <polygon
                  points={`${last.x},${last.y} ${FORECAST_CONE.end.x},${FORECAST_CONE.end.y - FORECAST_CONE.spread} ${FORECAST_CONE.end.x},${FORECAST_CONE.end.y + FORECAST_CONE.spread}`}
                  fill="rgba(255,209,102,0.12)"
                  stroke="rgba(255,209,102,0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Past points */}
                {PAST_TRACK.map(p => (
                  <g key={p.id}>
                    <circle cx={p.x} cy={p.y} r="7" fill="#ffd166" stroke="#000" strokeWidth="1.5" />
                    <text x={p.x} y={p.y + 3.5} textAnchor="middle" fill="#0d0d1a" fontSize="7" fontWeight="bold">{p.id}</text>
                    <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#ffe9a8" fontSize="8" fontFamily="monospace">{p.label}</text>
                  </g>
                ))}

                {/* Candidate next positions */}
                {NEXT_OPTIONS.map(o => {
                  const isWrong = wrongOption === o.id;
                  return (
                    <g key={o.id} className="cursor-pointer" onClick={() => handleTrackPick(o.id)}>
                      <circle
                        cx={o.x}
                        cy={o.y}
                        r="16"
                        fill={isWrong ? 'rgba(230,57,70,0.25)' : 'rgba(255,255,255,0.06)'}
                        stroke={isWrong ? '#e63946' : '#ffffff'}
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      >
                        {!isWrong && (
                          <animate attributeName="r" values="15;18;15" dur="1.3s" repeatCount="indefinite" />
                        )}
                      </circle>
                      <text x={o.x} y={o.y + 4} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">?</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        )}

        {/* ── Step 2: Wind Signal ── */}
        {phase === 'signal' && (
          <>
            <p className={`text-center font-body text-sm text-accent-green ${LABEL_SHADOW}`}>
              ✅ Track plotted — the storm is moving west-northwest toward Luzon.
            </p>
            <p className={`text-center font-body text-sm text-storm-light/90 ${LABEL_SHADOW}`}>{LANDFALL_CONTEXT}</p>
            <h2 className={`font-display text-base text-accent-yellow text-center ${TITLE_SHADOW}`}>
              {TRACKING_QUESTION.q}
            </h2>
            <div className="flex flex-col gap-1.5">
              {TRACKING_QUESTION.options.map((opt, i) => {
                const picked = signalPick === i;
                const isCorrect = i === TRACKING_QUESTION.answer;
                let cls = 'retro-btn text-sm py-2 font-body transition-all ';
                if (signalPick === null) cls += 'bg-storm-mid/60 border-storm-mid text-white hover:bg-storm-light hover:border-accent-yellow';
                else if (isCorrect) cls += 'bg-accent-green/30 border-accent-green text-white';
                else if (picked) cls += 'bg-warning-red/30 border-warning-red text-white';
                else cls += 'bg-storm-mid/50 border-storm-mid text-storm-light opacity-60';
                return (
                  <button key={i} disabled={signalPick !== null} onClick={() => handleSignalPick(i)} className={cls}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {signalPick !== null && (
              <div className="bg-black/25 border border-white/10 rounded-md p-2.5 font-body text-sm text-storm-light leading-relaxed">
                <span className="text-accent-yellow font-bold">
                  {signalPick === TRACKING_QUESTION.answer ? '✅ Correct!' : '❌ Not quite.'}
                </span>
                <div className={`mt-0.5 ${LABEL_SHADOW}`}>{TRACKING_QUESTION.fact}</div>
              </div>
            )}
            {signalPick !== null && (
              <button onClick={() => setPhase('done')} className="retro-btn-primary w-full font-display text-base">
                See Summary ›
              </button>
            )}
          </>
        )}

        {/* ── Step 3: Summary ── */}
        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">🛰️</div>
            <h2 className={`font-display text-xl text-accent-yellow ${TITLE_SHADOW}`}>Track Complete!</h2>
            <p className={`font-body text-sm text-storm-light ${LABEL_SHADOW}`}>
              You plotted the storm and identified the correct wind signal.
            </p>
            <div className="bg-ocean-deep/60 border-l-2 border-accent-yellow rounded-sm p-3 text-left">
              <span className="text-accent-yellow font-bold block mb-0.5 text-sm">🌍 Why tracking matters:</span>
              <span className="text-white/85 font-body text-sm leading-relaxed">{TRACKING_FACT}</span>
            </div>
            <p className={`font-body text-xs text-white/50 ${LABEL_SHADOW}`}>
              {Math.max(0, 2 - mistakes)} / 2 first-try correct
            </p>
            <button onClick={handleFinish} className="retro-btn-primary w-full font-display text-base animate-pulse-subtle">
              ▶ Finish Mission
            </button>
          </div>
        )}

        {/* Feedback banner (track step) */}
        {phase === 'track' && announce && (
          <div className={`text-center font-body text-sm rounded-md p-2 border ${
            announce.startsWith('✅')
              ? 'text-accent-green bg-accent-green/10 border-accent-green/40'
              : 'text-warning-red bg-warning-red/10 border-warning-red/40'
          }`}>
            {announce}
          </div>
        )}
      </div>
    </div>
  );
}
