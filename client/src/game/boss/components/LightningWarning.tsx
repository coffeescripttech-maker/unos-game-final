import { useRef, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface LightningWarningProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
  onStrike?: (position: THREE.Vector3) => void;
}

const MAX_WARNINGS = 3;
const WARNING_DURATION = 1.5; // seconds before strike

/**
 * Glowing circle warning on the ocean before lightning strikes.
 * Player should steer away from the warning zone.
 */
export default function LightningWarning({ storm, isInEye, boatPosition, onStrike }: LightningWarningProps) {
  const groupRef = useRef<THREE.Group>(null);
  const warningsRef = useRef<Array<{
    position: THREE.Vector3;
    timer: number;
    struck: boolean;
  }>>([]);
  const timeRef = useRef(0);
  const spawnTimerRef = useRef(0);

  useFrame((_, delta) => {
    if (isInEye || storm.intensity < 0.5) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (!groupRef.current) return;
    groupRef.current.visible = true;

    timeRef.current += delta;
    spawnTimerRef.current += delta;

    // Spawn new warning
    const spawnInterval = Math.max(2, 6 - storm.lightningRate * 4);
    if (spawnTimerRef.current > spawnInterval && warningsRef.current.length < MAX_WARNINGS) {
      spawnTimerRef.current = 0;
      // Spawn near the boat but with some offset
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 25;
      const pos = new THREE.Vector3(
        boatPosition.x + Math.cos(angle) * dist,
        0.2,
        boatPosition.z + Math.sin(angle) * dist,
      );
      warningsRef.current.push({ position: pos, timer: WARNING_DURATION, struck: false });
    }

    // Update warnings
    for (let i = warningsRef.current.length - 1; i >= 0; i--) {
      const w = warningsRef.current[i];
      w.timer -= delta;

      if (w.timer <= 0 && !w.struck) {
        w.struck = true;
        onStrike?.(w.position);
      }

      if (w.timer < -0.5) {
        warningsRef.current.splice(i, 1);
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {warningsRef.current.map((w, i) => {
        const progress = 1 - w.timer / WARNING_DURATION;
        const scale = 3 + progress * 2;
        const opacity = Math.sin(progress * Math.PI) * 0.8;

        return (
          <group key={i} position={[w.position.x, 0.5, w.position.z]}>
            {/* Outer ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[scale * 0.7, scale, 24]} />
              <meshBasicMaterial
                color={progress > 0.7 ? '#ff4444' : '#ffdd44'}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Inner glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0, scale * 0.5, 16]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={opacity * 0.3}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
