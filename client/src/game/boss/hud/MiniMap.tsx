import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ObjectiveId, CollectibleData } from '../types';
import { ISLANDS } from '../components/Philippines';

const EYE_POS = { x: 0, z: -150 };

// Island cluster positions for the mini map — synced from Philippines.tsx so we never drift
const ISLAND_MARKERS = ISLANDS.map(i => ({ x: i.position[0], z: i.position[2] }));

interface MiniMapProps {
  boatPosition: THREE.Vector3;
  boatYaw: number;
  collectibles: CollectibleData[];
  collectedIds: ObjectiveId[];
  currentObjective: ObjectiveId;
  deployedBuoy: boolean;
  isInEye: boolean;
}

/**
 * Circular mini map showing boat position, current objective, eye, and buoy.
 * Drawn on an HTML canvas for performance.
 */
export default function MiniMap({
  boatPosition,
  boatYaw,
  collectibles,
  collectedIds,
  currentObjective,
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

    // Background circle with radial gradient
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2 - 2);
    grad.addColorStop(0, 'rgba(6,21,44,0.65)');
    grad.addColorStop(1, 'rgba(10,36,114,0.85)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle glow ring
    ctx.shadowColor = 'rgba(6,214,160,0.25)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(100,255,218,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gridlines — concentric rings + radial spokes
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    for (let i = 1; i <= 3; i++) {
      const r = (size / 2 - 2) * (i / 3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Spokes (N/E/S/W)
    ctx.beginPath();
    ctx.moveTo(cx - size / 2 + 2, cy);
    ctx.lineTo(cx + size / 2 - 2, cy);
    ctx.moveTo(cx, cy - size / 2 + 2);
    ctx.lineTo(cx, cy + size / 2 - 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Transform world to minimap coords (center on boat)
    const toScreen = (wx: number, wz: number): { x: number; y: number } => {
      const dx = (wx - boatPosition.x) * scale;
      const dz = (wz - boatPosition.z) * scale;
      return { x: cx + dx, y: cy + dz };
    };

    // Draw the eye
    const eye = toScreen(EYE_POS.x, EYE_POS.z);
    const eyeR = isInEye ? 6 : 3;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = isInEye ? '#ffeaa7' : '#4ecdc4';
    ctx.fill();
    ctx.shadowColor = 'rgba(255,234,167,0.4)';
    ctx.shadowBlur = isInEye ? 8 : 0;
    ctx.strokeStyle = isInEye ? '#ffeaa7' : 'rgba(78,205,196,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw island clusters
    ISLAND_MARKERS.forEach(island => {
      const p = toScreen(island.x, island.z);
      const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (dist > size / 2 - 4) return; // clip
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4aaa6e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,60,45,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw only the current objective collectible
    const activeCollectible = collectibles.find(c => c.id === currentObjective);
    if (activeCollectible && !collectedIds.includes(activeCollectible.id)) {
      const p = toScreen(activeCollectible.position.x, activeCollectible.position.z);
      const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (dist <= size / 2 - 4) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = activeCollectible.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw buoy if deployed
    if (deployedBuoy) {
      const buoy = toScreen(boatPosition.x, boatPosition.z);
      ctx.beginPath();
      ctx.arc(buoy.x, buoy.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    }

    // Draw boat (centered, rotated triangle) with a forward glow
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
    ctx.shadowColor = 'rgba(78,205,196,0.4)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

  }, [boatPosition, boatYaw, collectibles, collectedIds, currentObjective, deployedBuoy, isInEye]);

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
