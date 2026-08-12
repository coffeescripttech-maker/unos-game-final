import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface BoatWakeProps {
  boatPosition: THREE.Vector3;
  boatYaw: number;
  boatSpeed: number;
  visible: boolean;
}

const WAKE_SEGMENTS = 20;
const WAKE_LENGTH = 12;

/**
 * White foam wake trail behind the boat.
 * Length and opacity respond to boat speed.
 */
export default function BoatWake({ boatPosition, boatYaw, boatSpeed, visible }: BoatWakeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const positionsRef = useRef<THREE.Vector3[]>([]);

  // Build wake geometry procedurally each frame
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, WAKE_SEGMENTS);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame(() => {
    if (!meshRef.current || !visible || boatSpeed < 0.1) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    meshRef.current.position.set(
      boatPosition.x,
      0.1,
      boatPosition.z,
    );
    meshRef.current.rotation.y = boatYaw;

    // Scale wake with speed
    const wakeSize = Math.min(1, boatSpeed / 10);
    meshRef.current.scale.set(2 + wakeSize * 2, 1, (1 + wakeSize * WAKE_LENGTH));
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = wakeSize * 0.3;
  });

  return (
    <mesh ref={meshRef} geometry={geo} visible={false}>
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
