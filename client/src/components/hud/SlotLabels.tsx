import { useCallback, useEffect, useRef, useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import type { HUDPressureSlotData } from '@shared/events';
import { GAME_WIDTH, GAME_HEIGHT } from '@shared/constants';

interface SlotLabel extends HUDPressureSlotData {
  ghost: string;
  typed: string | null;
}

export default function SlotLabels() {
  const { game } = useGameContext();
  const [slots, setSlots] = useState<SlotLabel[]>([]);
  const [show, setShow] = useState(false);
  const [offset, setOffset] = useState({ left: 0, top: 0, scaleX: 1, scaleY: 1 });
  const rootRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Listen for slot data from Phaser
  usePhaserEvent(GAME_EVENTS.HUD_PRESSURE_SLOTS, (payload: { slots: HUDPressureSlotData[]; round: number; totalRounds: number }) => {
    const labels: SlotLabel[] = payload.slots.map(s => ({
      ...s,
      ghost: s.correct === 'high' ? 'H' : 'L',
      typed: s.placed,
    }));
    setSlots(labels);
    setShow(true);
  });

  // Track canvas position relative to this component
  const updateRect = useCallback(() => {
    if (!game || !rootRef.current) return;
    const canvasRect = game.canvas.getBoundingClientRect();
    const containerRect = rootRef.current.getBoundingClientRect();
    setOffset({
      left: canvasRect.left - containerRect.left,
      top: canvasRect.top - containerRect.top,
      scaleX: canvasRect.width / GAME_WIDTH,
      scaleY: canvasRect.height / GAME_HEIGHT,
    });
  }, [game]);

  useEffect(() => {
    updateRect();
    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect]);

  if (!show || slots.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
    >
      {slots.map(slot => {
        const px = offset.left + slot.x * offset.scaleX;
        const py = offset.top + slot.y * offset.scaleY;
        const marker = slot.typed;

        return (
          <div
            key={slot.index}
            className="absolute flex flex-col items-center"
            style={{
              left: px,
              top: py,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Ghost label (what should be placed) */}
            <span
              className="font-bold pointer-events-none select-none"
              style={{
                color: slot.correct === 'high' ? '#d62828' : '#1565c0',
                opacity: marker ? 0.25 : 0.7,
                textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 4px #000',
                fontSize: marker ? '12px' : '17px',
              }}
            >
              {slot.ghost}
            </span>

            {/* Placed marker — overlaid */}
            {marker && (
              <span
                className="absolute font-bold pointer-events-none select-none"
                style={{
                  color: '#ffffff',
                  fontSize: '15px',
                  textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 4px #000',
                }}
              >
                {marker === 'high' ? 'H' : 'L'}
              </span>
            )}

            {/* Slot number below */}
            <span
              className="absolute pointer-events-none select-none"
              style={{
                top: 34,
                color: '#5a8aaa',
                fontSize: '9px',
                textShadow: '0 0 6px rgba(0,0,0,0.9)',
                opacity: 0.5,
              }}
            >
              #{slot.index + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
