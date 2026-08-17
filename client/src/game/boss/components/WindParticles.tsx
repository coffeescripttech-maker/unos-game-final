import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface WindParticlesProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
}

const PARTICLE_COUNT = 420;

/**
 * Visible wind streaks — thin white lines blowing across the view.
 * Intensity scales with wind speed. Calms inside the eye.
 * The field follows the boat so the wind is always around the player.
 */
export default function WindParticles({ storm, isInEye, boatPosition }: WindParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 500;
      pos[i * 3 + 1] = Math.random() * 80 - 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    return pos;
  }, []);

  const speeds = useMemo(() => {
    return new Float32Array(PARTICLE_COUNT).fill(0).map(() => 0.7 + Math.random() * 0.6);
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const streakTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);

    // Draw a soft horizontal streak
    const grad = ctx.createLinearGradient(0, 32, 64, 32);
    grad.addColorStop(0, 'rgba(200,220,240,0)');
    grad.addColorStop(0.5, 'rgba(220,235,255,0.9)');
    grad.addColorStop(1, 'rgba(200,220,240,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(4, 28, 56, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const mat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#e8f4ff',
      size: 2.8,
      map: streakTexture,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      alphaTest: 0.01,
      sizeAttenuation: true,
    });
  }, [streakTexture]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;

    const visible = storm.intensity > 0.15 && !isInEye;
    pointsRef.current.visible = visible;
    if (!visible) return;

    // Keep the wind field centered on the boat
    pointsRef.current.position.set(boatPosition.x, 0, boatPosition.z);

    const baseOpacity = Math.min(0.75, 0.2 + storm.windSpeed * 0.007);
    mat.opacity = baseOpacity;

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const baseSpeed = 5 + storm.windSpeed * 0.28;
    const gust = storm.intensity > 0.6 ? 1.35 : 1;

    // Wind blows diagonally across the screen, rotating slowly
    const windAngle = timeRef.current * 0.035 + Math.PI / 4;
    const dirX = Math.sin(windAngle);
    const dirZ = Math.cos(windAngle) * 0.25;

    // Rotate streak texture to match wind direction
    if (mat.map) {
      mat.map.center.set(0.5, 0.5);
      mat.map.rotation = -windAngle;
      mat.map.needsUpdate = true;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const s = speeds[i] * (i % 7 === 0 ? gust : 1);
      pos[i * 3] -= dirX * baseSpeed * s * delta;
      pos[i * 3 + 1] -= 2 * delta;
      pos[i * 3 + 2] -= dirZ * baseSpeed * s * delta;

      // Reset when out of bounds, local to the boat
      if (pos[i * 3] < -220 || pos[i * 3 + 1] < -10 || pos[i * 3 + 2] < -160) {
        pos[i * 3] = 140 + Math.random() * 100;
        pos[i * 3 + 1] = 25 + Math.random() * 45;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 360;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
