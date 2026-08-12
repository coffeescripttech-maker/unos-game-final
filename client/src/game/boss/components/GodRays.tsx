import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Warm god rays / light shafts inside the Eye of the Typhoon.
 * Semi-transparent spinning cones from above.
 */
export default function GodRays({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.visible = visible;
    if (!visible) return;

    timeRef.current += delta;
    // Slowly rotate the rays
    groupRef.current.rotation.y += delta * 0.02;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, 60, -150]}>
      {/* Multiple light shafts */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 30;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, -20, Math.sin(angle) * radius]}
            rotation={[1.2, -angle, 0.3]}
          >
            <coneGeometry args={[2, 60, 6]} />
            <meshBasicMaterial
              color="#ffdd88"
              transparent
              opacity={0.04 + Math.sin(i * 1.5) * 0.02}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
      {/* Central warm glow */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial
          color="#ffcc66"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
