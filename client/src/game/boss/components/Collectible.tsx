import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CollectibleData } from '../types';

interface CollectibleProps {
  data: CollectibleData;
  onCollect: (id: string) => void;
  boatPosition: THREE.Vector3;
}

const COLLECT_DISTANCE = 5;

/**
 * Floating glowing data collectible — temperature, humidity, pressure, windspeed.
 * Spinning, bobbing, glowing orb with a label ring.
 */
export default function Collectible({ data, onCollect, boatPosition }: CollectibleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const collectedRef = useRef(false);
  const vanishRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || data.collected) return;

    // Bob up and down
    const bobY = Math.sin(Date.now() * 0.002 + data.position.x) * 0.5;
    groupRef.current.position.y = data.position.y + bobY;

    // Rotate slowly
    groupRef.current.rotation.y += delta * 0.8;

    // Pulse glow
    if (glowRef.current) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.4;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.4;
    }

    // Check proximity to boat
    const dist = groupRef.current.position.distanceTo(boatPosition);
    if (dist < COLLECT_DISTANCE && !collectedRef.current) {
      collectedRef.current = true;
      onCollect(data.id);
    }
  });

  // Scale-in animation on mount
  useFrame((_, delta) => {
    if (groupRef.current && !collectedRef.current) {
      const s = Math.min(1, (groupRef.current.scale.x + delta * 2));
      groupRef.current.scale.setScalar(s);
    }
    // Vanish effect when collected
    if (collectedRef.current && groupRef.current) {
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
      scale={[0, 0, 0]}
    >
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 16, 12]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Inner core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshBasicMaterial color={data.color} />
      </mesh>

      {/* Icon ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Light beam pointing up */}
      <mesh position={[0, -0.8, 0]}>
        <coneGeometry args={[0.3, 1.2, 6]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
