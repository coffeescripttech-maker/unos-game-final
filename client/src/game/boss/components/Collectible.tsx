import { useRef, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CollectibleData, ObjectiveId } from '../types';
import { createCollectibleTexture, useBossTexture } from '../utils/textures';

interface CollectibleProps {
  data: CollectibleData;
  onCollect: (id: string) => void;
  boatPosition: THREE.Vector3;
}

const COLLECT_DISTANCE = 5;
const MARKER_SCALE = 4;

const MARKER_PATHS: Record<ObjectiveId, string> = {
  collect_temperature: '/assets/boss/marker_temperature.png',
  collect_humidity: '/assets/boss/marker_humidity.png',
  collect_pressure: '/assets/boss/marker_swirl.png',
  collect_windspeed: '/assets/boss/marker_wind.png',
  deploy_buoy: '/assets/boss/marker.png',
  reach_eye: '/assets/boss/marker_eye.png',
  complete: '/assets/boss/marker_eye.png',
};

/**
 * Top-down data marker.
 * Uses a dedicated /assets/boss/marker_<type>.png per collectible, falling
 * back to a generated canvas icon. Tinted per collectible so each data type
 * stays distinct.
 */
export default function Collectible({ data, onCollect, boatPosition }: CollectibleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const collectedRef = useRef(false);
  const vanishRef = useRef(0);

  const markerPath = MARKER_PATHS[data.id] ?? '/assets/boss/marker.png';
  const fallbackFactory = useCallback(
    () => createCollectibleTexture(data.color, data.icon),
    [data.color, data.icon],
  );
  const texture = useBossTexture(markerPath, fallbackFactory);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const dotGeo = useMemo(() => new THREE.PlaneGeometry(0.35, 0.35), []);

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    if (!groupRef.current || data.collected) return;

    const bobY = Math.sin(Date.now() * 0.002 + data.position.x) * 0.15;
    groupRef.current.position.y = data.position.y + bobY;

    if (glowRef.current) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.4;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.45;
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.z += delta * 1.2;
    }

    const dist = groupRef.current.position.distanceTo(boatPosition);
    if (dist < COLLECT_DISTANCE && !collectedRef.current) {
      collectedRef.current = true;
      onCollect(data.id);
    }

    if (collectedRef.current) {
      vanishRef.current += delta * 3;
      const scale = Math.max(0, 1 - vanishRef.current);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.visible = scale > 0.01;
    }
  });

  if (data.collected) return null;

  return (
    <group
      ref={groupRef}
      position={[data.position.x, data.position.y, data.position.z]}
      scale={[1, 1, 1]}
      renderOrder={2}
    >
      {/* Outer glow */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} scale={[2.8, 2.8, 2.8]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Icon sprite */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[MARKER_SCALE, MARKER_SCALE, MARKER_SCALE]}
        geometry={planeGeo}
        renderOrder={2}
      >
        <meshBasicMaterial
          map={texture}
          color={data.color}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Animated orbiting dots */}
      <group ref={orbitRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        {[0, 1, 2].map(i => {
          const angle = (i / 3) * Math.PI * 2;
          const radius = 2.6;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0.05]}
              geometry={dotGeo}
              renderOrder={2}
            >
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
