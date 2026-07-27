import { useState, useCallback, useEffect, useRef } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDPatternReviewPayload } from '@shared/events';

/* ── Map Phaser slot positions to an SVG viewBox (400×240) ── */
const SLOT_VIEW = [
  { x: 200, y: 20   }, // 0: top
  { x: 336, y: 58   }, // 1: top-right
  { x: 324, y: 165  }, // 2: bottom-right
  { x: 200, y: 200  }, // 3: bottom
  { x: 76,  y: 165  }, // 4: bottom-left
  { x: 64,  y: 58   }, // 5: top-left
];

/* ── Slot neighbors for flow path (top→top-right→bottom-right→bottom→bottom-left→top-left) ── */
const FLOW_PATH = [0, 1, 2, 3, 4, 5];

export default function PatternReviewOverlay() {
  const { game } = useGameContext();
  const [data, setData] = useState<HUDPatternReviewPayload | null>(null);
  const [activeArrow, setActiveArrow] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_PATTERN_REVIEW, (payload: HUDPatternReviewPayload) => {
    setData(payload);
  });

  const handleDismiss = useCallback(() => {
    if (!game) return;
    game.events.emit(GAME_EVENTS.HUD_PATTERN_DISMISS);
    setData(null);
  }, [game]);

  /* ── Cycling animation: slots then arrows alternate ── */
  useEffect(() => {
    if (!data) return;
    let step = 0;
    const TOTAL_STEPS = 12; // 6 slots + 6 arrows
    intervalRef.current = setInterval(() => {
      const s = step % TOTAL_STEPS;
      if (s < 6) {
        setActiveSlot(s);
        setActiveArrow(null);
      } else {
        setActiveSlot(null);
        setActiveArrow(s - 6);
      }
      step++;
    }, 650);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data]);

  if (!data) return null;

  const isCorrect = data.type === 'correct';
  const isLastRound = data.round >= data.totalRounds;

  /* ── Build wind arrows from H → L ── */
  const highIndices = data.pattern
    .map((t, i) => (t === 'high' ? i : -1))
    .filter((i): i is number => i >= 0);
  const lowIndices = data.pattern
    .map((t, i) => (t === 'low' ? i : -1))
    .filter((i): i is number => i >= 0);

  const windArrows: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];
  highIndices.forEach(hi => {
    const h = SLOT_VIEW[hi];
    let nearest = lowIndices[0];
    let minDist = Infinity;
    lowIndices.forEach(li => {
      const l = SLOT_VIEW[li];
      const d = Math.hypot(h.x - l.x, h.y - l.y);
      if (d < minDist) { minDist = d; nearest = li; }
    });
    const l = SLOT_VIEW[nearest];
    windArrows.push({ x1: h.x, y1: h.y, x2: l.x, y2: l.y, label: '💨' });
  });

  /* ── Find which slots are wrong (for wrong mode) ── */
  const wrongIndices: number[] = [];
  if (!isCorrect && data.placed) {
    data.pattern.forEach((correctType, i) => {
      if (data.placed && data.placed[i] !== correctType) {
        wrongIndices.push(i);
      }
    });
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className={`retro-card max-w-sm w-[90%] !overflow-hidden animate-in zoom-in-95 duration-300 ${
        isCorrect ? '!bg-storm-dark' : '!bg-storm-dark border-warning-red/40'
      }`}>
        {/* ── Badge ── */}
        <div className="flex justify-center -mt-1">
          <span className={`text-white text-xs px-6 py-1 -translate-y-1/2 font-bold rounded-sm ${
            isCorrect ? 'bg-accent-green' : 'bg-warning-red'
          }`}>
            {isCorrect ? `✅ Round ${data.round} Complete` : `❌ Round ${data.round} — Mistakes Found`}
          </span>
        </div>

        {/* ── Title ── */}
        <div
          className={`font-display text-xl text-center mt-3 ${
            isCorrect ? 'text-accent-yellow' : 'text-warning-red'
          }`}
          style={{ textShadow: '2px 2px 0px #000000' }}
        >
          {isCorrect
            ? (isLastRound ? '🎯 Destination Almost Reached!' : `🌀 Wind is Blowing!`)
            : `✖️ Not Quite Right`}
        </div>

        {/* ── Educational subtitle ── */}
        <div className="font-body text-xs text-center mt-1 mb-2 px-3 leading-relaxed">
          {isCorrect ? (
            <span className="text-accent-green/80">
              <strong className="text-white">💨 Wind flows from HIGH → LOW pressure.</strong>
              {' '}See how each H pushes wind toward an L? That's what moves the cloud!
            </span>
          ) : (
            <span className="text-warning-red/80">
              <strong className="text-white">The ghost letters show the correct answer.</strong>
              {' '}Match all 6 slots for the wind to blow in the right direction!
            </span>
          )}
        </div>

        {/* ── Divider ── */}
        <div className={`h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-2 mb-3`} />

        {/* ── Pattern SVG ── */}
        <div className="flex justify-center mb-1">
          <svg viewBox="0 0 400 240" className="w-full max-w-[340px] h-auto">
            {/* Background */}
            <rect x="0" y="0" width="400" height="240" rx="8" fill="#0d1b2a" opacity="0.5" />

            {/* Wind arrows (H → L) with animated highlight */}
            {windArrows.map((a, i) => {
              const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
              const len = Math.hypot(dx, dy);
              if (len < 5) return null;
              const nx = dx / len, ny = dy / len;
              const hl = 10, ha = 0.4;
              const isActive = activeArrow === i;
              return (
                <g key={`arrow-${i}`}>
                  {/* Arrow line */}
                  <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                    stroke={isActive ? '#4fc3f7' : '#3a7a9a'}
                    strokeWidth={isActive ? 3.5 : 2}
                    strokeDasharray={isActive ? 'none' : '5,3'}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points={`${a.x2},${a.y2} ${a.x2 - hl * (nx * Math.cos(ha) - ny * Math.sin(ha))},${a.y2 - hl * (nx * Math.sin(ha) + ny * Math.cos(ha))} ${a.x2 - hl * (nx * Math.cos(ha) + ny * Math.sin(ha))},${a.y2 - hl * (-nx * Math.sin(ha) + ny * Math.cos(ha))}`}
                    fill={isActive ? '#4fc3f7' : '#3a7a9a'}
                  />
                  {/* 💨 icon on arrow midpoint */}
                  <text x={(a.x1 + a.x2) / 2 - 6} y={(a.y1 + a.y2) / 2 - 8}
                    fill={isActive ? '#4fc3f7' : '#3a7a9a'}
                    fontSize={isActive ? '12' : '9'}
                    fontWeight="bold"
                  >
                    {isActive ? '💨' : '·'}
                  </text>
                </g>
              );
            })}

            {/* Slot circles (show correct pattern) */}
            {SLOT_VIEW.map((sv, i) => {
              const type = data.pattern[i];
              const fill = type === 'high' ? '#d62828' : '#1565c0';
              const isSlotActive = activeSlot === i;
              const isWrong = wrongIndices.includes(i);

              // For wrong slots: show a subtle red X overlay
              let placedText = '';
              if (!isCorrect && data.placed && data.placed[i] && data.placed[i] !== data.pattern[i]) {
                placedText = data.placed[i] === 'high' ? 'H' : 'L';
              }

              return (
                <g key={`slot-${i}`}>
                  {/* Glow for active highlight */}
                  {isSlotActive && (
                    <circle cx={sv.x} cy={sv.y} r="28"
                      fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                      <animate attributeName="r" values="26;33;26" dur="0.65s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="0.65s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Wrong-indicator ring */}
                  {isWrong && (
                    <>
                      <circle cx={sv.x} cy={sv.y} r="26"
                        fill="none" stroke="#ff4444" strokeWidth="2.5" strokeDasharray="4,3"
                        opacity="0.8"
                      />
                      {/* Red X */}
                      <text x={sv.x} y={sv.y - 32} textAnchor="middle"
                        fill="#ff4444" fontSize="14" fontWeight="bold"
                      >✖</text>
                      {/* "You placed" indicator */}
                      {placedText && (
                        <text x={sv.x + 30} y={sv.y + 4} textAnchor="middle"
                          fill="#ff8888" fontSize="9"
                        >
                          ← you put {placedText}
                        </text>
                      )}
                    </>
                  )}

                  {/* Main circle */}
                  <circle cx={sv.x} cy={sv.y} r="22" fill={fill} opacity={isWrong ? 0.7 : 0.85}
                    stroke={isWrong ? '#ff4444' : (isSlotActive ? '#ffffff' : 'rgba(255,255,255,0.15)')}
                    strokeWidth={isWrong ? 3 : (isSlotActive ? 3 : 1)}
                  />

                  {/* Correct label */}
                  <text x={sv.x} y={sv.y + 5} textAnchor="middle"
                    fill="#ffffff" fontSize="16" fontWeight="bold"
                    stroke="#000000" strokeWidth="0.5"
                  >
                    {type === 'high' ? 'H' : 'L'}
                  </text>
                  {/* Slot number */}
                  <text x={sv.x} y={sv.y + 22} textAnchor="middle"
                    fill="rgba(255,255,255,0.25)" fontSize="8"
                  >
                    #{i + 1}
                  </text>

                  {/* Index hint */}
                  <text x={sv.x} y={sv.y + 20} textAnchor="middle"
                    fill="rgba(255,255,255,0.2)" fontSize="7"
                  >
                    #{i + 1}
                  </text>
                </g>
              );
            })}

            {/* Legend */}
            <g transform="translate(30, 210)">
              <circle cx="0" cy="0" r="7" fill="#d62828" opacity="0.85" />
              <text x="10" y="4" fill="#cccccc" fontSize="9">H (High)</text>
              <circle cx="100" cy="0" r="7" fill="#1565c0" opacity="0.85" />
              <text x="110" y="4" fill="#cccccc" fontSize="9">L (Low)</text>
              <line x1="200" y1="0" x2="230" y2="0" stroke="#4fc3f7" strokeWidth="2" />
              <text x="236" y="4" fill="#4fc3f7" fontSize="9">Wind</text>
            </g>
          </svg>
        </div>

        {/* ── What this teaches ── */}
        <div className={`mx-3 mb-2 p-2 rounded-sm text-xs leading-relaxed ${
          isCorrect ? 'bg-ocean-deep/60 border-l-2 border-accent-green' : 'bg-warning-red/10 border-l-2 border-warning-red'
        }`}>
          {isCorrect ? (
            <>
              <span className="text-accent-yellow font-bold block mb-0.5">🌍 How this works:</span>
              <span className="text-white/80">
                Air moves from <strong className="text-warning-red">High pressure (H)</strong> to <strong className="text-ocean-surface">Low pressure (L)</strong> — that's wind!{' '}
                {windArrows.length > 0 && 'The arrows show your '}<strong className="text-accent-green">wind path</strong>.
                Each correct round pushes the cloud closer to its destination.
              </span>
            </>
          ) : (
            <>
              <span className="text-warning-red font-bold block mb-0.5">👀 Check the ghost letters:</span>
              <span className="text-white/80">
                {wrongIndices.length > 0
                  ? `Slot${wrongIndices.length > 1 ? 's' : ''} #${wrongIndices.map(i => i + 1).join(', #')} ${wrongIndices.length > 1 ? 'were' : 'was'} wrong. The dim H/L letters on the circles show what to place there. Match all 6 for the wind to blow correctly!`
                  : 'Some slots need the correct H or L. The ghost letters on each circle show the right answer!'}
              </span>
            </>
          )}
        </div>

        {/* ── Wrong mode: additional slot-by-slot breakdown ── */}
        {!isCorrect && wrongIndices.length > 0 && (
          <div className="mx-3 mb-2 space-y-1">
            {wrongIndices.map(wi => (
              <div key={wi} className="flex items-center gap-2 text-xs bg-black/30 p-1.5 rounded-sm">
                <span className="text-white/40 shrink-0">Slot #{wi + 1}:</span>
                {data.placed && data.placed[wi] ? (
                  <span className="text-warning-red/80">
                    You put <strong>{data.placed[wi] === 'high' ? '🔴 H' : '🔵 L'}</strong>
                  </span>
                ) : (
                  <span className="text-warning-red/80">Empty — you didn't place here</span>
                )}
                <span className="text-white/30">→</span>
                <span className="text-accent-green">
                  Should be <strong>{data.pattern[wi] === 'high' ? '🔴 H' : '🔵 L'}</strong>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Progress indicator ── */}
        <div className="flex justify-center gap-1.5 mb-3">
          {Array.from({ length: data.totalRounds }, (_, i) => (
            <div
              key={i}
              className={`w-7 h-1.5 rounded-sm ${
                i < data.round && isCorrect ? 'bg-accent-green'
                : i < data.round ? 'bg-warning-red'
                : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* ── Button ── */}
        <button
          onClick={handleDismiss}
          className={`retro-btn w-full text-sm ${
            isCorrect
              ? (isLastRound ? 'retro-btn-success' : 'retro-btn-primary')
              : 'retro-btn-danger'
          }`}
        >
          {isCorrect
            ? (isLastRound ? '▶ Show Results' : `▶ Continue to Round ${data.round + 1}`)
            : `🔄 Try Round ${data.round} Again`}
        </button>
      </div>
    </div>
  );
}