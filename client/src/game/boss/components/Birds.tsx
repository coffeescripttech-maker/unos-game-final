import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Birds circling overhead in the Eye of the Typhoon.
 * Peaceful ambiance — only visible inside the eye.
 */
export default function Birds({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const birdPositions = useMemo(() => {
    const pos: { angle: number; radius: number; height: number; speed: number; phase: number }[] = [];
    for (let i = 0; i < 8; i++) {
      pos.push({
        angle: (i / 8) * Math.PI * 2 + Math.random() * 0.5,
        radius: 15 + Math.random() * 20,
        height: 25 + Math.random() * 15,
        speed: 0.3 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return pos;
  }, []);

  const birdShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 0.15, 0.6, 0);
    shape.quadraticCurveTo(0.3, -0.05, 0, 0);
    return shape;
  }, []);

  const geo = useMemo(() => new THREE.ShapeGeometry(birdShape), [birdShape]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    groupRef.current.visible = visible;

    if (!visible) return;

    // Birds circle overhead
    birdPositions.forEach((b, i) => {
      const child = groupRef.current!.children[i];
      if (!child) return;
      const t = timeRef.current * b.speed + b.phase;
      const x = Math.cos(t + b.angle) * b.radius;
      const z = Math.sin(t + b.angle) * b.radius;
      child.position.set(x, b.height, z);
      child.rotation.y = -t - b.angle + Math.PI / 2;
      // Gentle wing flap
      child.rotation.z = Math.sin(t * 3) * 0.2;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {birdPositions.map((_, i) => (
        <mesh key={i} geometry={geo}>
          <meshBasicMaterial color="#334455" side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
