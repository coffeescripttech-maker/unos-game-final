import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ObjectiveId, CollectibleData } from '../types';

const EYE_POS = { x: 0, z: -150 };

interface MiniMapProps {
  boatPosition: THREE.Vector3;
  boatYaw: number;
  collectibles: CollectibleData[];
  collectedIds: ObjectiveId[];
  deployedBuoy: boolean;
  isInEye: boolean;
}

/**
 * Circular mini map showing boat position, objectives, eye, and buoy.
 * Drawn on an HTML canvas for performance.
 */
export default function MiniMap({
  boatPosition,
  boatYaw,
  collectibles,
  collectedIds,
  deployedBuoy,
  isInEye,
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 140;
  const worldRadius = 200;
  const scale = size * 0.4 / worldRadius;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Transform world to minimap coords (center on boat)
    const toScreen = (wx: number, wz: number): { x: number; y: number } => {
      const dx = (wx - boatPosition.x) * scale;
      const dz = (wz - boatPosition.z) * scale;
      return { x: cx + dx, y: cy + dz };
    };

    // Draw the eye
    const eye = toScreen(EYE_POS.x, EYE_POS.z);
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, isInEye ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isInEye ? '#ffeaa7' : '#4ecdc4';
    ctx.fill();
    if (isInEye) {
      ctx.strokeStyle = '#ffeaa7';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw collectibles
    collectibles.forEach(c => {
      if (collectedIds.includes(c.id)) return;
      const p = toScreen(c.position.x, c.position.z);
      const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (dist > size / 2 - 4) return; // clip

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw buoy if deployed
    if (deployedBuoy) {
      const buoy = toScreen(boatPosition.x, boatPosition.z);
      ctx.beginPath();
      ctx.arc(buoy.x, buoy.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    }

    // Draw boat (centered, rotated triangle)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(boatYaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

  }, [boatPosition, boatYaw, collectibles, collectedIds, deployedBuoy, isInEye]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.3)',
      }}
    />
  );
}
