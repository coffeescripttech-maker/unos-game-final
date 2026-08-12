import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface OceanSprayProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
}

const SPRAY_COUNT = 200;

/**
 * Ocean spray / mist particles near the water surface.
 * Creates atmospheric depth and a sense of rough seas.
 */
export default function OceanSpray({ storm, isInEye, boatPosition }: OceanSprayProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const positions = useMemo(() => {
    const pos = new Float32Array(SPRAY_COUNT * 3);
    for (let i = 0; i < SPRAY_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  // Soft circular sprite texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.3, 'rgba(200,220,240,0.3)');
    gradient.addColorStop(1, 'rgba(200,220,240,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const mat = useMemo(() => new THREE.PointsMaterial({
    color: '#c0d8ee',
    size: 1.5,
    map: texture,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), [texture]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;

    const visible = storm.intensity > 0.2 && !isInEye;
    pointsRef.current.visible = visible;
    if (!visible) return;

    mat.opacity = Math.min(0.5, storm.waveHeight * 0.1);

    // Follow boat
    pointsRef.current.position.x = boatPosition.x;
    pointsRef.current.position.z = boatPosition.z;

    // Animate spray particles gently
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < SPRAY_COUNT; i++) {
      pos[i * 3] += (Math.random() - 0.5) * delta * 0.5;
      pos[i * 3 + 1] += (Math.random() - 0.5) * delta * 0.3;
      pos[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.5;

      if (Math.abs(pos[i * 3]) > 30 || Math.abs(pos[i * 3 + 2]) > 30 || pos[i * 3 + 1] > 8 || pos[i * 3 + 1] < 0) {
        pos[i * 3] = (Math.random() - 0.5) * 30;
        pos[i * 3 + 1] = Math.random() * 4;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
