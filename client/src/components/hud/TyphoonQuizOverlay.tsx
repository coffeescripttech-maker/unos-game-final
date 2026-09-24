import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import { TYPHOON_QUIZ_QUESTIONS } from '../../game/TyphoonQuizData';
import type { TyphoonQuizQuestion } from '../../game/TyphoonQuizData';
import { telemetry } from '../../services/telemetry';

const TITLE_SHADOW = 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]';
const LABEL_SHADOW = 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]';

interface TyphoonQuizPayload {
  topic: string;
  questions: TyphoonQuizQuestion[];
  /** 'gate' = mid-level unlock challenge (1 question, retry until correct) */
  mode?: 'gate' | 'final';
}

/**
 * Full-screen science quiz overlay for Typhoon Formation.
 * Two modes: 'gate' — a 1-question unlock challenge mid-level (wrong answers
 * reshuffle the options and let the learner retry); default/final — the bonus
 * round shown after formation.
 * Uses the same retro modal styling as the boss-level quiz.
 * Fires HUD_TYPHOON_QUIZ_COMPLETE with (correct, total) back to Phaser.
 */
export default function TyphoonQuizOverlay() {
  const { game } = useGameContext();
  const [payload, setPayload] = useState<TyphoonQuizPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  // Display order of options — reshuffled on gate-quiz retries so learners re-read
  const [order, setOrder] = useState<number[]>([]);

  // Receive quiz trigger from Phaser — either an unlock gate (mid-level)
  // or the science bonus round (after successful typhoon formation)
  usePhaserEvent(GAME_EVENTS.HUD_TYPHOON_QUIZ, (p: TyphoonQuizPayload) => {
    setPayload(p);
    setIndex(0);
    setSelected(null);
    setCorrect(0);
    setFinished(false);
    setOrder(p.questions[0]?.options.map((_, i) => i) ?? []);
  });

  const current = payload?.questions[index];
  const isLast = payload !== null && index === payload.questions.length - 1;
  const isGate = payload?.mode === 'gate';

  const handleAnswer = useCallback((displayIdx: number) => {
    if (selected !== null || !current) return;
    const orig = order[displayIdx] ?? displayIdx;
    telemetry.log('quiz_answer', {
      level: 'typhoon', mode: isGate ? 'gate' : 'final',
      topic: payload?.topic, question: current.q, correct: orig === current.answer,
    });
    setSelected(orig);
    if (orig === current.answer) setCorrect(c => c + 1);
  }, [selected, current, order, isGate, payload]);

  const handleComplete = useCallback(() => {
    if (!game || !payload) return;
    // Send result back to Phaser
    game.events.emit(GAME_EVENTS.HUD_TYPHOON_QUIZ_COMPLETE, {
      correct,
      total: payload.questions.length,
    });
    setPayload(null);
  }, [game, payload, correct]);

  const handleNext = useCallback(() => {
    // Gate quiz: correct → unlock next element; wrong → shuffle and retry
    if (isGate) {
      if (selected !== null && selected === current?.answer) {
        handleComplete();
      } else {
        setOrder((prev) => (prev.length > 1 ? [...prev].sort(() => Math.random() - 0.5) : prev));
        setSelected(null);
      }
      return;
    }
    if (isLast) {
      setFinished(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
      setOrder(payload?.questions[index + 1]?.options.map((_, i) => i) ?? []);
    }
  }, [isGate, isLast, selected, current, handleComplete, payload, index]);

  if (!payload) return null;

  const progress = ((index + (selected !== null ? 1 : 0)) / payload.questions.length) * 100;

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/80 p-2">
      <div className="retro-card modal-card !bg-storm-dark border-accent-yellow/50 shadow-[0_0_20px_rgba(255,215,0,0.25)] w-full max-w-lg max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col gap-4 pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`font-display text-xs uppercase tracking-widest text-accent-yellow ${LABEL_SHADOW}`}>
            {isGate ? `🔒 ${payload.topic} — Unlock Challenge` : `🌀 ${payload.topic}`}
          </span>
          <span className={`font-body text-[10px] uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>
            {index + 1} / {payload.questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-ui-black rounded overflow-hidden border border-white/10">
          <div
            className="h-full bg-accent-yellow rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {isGate && (
          <p className={`-mt-2 text-center font-body text-[10px] uppercase tracking-wide text-storm-light/80 ${LABEL_SHADOW}`}>
            Answer correctly to unlock the next element — wrong answers let you try again!
          </p>
        )}

        {!finished ? (
          <>
            {/* Question */}
            <h2 className={`font-display text-xl text-accent-yellow text-center ${TITLE_SHADOW}`}>
              {current?.q}
            </h2>

            {/* Options */}
            <div className="flex flex-col gap-1.5 w-full">
              {order.map((origIdx, i) => {
                const opt = current?.options[origIdx];
                if (opt === undefined) return null;
                const picked = selected === origIdx;
                const isCorrect = current !== undefined && origIdx === current.answer;
                let cls = 'retro-btn text-sm py-2 font-body transition-all ';
                if (selected !== null) {
                  if (isCorrect) cls += 'bg-accent-green/30 border-accent-green text-white';
                  else if (picked) cls += 'bg-warning-red/30 border-warning-red text-white';
                  else cls += 'bg-storm-mid/50 border-storm-mid text-storm-light opacity-60';
                } else {
                  cls += 'bg-storm-mid/60 border-storm-mid text-white hover:bg-storm-light hover:border-accent-yellow';
                }
                return (
                  <button key={i} disabled={selected !== null} onClick={() => handleAnswer(i)} className={cls}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {selected !== null && (
              <div className="bg-black/25 border border-white/10 rounded-md p-2.5 font-body text-xs text-storm-light leading-relaxed text-left">
                <span className="text-accent-yellow font-bold">
                  {selected === current?.answer ? '✅ Correct!' : '❌ Not quite.'}
                </span>
                <div className={`mt-0.5 ${LABEL_SHADOW}`}>{current?.fact}</div>
              </div>
            )}

            {selected !== null && (
              <button onClick={handleNext} className="retro-btn-primary w-full font-display text-sm">
                {isGate
                  ? selected === current?.answer
                    ? '🔓 Continue ›'
                    : '↻ Try Again'
                  : isLast
                    ? 'See Results'
                    : 'Next Question'}
              </button>
            )}
          </>
        ) : (
          /* Results */
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">🏆</div>
            <h2 className={`font-display text-2xl text-accent-yellow ${TITLE_SHADOW}`}>
              Quiz Complete!
            </h2>
            <p className={`font-body text-sm text-storm-light ${LABEL_SHADOW}`}>
              {correct} / {payload.questions.length} correct — science bonus awarded!
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {payload.questions.map((q, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < correct ? 'bg-accent-green text-white' : 'bg-warning-red/60 text-white'
                  }`}
                >
                  {i < correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
            <button onClick={handleComplete} className="retro-btn-primary font-display text-sm">
              Continue ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
