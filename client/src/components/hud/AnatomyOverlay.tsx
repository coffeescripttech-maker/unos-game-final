import { useState, useCallback } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { AnatomyReviewPayload } from '@shared/events';
import {
  TYPHOON_ANATOMY_PARTS,
  DEFAULT_ANATOMY_PART,
} from '../../game/AnatomyData';

const TITLE_SHADOW = 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]';
const LABEL_SHADOW = 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]';

const CX = 200;
const CY = 150;

/** Build a clockwise-on-screen spiral path for the rain bands. */
function spiralPath(
  rStart: number,
  rEnd: number,
  turns: number,
  startAngle: number
): string {
  let d = '';
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = (startAngle + turns * Math.PI * 2 * t) * (Math.PI / 180);
    const r = rStart + (rEnd - rStart) * t;
    const x = CX + Math.cos(ang) * r;
    const y = CY + Math.sin(ang) * r;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

/** Position + rotation for a rotation-arrow head placed on a ring. */
function arrowHead(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CX + Math.cos(a) * radius,
    y: CY + Math.sin(a) * radius,
    rot: angleDeg + 90,
  };
}

/**
 * Typhoon Anatomy review — a labeled, tappable diagram of a mature tropical
 * cyclone (eye, eyewall, spiral rainbands, outer bands, rotation). Shown at the
 * start of the level to prime the player before the atmospheric-process
 * gameplay (and referenced later by the final science quiz).
 */
export default function AnatomyOverlay() {
  const { game } = useGameContext();
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState(DEFAULT_ANATOMY_PART);
  const [cta, setCta] = useState('▶ Continue');

  usePhaserEvent(GAME_EVENTS.HUD_ANATOMY_REVIEW, (payload: AnatomyReviewPayload) => {
    setActiveId(payload?.focus ?? DEFAULT_ANATOMY_PART);
    setCta(payload?.cta ?? '▶ Continue');
    setVisible(true);
  });

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (game) game.events.emit(GAME_EVENTS.HUD_ANATOMY_DISMISS);
  }, [game]);

  if (!visible) return null;

  const active =
    TYPHOON_ANATOMY_PARTS.find(p => p.id === activeId) ?? TYPHOON_ANATOMY_PARTS[0];
  const sel = (id: string) => activeId === id;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-2">
      <div className="retro-card modal-card anatomy-modal !bg-storm-dark border-accent-yellow/50 shadow-[0_0_20px_rgba(255,215,0,0.25)] w-full max-w-2xl max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col gap-3 pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`font-display text-sm uppercase tracking-widest text-accent-yellow ${LABEL_SHADOW}`}>
            🌪️ Typhoon Anatomy
          </span>
          <span className={`font-body text-xs uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>
            Tap a part
          </span>
        </div>

        <p className={`text-center font-body text-sm text-storm-light/90 -mt-1 ${LABEL_SHADOW}`}>
          Know the parts of a bagyo — this is what your research vessel is sailing into!
        </p>

        {/* Diagram + details (side-by-side on wide/landscape screens) */}
        <div className="flex flex-col landscape:flex-row landscape:items-start gap-3">
          <div className="flex justify-center w-full landscape:flex-[1.1]">
            <svg
              viewBox="0 0 400 300"
              className="w-full max-w-[520px] h-auto select-none"
            role="img"
            aria-label="Labeled diagram of a typhoon"
          >
            <rect x="0" y="0" width="400" height="300" rx="10" fill="#0d1b2a" opacity="0.6" />

            {/* Outer / feeder bands */}
            <g
              onClick={() => setActiveId('outer')}
              className="cursor-pointer"
              opacity={sel('outer') ? 1 : 0.55}
            >
              <path d={spiralPath(54, 142, 0.85, 200)} fill="none" stroke="#2a9d8f" strokeWidth={sel('outer') ? 9 : 6} strokeLinecap="round" strokeDasharray="2 9" />
              <path d={spiralPath(54, 138, 0.85, 20)} fill="none" stroke="#2a9d8f" strokeWidth={sel('outer') ? 9 : 6} strokeLinecap="round" strokeDasharray="2 9" />
            </g>

            {/* Spiral rainbands */}
            <g
              onClick={() => setActiveId('rainbands')}
              className="cursor-pointer"
              opacity={sel('rainbands') ? 1 : 0.7}
            >
              <path d={spiralPath(40, 122, 1.05, 250)} fill="none" stroke="#457b9d" strokeWidth={sel('rainbands') ? 7 : 4} strokeLinecap="round" />
              <path d={spiralPath(40, 118, 1.05, 70)} fill="none" stroke="#457b9d" strokeWidth={sel('rainbands') ? 7 : 4} strokeLinecap="round" />
            </g>

            {/* Rotation ring (counter-clockwise) */}
            <g
              onClick={() => setActiveId('rotation')}
              className="cursor-pointer"
              opacity={sel('rotation') ? 1 : 0.6}
            >
              <path
                d={`M ${CX + 112 * Math.cos((200 * Math.PI) / 180)} ${CY + 112 * Math.sin((200 * Math.PI) / 180)} A 112 112 0 1 0 ${CX + 112 * Math.cos((160 * Math.PI) / 180)} ${CY + 112 * Math.sin((160 * Math.PI) / 180)}`}
                fill="none"
                stroke="#9b5de5"
                strokeWidth={sel('rotation') ? 3.5 : 2}
                strokeDasharray="6 6"
              />
              {[330, 210, 90].map(deg => {
                const h = arrowHead(deg, 112);
                return (
                  <polygon
                    key={deg}
                    points="-4,-7 11,0 -4,7"
                    fill="#9b5de5"
                    transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.rot})`}
                  />
                );
              })}
            </g>

            {/* Eyewall ring */}
            <circle
              cx={CX}
              cy={CY}
              r={38}
              fill="none"
              stroke="#e63946"
              strokeWidth={sel('eyewall') ? 20 : 15}
              opacity={sel('eyewall') ? 0.95 : 0.75}
              className="cursor-pointer"
              onClick={() => setActiveId('eyewall')}
            />

            {/* Eye */}
            <circle
              cx={CX}
              cy={CY}
              r={15}
              fill="#6ec1e4"
              opacity={sel('eye') ? 1 : 0.85}
              className="cursor-pointer"
              onClick={() => setActiveId('eye')}
            />
            {sel('eye') && (
              <circle cx={CX} cy={CY} r={22} fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7">
                <animate attributeName="r" values="20;27;20" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Compass hint */}
            <text x="24" y="286" fill="rgba(255,255,255,0.35)" fontSize="11" fontFamily="monospace">W ← storm track · rotation ⁝</text>
          </svg>
          </div>

          <div className="flex flex-col gap-2 w-full landscape:flex-1">
        {/* Part chips */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {TYPHOON_ANATOMY_PARTS.map(part => (
            <button
              key={part.id}
              onClick={() => setActiveId(part.id)}
              className="retro-btn text-xs sm:text-sm !px-2.5 !py-1 font-display"
              style={{
                backgroundColor: sel(part.id) ? part.color : 'rgba(255,255,255,0.08)',
                borderColor: part.color,
                color: sel(part.id) ? '#0d0d1a' : '#ffffff',
              }}
            >
              {part.name}
            </button>
          ))}
        </div>

        {/* Detail card */}
        <div
          className="rounded-md p-3 border-l-4 bg-black/30"
          style={{ borderColor: active.color }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: active.color }} />
            <span className={`font-display text-sm text-white ${LABEL_SHADOW}`}>{active.name}</span>
            <span className="font-body text-xs text-storm-light/70">{active.subtitle}</span>
          </div>
          <p className="font-body text-sm text-white/85 leading-relaxed mt-1.5">{active.fact}</p>
        </div>
          </div>
        </div>

        {/* Continue */}
        <button
          onClick={handleDismiss}
          className="retro-btn-primary w-full font-display text-base animate-pulse-subtle"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
