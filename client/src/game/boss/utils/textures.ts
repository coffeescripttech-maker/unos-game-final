import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Canvas-based sprite texture generator for the top-down boss level.
 *
 * These textures are created at runtime so the level looks complete without
 * requiring external image files. To replace any sprite with a real asset,
 * drop a PNG in `public/assets/boss/` and use `useBossTexture(path, fallbackFactory).
 */

function createTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Top-down research vessel sprite. */
export function createBoatTexture(): THREE.CanvasTexture {
  return createTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Prop wash (subtle white wake behind)
    ctx.save();
    ctx.translate(cx, cy + 90);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hull shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 92);
    ctx.quadraticCurveTo(cx + 54, cy - 20, cx + 58, cy + 70);
    ctx.quadraticCurveTo(cx + 30, cy + 100, cx, cy + 104);
    ctx.quadraticCurveTo(cx - 30, cy + 100, cx - 58, cy + 70);
    ctx.quadraticCurveTo(cx - 54, cy - 20, cx, cy - 92);
    ctx.fill();

    // Main hull
    const hullGrad = ctx.createLinearGradient(cx - 40, cy - 80, cx + 40, cy + 80);
    hullGrad.addColorStop(0, '#3a5a7a');
    hullGrad.addColorStop(0.5, '#2a4a6a');
    hullGrad.addColorStop(1, '#1a3a5a');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 90);
    ctx.quadraticCurveTo(cx + 52, cy - 18, cx + 56, cy + 68);
    ctx.quadraticCurveTo(cx + 28, cy + 98, cx, cy + 102);
    ctx.quadraticCurveTo(cx - 28, cy + 98, cx - 56, cy + 68);
    ctx.quadraticCurveTo(cx - 52, cy - 18, cx, cy - 90);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a2a3a';
    ctx.stroke();

    // Deck
    ctx.fillStyle = '#5a7a8a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 58);
    ctx.quadraticCurveTo(cx + 34, cy - 10, cx + 36, cy + 44);
    ctx.quadraticCurveTo(cx + 18, cy + 66, cx, cy + 70);
    ctx.quadraticCurveTo(cx - 18, cy + 66, cx - 36, cy + 44);
    ctx.quadraticCurveTo(cx - 34, cy - 10, cx, cy - 58);
    ctx.fill();

    // Cabin / bridge
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.quadraticCurveTo(cx + 22, cy - 4, cx + 24, cy + 26);
    ctx.quadraticCurveTo(cx + 12, cy + 42, cx, cy + 44);
    ctx.quadraticCurveTo(cx - 12, cy + 42, cx - 24, cy + 26);
    ctx.quadraticCurveTo(cx - 22, cy - 4, cx, cy - 30);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#aab';
    ctx.stroke();

    // Windows
    ctx.fillStyle = '#223344';
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Mast
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 42);
    ctx.lineTo(cx, cy - 90);
    ctx.stroke();

    // Radar dish
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 86, 6, 0, Math.PI * 2);
    ctx.fill();

    // Propeller / wake spinner
    ctx.save();
    ctx.translate(cx, cy + 88);
    ctx.fillStyle = '#999';
    ctx.fillRect(-16, -4, 32, 8);
    ctx.fillRect(-4, -16, 8, 32);
    ctx.restore();

    // Bow light
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(cx, cy - 86, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Top-down island sprite with a beach outline. */
export function createIslandTexture(seed = 0): THREE.CanvasTexture {
  return createTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const rng = mulberry32(seed + 12345);

    // Beach / shallow water ring
    ctx.fillStyle = 'rgba(232, 213, 163, 0.6)';
    ctx.beginPath();
    blobPath(ctx, cx, cy, 90, 16, rng);
    ctx.fill();

    // Land body
    const grad = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, 110);
    grad.addColorStop(0, '#4aaa6e');
    grad.addColorStop(0.5, '#2d8a4e');
    grad.addColorStop(1, '#1e6a3e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    blobPath(ctx, cx, cy, 72, 12, rng);
    ctx.fill();

    // Inland texture
    ctx.fillStyle = 'rgba(30, 90, 50, 0.25)';
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 50;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(x, y, 3 + rng() * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coastline highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    blobPath(ctx, cx, cy, 72, 12, rng);
    ctx.stroke();
  });
}

/** Seamless-ish water tile with foam streaks. */
export function createWaterTileTexture(): THREE.CanvasTexture {
  return createTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a3472');
    grad.addColorStop(0.5, '#0f4a85');
    grad.addColorStop(1, '#0a3472');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Foam streaks
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.12)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const y = (i / 24) * h + (Math.random() - 0.5) * 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 8);
      }
      ctx.stroke();
    }

    // Sparkle dots
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Soft cloud puff sprite. */
export function createCloudTexture(): THREE.CanvasTexture {
  return createTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
    grad.addColorStop(0, 'rgba(240, 240, 245, 0.95)');
    grad.addColorStop(0.5, 'rgba(200, 200, 210, 0.55)');
    grad.addColorStop(1, 'rgba(200, 200, 210, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    // Inner puffs
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - 30, cy + 10, 40, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy - 10, 48, 0, Math.PI * 2);
    ctx.arc(cx, cy - 30, 44, 0, Math.PI * 2);
    ctx.arc(cx, cy + 30, 38, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Data marker sprite with icon. */
export function createCollectibleTexture(color: string, icon: string): THREE.CanvasTexture {
  return createTexture(128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, 16, cx, cy, 56);
    glow.addColorStop(0, color + '88');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.stroke();

    // Inner disc
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.font = '42px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy + 2);
  });
}

/** Weather buoy sprite. */
export function createBuoyTexture(): THREE.CanvasTexture {
  return createTexture(128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Float ring
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ccaa00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Antenna
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy - 56);
    ctx.stroke();

    // Blink light
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy - 56, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Top-down fish sprite. `color` tints the body; the silhouette is drawn white-ish
 * so the color reads clearly against the deep water.
 */
export function createFishTexture(color: string): THREE.CanvasTexture {
  return createTexture(64, 32, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Tinted body (oval)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail fin (triangle) — slightly darker
    ctx.fillStyle = shadeColor(color, -0.25);
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 12);
    ctx.lineTo(cx - 44, cy);
    ctx.lineTo(cx - 24, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Top fin
    ctx.fillStyle = shadeColor(color, -0.15);
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 9, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 2, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Distinct eye-of-the-typhoon marker sprite (stylised retro eye + storm ring). */
export function createEyeMarkerTexture(): THREE.CanvasTexture {
  return createTexture(64, 64, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Outer storm ring (teal → amber swirl)
    const ringGrad = ctx.createRadialGradient(cx, cy, 22, cx, cy, 30);
    ringGrad.addColorStop(0, 'rgba(78,205,196,0.9)');
    ringGrad.addColorStop(0.55, 'rgba(255,234,167,0.7)');
    ringGrad.addColorStop(1, 'rgba(78,205,196,0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    // Almond iris
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.15, 0.8);
    ctx.fillStyle = '#1a4a5a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0b263a';
    ctx.beginPath();
    ctx.arc(3, -2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lid line
    ctx.strokeStyle = '#0b263a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 17, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function shadeColor(color: string, amount: number): string {
  // Simple lighten/darken for HSL-like colors passed as hex
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) + amount * 255) | 0));
  const g = Math.max(0, Math.min(255, ((num >> 8 & 0xff) + amount * 255) | 0));
  const b = Math.max(0, Math.min(255, ((num & 0xff) + amount * 255) | 0));
  return `rgb(${r},${g},${b})`;
}

/** Soft foam / wake puff sprite (white, opacity drop-off from centre). */
export function createSplashTexture(): THREE.CanvasTexture {
  return createTexture(48, 48, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    grad.addColorStop(0, 'rgba(255,255,255,0.45)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Load a PNG asset with a generated canvas fallback.
 * Returns the fallback immediately, then swaps to the loaded PNG once ready.
 * This avoids React Suspense and keeps the level rendering even if an asset
 * is missing.
 */
export function useBossTexture(path: string, fallbackFactory: () => THREE.CanvasTexture): THREE.Texture {
  const fallback = useMemo(fallbackFactory, [fallbackFactory]);
  const [texture, setTexture] = useState<THREE.Texture>(fallback);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      (loaded) => {
        if (cancelled) return;
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.needsUpdate = true;
        setTexture(loaded);
      },
      undefined,
      () => {
        if (cancelled) return;
        setTexture(fallback);
      },
    );
    return () => { cancelled = true; };
  }, [path, fallback]);

  return texture;
}

// --- helpers ---

function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, variance: number, rng: () => number) {
  const points = 12;
  ctx.moveTo(cx + radius, cy);
  for (let i = 1; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius + (rng() - 0.5) * variance * 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
