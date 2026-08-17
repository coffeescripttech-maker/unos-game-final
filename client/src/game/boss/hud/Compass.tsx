import { useRef, useEffect } from 'react';
import type { StormParams } from '../types';

interface CompassProps {
  boatYaw: number;
  targetAngle?: number; // angle to the Eye
  storm?: StormParams;
}

/**
 * Compass rose showing boat heading and direction to target.
 * HTML canvas-drawn compass with N/S/E/W labels.
 */
export default function Compass({ boatYaw, targetAngle, storm }: CompassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    // Compass jitter from wind — stronger storms shake the needle
    const jitterMag = storm ? (storm.intensity * 0.08 + storm.windSpeed * 0.002) : 0;
    const jitter = jitterMag > 0 ? (Math.random() - 0.5) * jitterMag : 0;

    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cardinal direction labels (fixed — N is always up)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dirs = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: Math.PI / 2 },
      { label: 'S', angle: Math.PI },
      { label: 'W', angle: -Math.PI / 2 },
    ];
    dirs.forEach(d => {
      const x = cx + Math.sin(d.angle) * (r - 8);
      const y = cy - Math.cos(d.angle) * (r - 8);
      ctx.fillText(d.label, x, y);
    });

    // Boat heading indicator
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-boatYaw + jitter);
    ctx.beginPath();
    ctx.moveTo(0, -r + 2);
    ctx.lineTo(-3, -r + 8);
    ctx.lineTo(3, -r + 8);
    ctx.closePath();
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    ctx.restore();

    // Target direction indicator (to the Eye)
    if (targetAngle !== undefined) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-boatYaw + jitter);
      ctx.rotate(targetAngle);
      ctx.beginPath();
      ctx.moveTo(0, -r + 4);
      ctx.lineTo(-2, -r + 10);
      ctx.lineTo(2, -r + 10);
      ctx.closePath();
      ctx.fillStyle = '#ffeaa7';
      ctx.fill();
      ctx.restore();
    }

  }, [boatYaw, targetAngle, storm]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    />
  );
}
