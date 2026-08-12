import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { StormParams } from '../types';

interface LightningProps {
  storm: StormParams;
  isInEye: boolean;
  onThunder?: () => void;
}

/**
 * Lightning flash and bolt effects.
 * Randomly triggers based on storm intensity.
 * Camera shake on flash. Branching bolt meshes.
 */
export default function Lightning({ storm, isInEye, onThunder }: LightningProps) {
  const flashRef = useRef<THREE.Mesh>(null);
  const boltGroupRef = useRef<THREE.Group>(null);
  const flashIntensityRef = useRef(0);
  const nextStrikeRef = useRef(5 + Math.random() * 10);
  const timeRef = useRef(0);
  const boltMeshesRef = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();

  // Generate a branching lightning bolt
  const createBolt = useCallback(() => {
    const group = new THREE.Group();
    const segments = 8 + Math.floor(Math.random() * 6);
    const startX = (Math.random() - 0.5) * 200;
    const startZ = (Math.random() - 0.5) * 200 - 100;
    const boltHeight = 40 + Math.random() * 30;

    type Point = { x: number; y: number; z: number };
    const points: Point[] = [];
    let x = startX;
    let y = boltHeight;
    let z = startZ;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      x += (Math.random() - 0.5) * 15;
      y -= boltHeight / segments;
      z += (Math.random() - 0.5) * 15;
      points.push({ x, y, z });
    }

    const upVec = new THREE.Vector3(0, 1, 0);

    // Draw main bolt as line segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const mid = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        (p1.y + p2.y) / 2,
        (p1.z + p2.z) / 2,
      );
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(upVec, dir);

      const boltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * (1 - i / segments), 0.15 * (1 - i / segments), length, 3),
        new THREE.MeshBasicMaterial({ color: '#aaddff', transparent: true, opacity: 1 }),
      );
      boltMesh.position.copy(mid);
      boltMesh.quaternion.copy(quat);
      group.add(boltMesh);
    }

    // Add branches (recursive sub-bolts)
    for (let b = 0; b < 3; b++) {
      const startIdx = Math.floor(Math.random() * (points.length - 2)) + 1;
      const pStart = points[startIdx];
      const branchLength = 5 + Math.random() * 10;
      const bx = pStart.x + (Math.random() - 0.5) * 10;
      const by = pStart.y - branchLength * 0.5;
      const bz = pStart.z + (Math.random() - 0.5) * 10;

      const dxB = bx - pStart.x;
      const dyB = by - pStart.y;
      const dzB = bz - pStart.z;
      const lenB = Math.sqrt(dxB * dxB + dyB * dyB + dzB * dzB);
      const midB = new THREE.Vector3(
        (pStart.x + bx) / 2,
        (pStart.y + by) / 2,
        (pStart.z + bz) / 2,
      );
      const dirB = new THREE.Vector3(dxB, dyB, dzB).normalize();
      const quatB = new THREE.Quaternion().setFromUnitVectors(upVec, dirB);

      const branchMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, lenB, 3),
        new THREE.MeshBasicMaterial({ color: '#88ccff', transparent: true, opacity: 0.7 }),
      );
      branchMesh.position.copy(midB);
      branchMesh.quaternion.copy(quatB);
      group.add(branchMesh);
    }

    return group;
  }, []);

  // Kick off lightning flash
  const triggerStrike = useCallback(() => {
    flashIntensityRef.current = 1.0;

    // Replace bolt geometry
    if (boltGroupRef.current) {
      while (boltGroupRef.current.children.length > 0) {
        const child = boltGroupRef.current.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          (child.material as THREE.Material)?.dispose();
        }
        boltGroupRef.current.remove(child);
      }
      boltGroupRef.current.add(createBolt());
    }

    // Camera shake
    const shakeAmount = 0.2 + storm.intensity * 0.3;
    camera.position.x += (Math.random() - 0.5) * shakeAmount;
    camera.position.y += (Math.random() - 0.5) * shakeAmount * 0.5;

    // Thunder sound
    onThunder?.();
  }, [createBolt, storm.intensity, camera, onThunder]);

  useFrame((_, delta) => {
    timeRef.current += delta;

    // Flash decay
    if (flashIntensityRef.current > 0) {
      flashIntensityRef.current *= 0.9;
      if (flashIntensityRef.current < 0.01) flashIntensityRef.current = 0;
    }

    // Update flash mesh
    if (flashRef.current) {
      const opacity = flashIntensityRef.current * 0.3;
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      flashRef.current.visible = opacity > 0.01;
    }

    // Update bolt visibility (fade with flash)
    if (boltGroupRef.current) {
      boltGroupRef.current.visible = flashIntensityRef.current > 0.05;
    }

    // Schedule next strike
    if (isInEye) {
      nextStrikeRef.current = 999; // no lightning in eye
      return;
    }

    nextStrikeRef.current -= delta;
    if (nextStrikeRef.current <= 0) {
      triggerStrike();
      const interval = 3 + storm.lightningRate * 8;
      nextStrikeRef.current = interval * (0.5 + Math.random() * 0.5);
    }
  });

  // Cleanup meshes on unmount
  useEffect(() => {
    return () => {
      boltMeshesRef.current.forEach(m => {
        m.geometry?.dispose();
        (m.material as THREE.Material)?.dispose();
      });
    };
  }, []);

  return (
    <group>
      {/* Full-screen flash */}
      <mesh ref={flashRef} position={[0, 20, -200]}>
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bolt geometry container */}
      <group ref={boltGroupRef} />
    </group>
  );
}
