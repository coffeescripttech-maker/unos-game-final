import { useCallback, useEffect, useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS, type HUDPressureStatePayload } from '@shared/events';
import { Wind } from 'lucide-react';

interface SlotIndicator {
  index: number;
  placed: 'high' | 'low' | null;
  correct: 'high' | 'low';
}

export default function PressureControls() {
  const { game } = useGameContext();
  const [state, setState] = useState<HUDPressureStatePayload | null>(null);
  const [slots, setSlots] = useState<SlotIndicator[]>([]);
  const [animatingBtn, setAnimatingBtn] = useState<'high' | 'low' | null>(null);

  // Listen for state updates from Phaser
  usePhaserEvent(
    GAME_EVENTS.HUD_PRESSURE_STATE,
    (payload: HUDPressureStatePayload) => {
      setState(payload);
    }
  );

  // Listen for slot data from Phaser
  usePhaserEvent(GAME_EVENTS.HUD_PRESSURE_SLOTS, (payload: any) => {
    if (payload?.slots) {
      setSlots(
        payload.slots.map((s: any) => ({
          index: s.index,
          placed: s.placed,
          correct: s.correct
        }))
      );
    } else {
      // Reset slots when new round starts
      setSlots([]);
    }
  });

  // Reset slots on round change
  useEffect(() => {
    if (state && state.round > 0 && state.roundActive) {
      // Will be updated by HUD_PRESSURE_SLOTS event from Phaser
    }
  }, [state?.round]);

  const selectType = useCallback(
    (type: 'high' | 'low') => {
      if (
        !game ||
        !state?.roundActive ||
        state?.isComplete ||
        !state?.gameStarted
      )
        return;
      const newType = state.selectedType === type ? null : type;
      game.events.emit(GAME_EVENTS.HUD_PRESSURE_SELECT, newType);
      setAnimatingBtn(type);
    },
    [game, state]
  );

  useEffect(() => {
    if (!animatingBtn) return;
    const t = setTimeout(() => setAnimatingBtn(null), 200);
    return () => clearTimeout(t);
  }, [animatingBtn]);

  const startWind = useCallback(() => {
    if (!game || !state || state.placedCount < 6 || !state.roundActive) return;
    game.events.emit(GAME_EVENTS.HUD_PRESSURE_START);
  }, [game, state]);

  if (!state || !state.gameStarted || state.isComplete) return null;

  const isHighSelected = state.selectedType === 'high';
  const isLowSelected = state.selectedType === 'low';
  const canStart = state.placedCount >= 6;
  const remaining = 6 - state.placedCount;

  return (
    <div className="absolute bottom-8 left-60 z-30 pointer-events-none">
      <div
        className="pointer-events-auto mx-4 rounded-xl border-3 border-white/20 p-4 shadow-retro"
        style={{
          background: 'linear-gradient(180deg, #0d1b2acc 0%, #1a1a3ecc 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          width: '280px',
        }}
      >
        {/* Header */}
        <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-sm font-display text-white">🌪️ Air Pressure</span>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#4fc3f7]">
            Round {state.round}/{state.totalRounds}
          </span>
        </div>

        {/* Slot status row */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-400">Slots:</span>
          {Array.from({ length: 6 }, (_, i) => {
            const slot = slots[i];
            const isPlaced = slot?.placed != null;
            const isCorrect = isPlaced && slot?.placed === slot?.correct;
            return (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200"
                style={{
                  backgroundColor: isPlaced
                    ? isCorrect
                      ? '#06D6A022'
                      : '#D6282822'
                    : '#ffffff08',
                  border: `1.5px solid ${
                    isPlaced
                      ? isCorrect
                        ? '#06D6A0'
                        : '#D62828'
                      : '#ffffff20'
                  }`,
                  color: isPlaced
                    ? isCorrect
                      ? '#06D6A0'
                      : '#D62828'
                    : '#ffffff40',
                  opacity: isPlaced ? 1 : 0.5,
                }}
              >
                {isPlaced ? (slot!.placed === 'high' ? 'H' : 'L') : i + 1}
              </div>
            );
          })}
        </div>

        {/* H / L Buttons — with H/L text + arrows */}
        <div className="mb-3 flex items-center justify-center gap-4">
          {/* H (High) Button */}
          <button
            onClick={() => selectType('high')}
            disabled={remaining === 0}
            className={`
              relative flex flex-col items-center justify-center
              h-16 w-16 rounded-full font-bold text-white
              transition-all duration-150 select-none
              ${remaining === 0 ? 'opacity-30 cursor-not-allowed' : ''}
              ${
                isHighSelected
                  ? 'scale-110 ring-2 ring-white/50'
                  : 'shadow-lg hover:scale-105'
              }
              ${animatingBtn === 'high' ? 'scale-90' : ''}
            `}
            style={{
              background: isHighSelected
                ? 'radial-gradient(circle at 35% 35%, #ff4444, #b71c1c)'
                : 'radial-gradient(circle at 35% 35%, #d62828, #8a1a1a)',
              boxShadow: isHighSelected
                ? '0 0 25px rgba(214,40,40,0.5), inset 0 -3px 6px rgba(0,0,0,0.3)'
                : '0 4px 8px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2)',
            }}
            title="High Pressure"
          >
            <span className="text-[11px] leading-none mt-1.5">H</span>
            <span className="text-xs leading-none -mt-0.5">▲</span>
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          </button>

          {/* L (Low) Button */}
          <button
            onClick={() => selectType('low')}
            disabled={remaining === 0}
            className={`
              relative flex flex-col items-center justify-center
              h-16 w-16 rounded-full font-bold text-white
              transition-all duration-150 select-none
              ${remaining === 0 ? 'opacity-30 cursor-not-allowed' : ''}
              ${
                isLowSelected
                  ? 'scale-110 ring-2 ring-white/50'
                  : 'shadow-lg hover:scale-105'
              }
              ${animatingBtn === 'low' ? 'scale-90' : ''}
            `}
            style={{
              background: isLowSelected
                ? 'radial-gradient(circle at 35% 35%, #448aff, #0d47a1)'
                : 'radial-gradient(circle at 35% 35%, #1565c0, #0a2a5e)',
              boxShadow: isLowSelected
                ? '0 0 25px rgba(21,101,192,0.5), inset 0 -3px 6px rgba(0,0,0,0.3)'
                : '0 4px 8px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2)',
            }}
            title="Low Pressure"
          >
            <span className="text-[11px] leading-none mt-1.5">L</span>
            <span className="text-xs leading-none -mt-0.5">▼</span>
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          </button>
        </div>

        {/* Status instruction / remaining count */}
        <div className="mb-2 text-center">
          {remaining === 0 ? (
            <span className="text-xs font-bold text-accent-green">
              ✅ All slots filled! Ready to go!
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              {state.selectedType
                ? `👆 Tap a circle to place ${state.selectedType === 'high' ? '🔴 H' : '🔵 L'} (${remaining} left)`
                : `👆 Choose H or L, then tap a circle (${remaining} left)`}
            </span>
          )}
        </div>

        {/* Start Wind — only when all 6 placed */}
        {canStart && (
          <button
            onClick={startWind}
            className="relative flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] select-none"
            style={{
              background: 'linear-gradient(135deg, #2d6a3f, #1a4a2a)',
              boxShadow:
                '0 4px 15px rgba(45,106,63,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)',
            }}
            title="Start Wind"
          >
            <Wind size={16} />
            START WIND
            <Wind size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
