import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface HazardsProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
  onBoatHit?: (damage: number) => void;
}

interface Debris {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  yawSpeed: number;
  scale: number;
  type: 'log' | 'barrel' | 'crate' | 'dock' | 'plank';
}

const DEBRIS_TYPES = ['log', 'barrel', 'crate', 'dock', 'plank'] as const;
const DEBRIS_COUNT = 18;

/**
 * Flat top-down debris hazards.
 * Each piece is a simple coloured plane drifting on the water surface,
 * readable from the orthographic camera and consistent with the 2D style.
 */
export default function Hazards({ storm, isInEye, boatPosition, onBoatHit }: HazardsProps) {
  const instanceRef = useRef<THREE.InstancedMesh>(null);
  const debrisDataRef = useRef<Debris[]>([]);
  const timeRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize flat debris
  useEffect(() => {
    const debris: Debris[] = [];
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      debris.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 400,
          0.15,
          (Math.random() - 0.5) * 400 - 50,
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2 - 2,
        ),
        yaw: Math.random() * Math.PI * 2,
        yawSpeed: (Math.random() - 0.5) * 1.5,
        scale: 0.5 + Math.random() * 0.6,
        type: DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)],
      });
    }
    debrisDataRef.current = debris;
  }, []);

  const getColor = (type: Debris['type']): THREE.Color => {
    switch (type) {
      case 'log': return new THREE.Color('#5a3a1a');
      case 'barrel': return new THREE.Color('#c49a3b');
      case 'crate': return new THREE.Color('#8a6a3a');
      case 'dock': return new THREE.Color('#7a7a7a');
      case 'plank': return new THREE.Color('#9a8a6a');
    }
  };

  const getScale = (type: Debris['type']): { x: number; z: number } => {
    switch (type) {
      case 'log': return { x: 0.35, z: 1.1 };
      case 'barrel': return { x: 0.55, z: 0.55 };
      case 'crate': return { x: 0.7, z: 0.7 };
      case 'dock': return { x: 1.0, z: 0.4 };
      case 'plank': return { x: 1.1, z: 0.18 };
    }
  };

  useEffect(() => {
    if (!instanceRef.current) return;
    debrisDataRef.current.forEach((d, i) => {
      instanceRef.current!.setColorAt(i, getColor(d.type));
    });
    instanceRef.current.instanceColor!.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const visible = storm.intensity > 0.3 && !isInEye;

    if (!instanceRef.current) return;
    instanceRef.current.visible = visible;
    if (!visible) return;

    const debris = debrisDataRef.current;
    const windForce = storm.windSpeed * 0.5;

    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];

      // Drift with the wind, plus a little chaotic bob
      d.velocity.x += Math.sin(timeRef.current + i) * delta * 0.5;
      d.velocity.z -= windForce * delta;

      d.position.x += d.velocity.x * delta * 2;
      d.position.z += d.velocity.z * delta * 2;
      d.yaw += d.yawSpeed * delta;

      // Recycle when it leaves the play area
      if (d.position.z < -200 || d.position.z > 200 || Math.abs(d.position.x) > 200) {
        d.position.set(
          (Math.random() - 0.5) * 100,
          0.15,
          100 + Math.random() * 50,
        );
        d.velocity.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2 - 2);
        d.type = DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)];
        instanceRef.current.setColorAt(i, getColor(d.type));
        if (instanceRef.current.instanceColor) {
          instanceRef.current.instanceColor.needsUpdate = true;
        }
      }

      // Collision with boat
      const distToBoat = d.position.distanceTo(boatPosition);
      if (distToBoat < 3 && storm.intensity > 0.5) {
        onBoatHit?.(2 + Math.random() * 3);
        const bounceDir = new THREE.Vector3()
          .subVectors(d.position, boatPosition)
          .normalize();
        d.velocity.add(bounceDir.multiplyScalar(5));
      }

      // Update instance matrix (flat on the water, yaw only)
      const s = getScale(d.type);
      dummy.position.copy(d.position);
      dummy.rotation.set(-Math.PI / 2, 0, d.yaw);
      dummy.scale.set(s.x * d.scale, s.z * d.scale, 1);
      dummy.updateMatrix();
      instanceRef.current.setMatrixAt(i, dummy.matrix);
    }

    instanceRef.current.instanceMatrix.needsUpdate = true;
  });

  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const sharedMat = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  return (
    <instancedMesh
      ref={instanceRef}
      args={[planeGeo, sharedMat, DEBRIS_COUNT]}
      visible={false}
    />
  );
}
