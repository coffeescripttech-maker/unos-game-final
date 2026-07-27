import { useCallback, useEffect, useRef, useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import {
  GAME_EVENTS,
  type TyphoonSliderConfig,
  type TyphoonSliderUpdatePayload,
} from '@shared/events';
import { Flame, Droplets, Wind, Compass } from 'lucide-react';

const LUCIDE_ICONS = [Flame, Droplets, Wind, Compass];

interface TyphoonSlider {
  config: TyphoonSliderConfig;
  value: number;
}

interface SliderBarProps {
  slider: TyphoonSlider;
  onChange: (value: number) => void;
  disabled: boolean;
}

const COLORS = ['#ff6b35', '#6db3e6', '#d62828', '#9b59b6'];

function SliderBar({ slider, onChange, disabled }: SliderBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const { config, value } = slider;
  const pct = config.max > 0 ? value / config.max : 0;
  const inTarget = value >= config.targetMin && value <= config.targetMax;
  const color = inTarget ? '#06D6A0' : COLORS[config.index] ?? config.color;

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(Math.round(p * config.max));
    },
    [config.max, onChange],
  );

  // Drag interaction — document-level listeners
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromPointer(e.clientX);
    };
    const onUp = () => setDragging(false);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromPointer]);

  const IconComp = LUCIDE_ICONS[config.index] ?? Flame;

  return (
    <div className={`flex items-center gap-3 py-1.5 ${disabled ? 'opacity-40' : ''}`}>
      {/* Icon */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color + '22' }}
      >
        <IconComp size={18} color={color} />
      </div>

      {/* Label */}
      <span className="w-20 shrink-0 text-xs font-bold text-gray-300">
        {config.label}
      </span>

      {/* Custom slider track */}
      <div
        ref={trackRef}
        className="relative h-6 flex-1 cursor-pointer select-none"
        onPointerDown={(e) => {
          if (disabled) return;
          setDragging(true);
          updateFromPointer(e.clientX);
        }}
        style={{ touchAction: 'none' }}
      >
        {/* Track background */}
        <div className="absolute inset-y-[5px] left-0 right-0 overflow-hidden rounded-full bg-[#1a1a3e]">
          {/* Target zone */}
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${(config.targetMin / config.max) * 100}%`,
              width: `${((config.targetMax - config.targetMin) / config.max) * 100}%`,
              backgroundColor: '#06D6A0',
              opacity: 0.25,
            }}
          />
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ease-out"
            style={{
              width: `${pct * 100}%`,
              backgroundColor: color,
              opacity: 0.4,
            }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pct * 100}%` }}
        >
          {/* Glow ring */}
          <div
            className="absolute -inset-1.5 rounded-full opacity-30"
            style={{ backgroundColor: color }}
          />
          {/* Core thumb */}
          <div
            className="relative h-4 w-4 rounded-full border-2 border-white shadow-md"
            style={{
              backgroundColor: color,
              transform: dragging ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 75ms ease-out',
            }}
          />
        </div>
      </div>

      {/* Value badge */}
      <div
        className="flex h-6 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
        style={{ backgroundColor: color, opacity: 0.85 }}
      >
        {value}
      </div>
    </div>
  );
}

export default function TyphoonControls() {
  const { game } = useGameContext();
  const [sliders, setSliders] = useState<TyphoonSlider[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Receive slider configs from Phaser (on scene create / restart)
  usePhaserEvent(
    GAME_EVENTS.HUD_TYPHOON_SLIDER,
    (configs: TyphoonSliderConfig[]) => {
      setSliders(configs.map((c) => ({ config: c, value: c.defaultValue })));
      setGameStarted(false);
      setIsComplete(false);
    },
  );

  // Intro dismissed → game started → enable sliders
  usePhaserEvent(GAME_EVENTS.HUD_INTRO_DISMISS, () => {
    setGameStarted(true);
  });

  // Game complete/fail → disable sliders
  usePhaserEvent(GAME_EVENTS.HUD_RESULT, () => {
    setIsComplete(true);
  });

  const handleSliderChange = useCallback(
    (index: number, value: number) => {
      if (!game || !gameStarted || isComplete) return;
      setSliders((prev) =>
        prev.map((s) => (s.config.index === index ? { ...s, value } : s)),
      );
      game.events.emit(GAME_EVENTS.HUD_TYPHOON_SLIDER_UPDATE, {
        index,
        value,
      } satisfies TyphoonSliderUpdatePayload);
    },
    [game, gameStarted, isComplete],
  );

  // Don't render at all until slider configs received from Phaser
  if (sliders.length === 0) return null;

  return (
    <div className="absolute left-0 top-28 z-30 pointer-events-none">
      <div
        className="pointer-events-auto mx-4 rounded-xl border-3 border-white/20 p-4 shadow-retro"
        style={{
          background: 'linear-gradient(180deg, #1a1a3ecc 0%, #0d0d1acc 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          width: '380px',
        }}
      >
        {/* Header */}
        <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-sm font-display text-white">🌀 Conditions</span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
              gameStarted
                ? 'bg-accent-green/20 text-accent-green'
                : 'bg-white/10 text-gray-400'
            }`}
          >
            {gameStarted ? 'ACTIVE' : 'WAITING'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {sliders.map((s) => (
            <SliderBar
              key={s.config.index}
              slider={s}
              disabled={!gameStarted || isComplete}
              onChange={(v) => handleSliderChange(s.config.index, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
