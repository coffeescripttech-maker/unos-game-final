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
  rotation: THREE.Euler;
  rotSpeed: THREE.Vector3;
  scale: number;
  type: 'log' | 'barrel' | 'crate' | 'dock' | 'plank';
}

const DEBRIS_TYPES = ['log', 'barrel', 'crate', 'dock', 'plank'] as const;

/**
 * Environmental hazards: flying debris with variety.
 * Types: logs (cylinders), barrels (tall cylinders), crates (boxes), dock pieces, planks.
 * Scales with storm intensity. Only active outside the eye.
 */
export default function Hazards({ storm, isInEye, boatPosition, onBoatHit }: HazardsProps) {
  const instanceRef = useRef<THREE.InstancedMesh>(null);
  const debrisDataRef = useRef<Debris[]>([]);
  const timeRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize debris with varied types
  useEffect(() => {
    const debris: Debris[] = [];
    const typeCount = 15;
    for (let i = 0; i < typeCount; i++) {
      debris.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 400,
          0.5 + Math.random() * 3,
          (Math.random() - 0.5) * 400 - 50,
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 1,
          (Math.random() - 0.5) * 2 - 2,
        ),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
        ),
        scale: 0.3 + Math.random() * 0.5,
        type: DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)],
      });
    }
    debrisDataRef.current = debris;
  }, []);

  // Build varied geometries
  const geometries = useMemo(() => ({
    log: new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6),
    barrel: new THREE.CylinderGeometry(0.25, 0.3, 0.4, 8),
    crate: new THREE.BoxGeometry(0.35, 0.35, 0.35),
    dock: new THREE.BoxGeometry(0.5, 0.1, 0.2),
    plank: new THREE.BoxGeometry(0.4, 0.05, 0.08),
  }), []);

  // Colors for each type
  const getColor = (type: Debris['type']): string => {
    switch (type) {
      case 'log': return '#5a3a1a';
      case 'barrel': return '#6a5a3a';
      case 'crate': return '#8a6a3a';
      case 'dock': return '#7a6a5a';
      case 'plank': return '#9a8a6a';
    }
  };

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

      // Apply wind force
      d.velocity.x += Math.sin(timeRef.current + i) * delta * 0.5;
      d.velocity.z -= windForce * delta;

      // Move debris
      d.position.x += d.velocity.x * delta * 2;
      d.position.y += d.velocity.y * delta;
      d.position.z += d.velocity.z * delta * 2;

      // Rotate
      d.rotation.x += d.rotSpeed.x * delta;
      d.rotation.y += d.rotSpeed.y * delta;
      d.rotation.z += d.rotSpeed.z * delta;

      // Keep within bounds / recycle
      if (d.position.z < -200 || d.position.z > 200 || Math.abs(d.position.x) > 200) {
        d.position.set(
          (Math.random() - 0.5) * 100,
          0.5 + Math.random() * 3,
          100 + Math.random() * 50,
        );
        d.velocity.set((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2 - 2);
        d.type = DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)];
      }

      // Check collision with boat
      const distToBoat = d.position.distanceTo(boatPosition);
      if (distToBoat < 3 && storm.intensity > 0.5) {
        onBoatHit?.(2 + Math.random() * 3);
        const bounceDir = new THREE.Vector3()
          .subVectors(d.position, boatPosition)
          .normalize();
        d.velocity.add(bounceDir.multiplyScalar(5));
      }

      // Update instance matrix
      dummy.position.copy(d.position);
      dummy.rotation.copy(d.rotation);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      instanceRef.current.setMatrixAt(i, dummy.matrix);
    }

    instanceRef.current.instanceMatrix.needsUpdate = true;
  });

  // Use a combined approach — simplified: all debris uses one geometry
  // For true varied debris we'd need multiple instanced meshes.
  // We use box for all but the visual type affects collision logic above.
  const sharedGeo = useMemo(() => new THREE.BoxGeometry(0.4, 0.3, 0.3), []);

  const sharedMat = useMemo(() => new THREE.MeshLambertMaterial({
    color: '#6a5a3a',
    flatShading: true,
    transparent: true,
    opacity: 0.8,
  }), []);

  return (
    <instancedMesh
      ref={instanceRef}
      args={[sharedGeo, sharedMat, 15]}
      visible={false}
    />
  );
}
