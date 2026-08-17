import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createBoatTexture, useBossTexture } from '../utils/textures';

interface BoatProps {
  boatRef: React.MutableRefObject<THREE.Group | null>;
  integrity: number;
  engineRunning: boolean;
}

const BOAT_SCALE = 5.5;

/**
 * PAGASA research vessel as a crisp top-down sprite.
 * The sprite's bow points toward world -Z when yaw is 0, matching the controller.
 * The texture is generated at runtime, so no external image file is needed.
 */
export default function Boat({ boatRef, integrity }: BoatProps) {
  const spriteRef = useRef<THREE.Mesh>(null);
  const propRef = useRef<THREE.Mesh>(null);

  const texture = useBossTexture('/assets/boss/boat.png', createBoatTexture);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // Tint the whole sprite when damaged
  const damageTint = integrity < 40 ? '#ff6666' : integrity < 70 ? '#ffcc88' : '#ffffff';

  useFrame((_, delta) => {
    // Subtle bob for the sprite
    if (spriteRef.current) {
      const bob = Math.sin(Date.now() * 0.0015) * 0.04;
      spriteRef.current.position.y = bob;
    }
    // Spin the propeller overlay
    if (propRef.current) {
      propRef.current.rotation.z += delta * 18;
    }
  });

  return (
    <group ref={boatRef as React.RefObject<THREE.Group>}>
      {/* Main hull sprite — bow points to -Z */}
      <mesh
        ref={spriteRef}
        geometry={planeGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[BOAT_SCALE, BOAT_SCALE, BOAT_SCALE]}
      >
        <meshBasicMaterial
          map={texture}
          color={damageTint}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Animated propeller overlay behind the boat */}
      <mesh ref={propRef} position={[0, 0.02, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Damage smoke/fire overlay */}
      {integrity < 70 && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 16]} />
          <meshBasicMaterial
            color={integrity < 40 ? '#ff6600' : '#888888'}
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
