import { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
}

/**
 * On-screen virtual joystick for touch and mouse.
 * Outputs normalized x (-1..1, right positive) and y (-1..1, up positive).
 */
export default function VirtualJoystick({ onChange, disabled }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const updateStick = useCallback((clientX: number, clientY: number) => {
    const maxDist = 42;
    let dx = clientX - originRef.current.x;
    let dy = clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      const scale = maxDist / dist;
      dx *= scale;
      dy *= scale;
    }
    setPos({ x: dx, y: dy });
    onChange(dx / maxDist, -(dy / maxDist));
  }, [onChange]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setPos({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    draggingRef.current = true;
    updateStick(clientX, clientY);
  }, [disabled, updateStick]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updateStick(e.clientX, e.clientY));
    };
    const handleUp = () => endDrag();

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [endDrag, updateStick]);

  return (
    <div
      ref={baseRef}
      data-joystick="true"
      className={`fixed bottom-6 left-6 w-28 h-28 rounded-full border-2 border-white/20 bg-black/25 backdrop-blur-sm touch-none select-none z-50 ${disabled ? 'opacity-40' : 'opacity-100'}`}
      onPointerDown={(e) => startDrag(e.clientX, e.clientY)}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={stickRef}
        className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/70 shadow-lg border border-white/50"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      />
    </div>
  );
}
