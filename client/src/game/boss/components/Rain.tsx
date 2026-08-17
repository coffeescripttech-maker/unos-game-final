import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface RainProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
}

const RAIN_COUNT = 4000;
const RAIN_AREA = 280;
const RAIN_HEIGHT = 100;

/**
 * Heavy rain particle system.
 * Dense sheets of rain that blow in the wind direction.
 * The particle field follows the boat so the storm is always around the player.
 */
export default function Rain({ storm, isInEye, boatPosition }: RainProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  // Initial positions and velocities
  const data = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3);
    const sizes = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
      pos[i * 3 + 1] = Math.random() * RAIN_HEIGHT - 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
      sizes[i] = 0.08 + Math.random() * 0.15;
    }
    return { pos, sizes };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
    return g;
  }, [data]);

  // Use a sprite texture for soft rain look
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 8, 32);
    const gradient = ctx.createLinearGradient(0, 0, 0, 32);
    gradient.addColorStop(0, 'rgba(180,200,230,0)');
    gradient.addColorStop(0.3, 'rgba(180,200,230,0.8)');
    gradient.addColorStop(0.7, 'rgba(180,200,230,0.8)');
    gradient.addColorStop(1, 'rgba(180,200,230,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(3, 0, 2, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const mat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#c0d8ee',
      size: 0.4,
      map: texture,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
  }, [texture]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;

    const visible = storm.rainIntensity > 0.05 && !isInEye;
    pointsRef.current.visible = visible;
    if (!visible) return;

    // Keep the rain centered on the boat
    pointsRef.current.position.set(boatPosition.x, 0, boatPosition.z);

    // Opacity follows storm intensity
    mat.opacity = Math.min(0.7, storm.rainIntensity * 0.5);

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const speed = 25 * (0.5 + storm.windSpeed * 0.02);
    const windX = storm.windSpeed * 0.8;
    const windZ = storm.windSpeed * 0.2;

    for (let i = 0; i < RAIN_COUNT; i++) {
      // Fast downward motion with wind drift
      pos[i * 3] -= windX * delta;
      pos[i * 3 + 1] -= speed * delta;
      pos[i * 3 + 2] += windZ * delta;

      // Reset at top, local to the boat
      if (pos[i * 3 + 1] < -10) {
        pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
        pos[i * 3 + 1] = RAIN_HEIGHT - 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
