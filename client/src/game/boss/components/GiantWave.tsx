import { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams, GiantWaveData } from '../types';

interface GiantWaveProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
  onBoatHit?: (damage: number) => void;
}

const MAX_WAVES = 6;
const WAVE_SPAWN_INTERVAL = 4; // seconds

/**
 * Giant waves that travel across the ocean during the storm.
 * Visually distinct — tall, foaming wall of water.
 * Rocks the boat on collision. Player must steer to avoid.
 */
export default function GiantWave({ storm, isInEye, boatPosition, onBoatHit }: GiantWaveProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const waveIdRef = useRef(0);

  // Wave state
  const wavesRef = useRef<GiantWaveData[]>([]);
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map());

  // Shared geometry for wave wall
  const waveGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const waveMat = useMemo(() => new THREE.MeshLambertMaterial({
    color: '#1a6a9a',
    transparent: true,
    opacity: 0.7,
    flatShading: true,
  }), []);

  const foamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Spawn a new wave
  const spawnWave = useCallback(() => {
    const id = waveIdRef.current++;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 80 + Math.random() * 60;
    const height = 2 + Math.random() * 3 * storm.waveHeight;
    const width = 8 + Math.random() * 6;

    const wave: GiantWaveData = {
      id,
      position: new THREE.Vector3(
        Math.cos(angle) * spawnDist,
        -1,
        Math.sin(angle) * spawnDist,
      ),
      velocity: new THREE.Vector3(
        -Math.cos(angle) * (3 + storm.windSpeed * 0.05),
        0,
        -Math.sin(angle) * (3 + storm.windSpeed * 0.05),
      ),
      height,
      width,
      active: true,
    };
    wavesRef.current.push(wave);
  }, [storm.waveHeight, storm.windSpeed]);

  useFrame((_, delta) => {
    if (isInEye || storm.intensity < 0.4) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (!groupRef.current) return;
    groupRef.current.visible = true;

    timeRef.current += delta;
    spawnTimerRef.current += delta;

    // Spawn waves periodically
    if (spawnTimerRef.current > WAVE_SPAWN_INTERVAL / (0.5 + storm.intensity * 0.5)) {
      spawnTimerRef.current = 0;
      if (wavesRef.current.length < MAX_WAVES) {
        spawnWave();
      }
    }

    // Move waves
    for (let i = wavesRef.current.length - 1; i >= 0; i--) {
      const w = wavesRef.current[i];
      if (!w.active) continue;

      w.position.x += w.velocity.x * delta;
      w.position.z += w.velocity.z * delta;

      // Check if wave passed out of range
      const distFromOrigin = Math.sqrt(w.position.x ** 2 + w.position.z ** 2);
      if (distFromOrigin > 150 || distFromOrigin < 5) {
        wavesRef.current.splice(i, 1);
        continue;
      }

      // Check collision with boat
      const distToBoat = w.position.distanceTo(boatPosition);
      if (distToBoat < w.width * 0.5 + 2 && distToBoat > 0) {
        // Wave hit — damage proportional to wave height
        const damage = Math.round(w.height * 1.5);
        onBoatHit?.(damage);
        wavesRef.current.splice(i, 1);
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {wavesRef.current.map(w => (
        <group key={w.id} position={[w.position.x, -1, w.position.z]}>
          {/* Main wave wall */}
          <mesh
            ref={(el) => { if (el) meshRefs.current.set(w.id, el); }}
            scale={[w.width, w.height, 0.5]}
            position={[0, w.height * 0.5, 0]}
            geometry={waveGeo}
            material={waveMat}
          />
          {/* Foam crest */}
          <mesh
            scale={[w.width * 0.9, 0.2, 0.6]}
            position={[0, w.height, 0]}
            geometry={waveGeo}
            material={foamMat}
          />
        </group>
      ))}
    </group>
  );
}
