import { useRef, useCallback } from 'react';
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

interface Warning {
  id: number;
  position: THREE.Vector3;
  timer: number;
  struck: boolean;
}

/**
 * Glowing circle warning on the ocean before lightning strikes.
 * Player should steer away from the warning zone.
 *
 * A small pool of meshes is mutated directly each frame so the warning
 * expansion animates smoothly without React re-renders.
 */
export default function LightningWarning({ storm, isInEye, boatPosition, onStrike }: LightningWarningProps) {
  const groupRef = useRef<THREE.Group>(null);
  const warningsRef = useRef<Warning[]>([]);
  const spawnTimerRef = useRef(0);
  const idRef = useRef(0);

  // Pre-allocated mesh pool: each slot has its own materials so color/opacity
  // can differ between simultaneous warnings.
  const poolRef = useRef<{
    id: number | null;
    outer: THREE.Mesh;
    inner: THREE.Mesh;
    outerMat: THREE.MeshBasicMaterial;
    innerMat: THREE.MeshBasicMaterial;
  }[]>([]);

  const ringGeo = useRef(new THREE.RingGeometry(0.7, 1, 24)).current;
  const discGeo = useRef(new THREE.CircleGeometry(0.5, 16)).current;

  const spawnWarning = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 25;
    warningsRef.current.push({
      id: idRef.current++,
      position: new THREE.Vector3(
        boatPosition.x + Math.cos(angle) * dist,
        0.2,
        boatPosition.z + Math.sin(angle) * dist,
      ),
      timer: WARNING_DURATION,
      struck: false,
    });
  }, [boatPosition]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isInEye || storm.intensity < 0.5) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    spawnTimerRef.current += delta;
    const spawnInterval = Math.max(2, 6 - storm.lightningRate * 4);
    if (spawnTimerRef.current > spawnInterval && warningsRef.current.length < MAX_WARNINGS) {
      spawnTimerRef.current = 0;
      spawnWarning();
    }

    // Update timers and trigger strikes
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

    // Sync mesh pool to active warnings
    const pool = poolRef.current;
    for (let i = 0; i < MAX_WARNINGS; i++) {
      const w = warningsRef.current[i];
      const slot = pool[i];
      if (!w || !slot) continue;

      slot.id = w.id;
      const progress = 1 - w.timer / WARNING_DURATION;
      const scale = 3 + progress * 2;
      const opacity = Math.sin(Math.max(0, progress) * Math.PI) * 0.8;

      slot.outerMat.color.setHex(progress > 0.7 ? 0xff4444 : 0xffdd44);
      slot.outerMat.opacity = opacity;
      slot.innerMat.opacity = opacity * 0.3;

      slot.outer.visible = true;
      slot.outer.position.set(w.position.x, 0.5, w.position.z);
      slot.outer.scale.set(scale, scale, 1);

      slot.inner.visible = true;
      slot.inner.position.set(w.position.x, 0.5, w.position.z);
      slot.inner.scale.set(scale, scale, 1);
    }

    // Hide unused slots
    for (let i = warningsRef.current.length; i < MAX_WARNINGS; i++) {
      const slot = pool[i];
      if (!slot) continue;
      slot.id = null;
      slot.outer.visible = false;
      slot.inner.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {Array.from({ length: MAX_WARNINGS }).map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              if (!el || poolRef.current[i]) return;
              const outerMat = new THREE.MeshBasicMaterial({
                color: '#ffdd44',
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
              });
              poolRef.current[i] = {
                id: null,
                outer: el,
                inner: null as unknown as THREE.Mesh,
                outerMat,
                innerMat: null as unknown as THREE.MeshBasicMaterial,
              };
              el.material = outerMat;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            geometry={ringGeo}
          />
          <mesh
            ref={(el) => {
              if (!el || !poolRef.current[i] || poolRef.current[i].inner) return;
              const innerMat = new THREE.MeshBasicMaterial({
                color: '#ffffff',
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
              });
              poolRef.current[i].inner = el;
              poolRef.current[i].innerMat = innerMat;
              el.material = innerMat;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            geometry={discGeo}
          />
        </group>
      ))}
    </group>
  );
}
