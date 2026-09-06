import { useState, useCallback } from 'react';
import { telemetry } from '../../../services/telemetry';
import type { QuizQuestion } from './QuizData';

interface QuizModalProps {
  topicLabel: string;
  questions: QuizQuestion[];
  onClose: (correct: number, total: number) => void;
  /** Called immediately after each pick so the caller can apply hull penalty/heal. */
  onAnswer?: (correct: boolean) => void;
  /** Reshuffle + reopen the quiz with fresh questions (penalty from wrong answers stays locked). */
  onRetry?: () => void;
}

const TITLE_SHADOW = 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]';
const LABEL_SHADOW = 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]';

/**
 * Full-screen interactive quiz overlay.
 *
 * Styled with the game's shared retro tokens (modal-card / retro-card /
 * font-display / font-body / drop-shadows) so it feels like part of the boss
 * HUD rather than a generic browser dialog. Questions are drawn from the
 * weather-science data set; answering reveals a short explanation ("the why").
 *
 * The score bonus for correct answers is reported back via `onClose`.
 */
export default function QuizModal({ topicLabel, questions, onClose, onAnswer, onRetry }: QuizModalProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return; // one answer per question
    const right = idx === current.answer;
    telemetry.log('quiz_answer', { level: 'boss', mode: 'boss', topic: topicLabel, question: current.q, correct: right });
    setSelected(idx);
    if (right) setCorrect(c => c + 1);
    onAnswer?.(right);
  }, [selected, current, topicLabel, onAnswer]);

  const handleNext = useCallback(() => {
    if (isLast) {
      setFinished(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  }, [isLast]);

  const handleComplete = useCallback(() => {
    onClose(correct, questions.length);
  }, [correct, onClose, questions.length]);

  const progress = ((index + (selected !== null ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="boss-quiz absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-2">
      <div className="retro-card modal-card !bg-storm-dark border-accent-yellow/50 shadow-[0_0_20px_rgba(255,215,0,0.25)] w-full max-w-lg flex flex-col gap-4 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`font-display text-xs uppercase tracking-widest text-accent-yellow ${LABEL_SHADOW}`}>
            {topicLabel}
          </span>
          <span className={`font-body text-[10px] uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>
            {index + 1} of {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-ui-black rounded overflow-hidden border border-white/10">
          <div
            className="h-full bg-accent-yellow rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!finished ? (
          <>
            <h2 className={`font-display text-xl text-accent-yellow text-center ${TITLE_SHADOW}`}>
              {current.q}
            </h2>

            <div className="flex flex-col gap-1.5 w-full">
              {current.options.map((opt, i) => {
                const picked = selected === i;
                const isCorrect = i === current.answer;
                let cls = 'retro-btn text-sm py-2 font-body transition-all ';
                if (selected !== null) {
                  if (isCorrect) {
                    cls += 'bg-accent-green/30 border-accent-green text-white';
                  } else if (picked) {
                    cls += 'bg-warning-red/30 border-warning-red text-white';
                  } else {
                    cls += 'bg-storm-mid/50 border-storm-mid text-storm-light opacity-60';
                  }
                } else {
                  cls += 'bg-storm-mid/60 border-storm-mid text-white hover:bg-storm-light hover:border-accent-yellow';
                }
                return (
                  <button
                    key={i}
                    disabled={selected !== null}
                    onClick={() => handleAnswer(i)}
                    className={cls}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation shown after answering */}
            {selected !== null && (
              <div className="bg-black/25 border border-white/10 rounded-md p-2.5 font-body text-xs text-storm-light leading-relaxed text-left">
                <span className="text-accent-yellow font-bold">
                  {selected === current.answer ? '✅ Correct!' : '❌ Not quite.'}
                </span>
                <div className={`mt-0.5 ${LABEL_SHADOW}`}>{current.fact}</div>
              </div>
            )}

            {selected !== null && (
              <button
                onClick={handleNext}
                className="retro-btn-primary w-full font-display text-sm"
              >
                {isLast ? 'See Results' : 'Next Question'}
              </button>
            )}
          </>
        ) : (
          // Results card
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">🏆</div>
            <h2 className={`font-display text-2xl text-accent-yellow ${TITLE_SHADOW}`}>
              Quiz Complete
            </h2>
            <p className={`font-body text-sm text-storm-light ${LABEL_SHADOW}`}>
              {correct} / {questions.length} correct — science bonus awarded!
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="retro-btn font-display text-sm"
              >
                ↻ Retry Quiz
              </button>
            )}
            <button
              onClick={handleComplete}
              className="retro-btn-primary font-display text-sm"
            >
              Continue ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
