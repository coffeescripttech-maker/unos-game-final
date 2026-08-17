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
const WAVE_SPAWN_INTERVAL = 4;

/**
 * Top-down giant waves shown as expanding flat rings.
 * The player avoids the moving ring front; collision uses distance to the ring radius.
 *
 * We keep the wave physics in a ref and mutate a small pool of Three.js meshes
 * directly each frame — no React re-renders needed.
 */
export default function GiantWave({ storm, isInEye, boatPosition, onBoatHit }: GiantWaveProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spawnTimerRef = useRef(0);
  const waveIdRef = useRef(0);
  const wavesRef = useRef<GiantWaveData[]>([]);

  const ringGeo = useMemo(() => new THREE.RingGeometry(0.9, 1.0, 32), []);

  const waveMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#4aa3d1',
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const foamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  // Pre-allocate a pool of mesh pairs (wave ring + foam ring)
  const poolRef = useRef<{
    id: number | null;
    wave: THREE.Mesh;
    foam: THREE.Mesh;
  }[]>([]);

  const spawnWave = useCallback(() => {
    const id = waveIdRef.current++;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 60 + Math.random() * 50;
    const speed = 8 + storm.windSpeed * 0.15;
    const width = 2 + storm.waveHeight * 0.8;

    wavesRef.current.push({
      id,
      position: new THREE.Vector3(
        Math.cos(angle) * spawnDist,
        0,
        Math.sin(angle) * spawnDist,
      ),
      velocity: new THREE.Vector3(
        -Math.cos(angle) * speed,
        0,
        -Math.sin(angle) * speed,
      ),
      height: speed,
      width,
      active: true,
      radius: 0,
    });
  }, [storm.windSpeed, storm.waveHeight]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isInEye || storm.intensity < 0.4) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    spawnTimerRef.current += delta;
    if (spawnTimerRef.current > WAVE_SPAWN_INTERVAL / (0.5 + storm.intensity * 0.5)) {
      spawnTimerRef.current = 0;
      if (wavesRef.current.length < MAX_WAVES) spawnWave();
    }

    // Update physics
    for (let i = wavesRef.current.length - 1; i >= 0; i--) {
      const w = wavesRef.current[i];
      if (!w.active) continue;

      const expansion = Math.sqrt(w.velocity.x ** 2 + w.velocity.z ** 2) * delta;
      w.radius += expansion;

      const distFromOrigin = Math.sqrt(w.position.x ** 2 + w.position.z ** 2);
      if (w.radius > 140 || distFromOrigin > 200) {
        wavesRef.current.splice(i, 1);
        continue;
      }

      const distToBoat = w.position.distanceTo(boatPosition);
      if (Math.abs(distToBoat - w.radius) < w.width * 0.5 + 2) {
        const damage = Math.round(w.height * 0.5);
        onBoatHit?.(damage);
        wavesRef.current.splice(i, 1);
      }
    }

    // Sync mesh pool to active waves
    const pool = poolRef.current;
    for (let i = 0; i < MAX_WAVES; i++) {
      const w = wavesRef.current[i];
      const slot = pool[i];
      if (!w || !slot) continue;

      slot.id = w.id;
      slot.wave.visible = true;
      slot.foam.visible = true;

      const thickness = w.width * 0.12;
      const scale = w.radius;

      slot.wave.position.set(w.position.x, 0.1, w.position.z);
      slot.wave.scale.set(scale, scale, 1);

      slot.foam.position.set(w.position.x, 0.12, w.position.z);
      slot.foam.scale.set(scale + thickness, scale + thickness, 1);
    }

    // Hide unused slots
    for (let i = wavesRef.current.length; i < MAX_WAVES; i++) {
      const slot = pool[i];
      if (!slot) continue;
      slot.id = null;
      slot.wave.visible = false;
      slot.foam.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {Array.from({ length: MAX_WAVES }).map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              if (!el || poolRef.current[i]) return;
              poolRef.current[i] = {
                id: null,
                wave: el,
                foam: null as unknown as THREE.Mesh,
              };
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            geometry={ringGeo}
            material={waveMat}
          />
          <mesh
            ref={(el) => {
              if (!el || !poolRef.current[i] || poolRef.current[i].foam) return;
              poolRef.current[i].foam = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            geometry={ringGeo}
            material={foamMat}
          />
        </group>
      ))}
    </group>
  );
}
