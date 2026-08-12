import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface WeatherBuoyProps {
  position: THREE.Vector3 | null;
  deployed: boolean;
}

/**
 * Deployable weather buoy.
 * Floats on the ocean surface, bobbing with waves.
 * Has an antenna with blinking light.
 */
export default function WeatherBuoy({ position, deployed }: WeatherBuoyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.Mesh>(null);
  const floatTimeRef = useRef(0);

  useEffect(() => {
    if (groupRef.current && position) {
      groupRef.current.position.copy(position);
      groupRef.current.position.y = 0.2; // water surface
    }
  }, [position]);

  useFrame((_, delta) => {
    if (!groupRef.current || !deployed) return;
    floatTimeRef.current += delta;

    // Bob with waves
    const waveY = Math.sin(floatTimeRef.current * 0.8 + groupRef.current.position.x * 0.05) * 0.1;
    groupRef.current.position.y = 0.2 + waveY;

    // Slight tilt
    groupRef.current.rotation.x = Math.sin(floatTimeRef.current * 0.5) * 0.02;
    groupRef.current.rotation.z = Math.cos(floatTimeRef.current * 0.6) * 0.02;

    // Blinking light
    if (lightRef.current) {
      const blink = Math.sin(floatTimeRef.current * 3) > 0.5 ? 1 : 0.2;
      (lightRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  });

  if (!deployed || !position) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Buoy body (yellow cylinder) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 0.5, 8]} />
        <meshLambertMaterial color="#ffdd00" flatShading />
      </mesh>

      {/* Top dome */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshLambertMaterial color="#ffaa00" flatShading />
      </mesh>

      {/* Antenna mast */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 4]} />
        <meshBasicMaterial color="#888888" />
      </mesh>

      {/* Blinking light */}
      <mesh ref={lightRef} position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={1} />
      </mesh>

      {/* Float ring */}
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.08, 6, 12]} />
        <meshLambertMaterial color="#ff4444" flatShading />
      </mesh>

      {/* Submerged weight */}
      <mesh position={[0, -0.5, 0]}>
        <sphereGeometry args={[0.2, 6, 4]} />
        <meshLambertMaterial color="#555555" flatShading />
      </mesh>
    </group>
  );
}
