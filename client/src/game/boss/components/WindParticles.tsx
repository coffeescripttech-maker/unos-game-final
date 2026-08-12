import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface WindParticlesProps {
  storm: StormParams;
  isInEye: boolean;
}

const PARTICLE_COUNT = 300;

/**
 * Visible wind streaks — thin white lines blowing across the view.
 * Intensity scales with wind speed. Calms inside the eye.
 */
export default function WindParticles({ storm, isInEye }: WindParticlesProps) {
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

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const mat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#c0d0e0',
      size: 0.4,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;

    const visible = storm.intensity > 0.2 && !isInEye;
    pointsRef.current.visible = visible;
    if (!visible) return;

    mat.opacity = Math.min(0.4, storm.windSpeed * 0.005);

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const speed = 5 + storm.windSpeed * 0.3;
    const windDir = storm.windSpeed > 40 ? 1 : 0.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] -= windDir * speed * delta;
      pos[i * 3 + 1] -= 2 * delta;
      pos[i * 3 + 2] += windDir * speed * 0.2 * delta;

      // Reset when out of bounds
      if (pos[i * 3] < -250 || pos[i * 3 + 1] < -10) {
        pos[i * 3] = 200 + Math.random() * 50;
        pos[i * 3 + 1] = 30 + Math.random() * 40;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
