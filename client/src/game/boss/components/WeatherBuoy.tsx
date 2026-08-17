import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createBuoyTexture } from '../utils/textures';

interface WeatherBuoyProps {
  position: THREE.Vector3 | null;
  deployed: boolean;
}

const BUOY_SCALE = 3;

/**
 * Deployable weather buoy as a top-down sprite.
 * Floats on the ocean surface with a blinking light overlay.
 */
export default function WeatherBuoy({ position, deployed }: WeatherBuoyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.Mesh>(null);
  const floatTimeRef = useRef(0);

  const texture = useMemo(() => createBuoyTexture(), []);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  useEffect(() => {
    if (groupRef.current && position) {
      groupRef.current.position.copy(position);
      groupRef.current.position.y = 0.2;
    }
  }, [position]);

  useFrame((_, delta) => {
    if (!groupRef.current || !deployed) return;
    floatTimeRef.current += delta;

    const waveY = Math.sin(floatTimeRef.current * 0.8 + groupRef.current.position.x * 0.05) * 0.1;
    groupRef.current.position.y = 0.2 + waveY;

    // Blinking light
    if (lightRef.current) {
      const blink = Math.sin(floatTimeRef.current * 3) > 0.5 ? 1 : 0.2;
      (lightRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  });

  if (!deployed || !position) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Buoy sprite */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[BUOY_SCALE, BUOY_SCALE, BUOY_SCALE]} geometry={planeGeo}>
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Blinking light overlay */}
      <mesh ref={lightRef} position={[0, 0.05, -1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 12]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
