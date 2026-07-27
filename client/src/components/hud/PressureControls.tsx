import { useCallback, useEffect, useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';

interface PressureState {
  selectedType: 'high' | 'low' | null;
  placedCount: number;
  roundActive: boolean;
  gameStarted: boolean;
  isComplete: boolean;
  round: number;
  totalRounds: number;
}

const INITIAL_STATE: PressureState = {
  selectedType: null,
  placedCount: 0,
  roundActive: false,
  gameStarted: false,
  isComplete: false,
  round: 0,
  totalRounds: 3
};

export default function PressureControls() {
  const { game } = useGameContext();
  const [state, setState] = useState<PressureState>(INITIAL_STATE);
  const [animatingBtn, setAnimatingBtn] = useState<'high' | 'low' | null>(null);

  usePhaserEvent(GAME_EVENTS.HUD_PRESSURE_STATE, (payload: PressureState) => {
    setState(payload);
  });

  useEffect(() => {
    if (!animatingBtn) return;
    const t = setTimeout(() => setAnimatingBtn(null), 200);
    return () => clearTimeout(t);
  }, [animatingBtn]);

  const selectType = useCallback(
    (type: 'high' | 'low') => {
      if (!game || !state.roundActive || state.isComplete || !state.gameStarted)
        return;
      const newType = state.selectedType === type ? null : type;
      game.events.emit(GAME_EVENTS.HUD_PRESSURE_SELECT, newType);
      setAnimatingBtn(type);
    },
    [
      game,
      state.roundActive,
      state.isComplete,
      state.gameStarted,
      state.selectedType
    ]
  );

  const startWind = useCallback(() => {
    if (!game || state.placedCount < 6 || !state.roundActive) return;
    game.events.emit(GAME_EVENTS.HUD_PRESSURE_START);
  }, [game, state.placedCount, state.roundActive]);

  if (!state.gameStarted || state.isComplete) return null;

  const isHighSelected = state.selectedType === 'high';
  const isLowSelected = state.selectedType === 'low';
  const canStart = state.placedCount >= 6;
  const remaining = 6 - state.placedCount;

  return (
    <div className="absolute bottom-8 left-60 z-40 flex flex-col items-start gap-2">
      {/* H / L Circle Buttons */}
      <div className="relative flex items-center gap-3">
        {/* H (High) Button */}
        <button
          onClick={() => selectType('high')}
          className={`
            relative flex h-14 w-14 items-center justify-center
            rounded-full text-xl font-bold text-white
            transition-all duration-150 select-none
            ${
              isHighSelected
                ? 'scale-110 shadow-[0_0_20px_rgba(214,40,40,0.6)] ring-2 ring-white/50'
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
              : '0 4px 8px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2)'
          }}
          title="High Pressure (H)">
          <span className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">H</span>
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </button>

        {/* L (Low) Button */}
        <button
          onClick={() => selectType('low')}
          className={`
            relative flex h-14 w-14 items-center justify-center
            rounded-full text-xl font-bold text-white
            transition-all duration-150 select-none
            ${
              isLowSelected
                ? 'scale-110 shadow-[0_0_20px_rgba(21,101,192,0.6)] ring-2 ring-white/50'
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
              : '0 4px 8px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2)'
          }}
          title="Low Pressure (L)">
          <span className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">L</span>
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </button>
      </div>

      {/* Start Wind — compact pill, only when ready */}
      {canStart && (
        <button
          onClick={startWind}
          className="relative flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 select-none animate-start-pulse"
          style={{
            background: 'linear-gradient(135deg, #2d6a3f, #1a4a2a)',
            boxShadow:
              '0 4px 15px rgba(45,106,63,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)',
            animation: 'startPulse 1.2s ease-in-out infinite'
          }}
          title="Start Wind">
          💨 START
        </button>
      )}
    </div>
  );
}
