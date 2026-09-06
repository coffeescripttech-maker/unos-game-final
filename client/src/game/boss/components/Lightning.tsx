import { useRef, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface LightningProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
  onThunder?: () => void;
}

interface Bolt {
  id: number;
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

/**
 * Top-down lightning flash with local bolts around the boat.
 * The flash lights up the whole screen while jagged bolt sprites crack
 * near the player, making the storm feel close and dangerous.
 */
export default function Lightning({ storm, isInEye, boatPosition, onThunder }: LightningProps) {
  const flashRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const flashIntensityRef = useRef(0);
  const nextStrikeRef = useRef(5 + Math.random() * 10);
  const timeRef = useRef(0);
  const boltIdRef = useRef(0);
  const boltsRef = useRef<Bolt[]>([]);

  const boltGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const boltMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const createBoltTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    let x = 32;
    for (let y = 20; y < 256; y += 30) {
      x = 32 + (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    // glow
    ctx.strokeStyle = 'rgba(160,200,255,0.4)';
    ctx.lineWidth = 12;
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const spawnBolt = useCallback(() => {
    if (!groupRef.current) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    const mesh = new THREE.Mesh(boltGeo, boltMat.clone());
    mesh.material.map = createBoltTexture;
    mesh.position.set(
      boatPosition.x + Math.cos(angle) * dist,
      0.5,
      boatPosition.z + Math.sin(angle) * dist,
    );
    mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    mesh.scale.set(8, 24, 1);
    groupRef.current.add(mesh);
    boltsRef.current.push({ id: boltIdRef.current++, mesh, life: 0.25, maxLife: 0.25 });
  }, [boatPosition, boltGeo, boltMat, createBoltTexture]);

  const triggerStrike = useCallback(() => {
    flashIntensityRef.current = 1.0;
    spawnBolt();
    onThunder?.();
  }, [onThunder, spawnBolt]);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (flashIntensityRef.current > 0) {
      flashIntensityRef.current *= 0.85;
      if (flashIntensityRef.current < 0.01) flashIntensityRef.current = 0;
    }

    if (flashRef.current) {
      const opacity = flashIntensityRef.current * 0.4;
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      flashRef.current.visible = opacity > 0.01;
    }

    // Update bolts
    for (let i = boltsRef.current.length - 1; i >= 0; i--) {
      const bolt = boltsRef.current[i];
      bolt.life -= delta;
      const mat = bolt.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, bolt.life / bolt.maxLife);
      bolt.mesh.visible = mat.opacity > 0.01;
      if (bolt.life <= 0) {
        groupRef.current?.remove(bolt.mesh);
        mat.dispose();
        boltsRef.current.splice(i, 1);
      }
    }

    if (isInEye) {
      nextStrikeRef.current = 999;
      return;
    }

    nextStrikeRef.current -= delta;
    if (nextStrikeRef.current <= 0) {
      triggerStrike();
      // Land-weakening: increase lightning interval (less frequent strikes) over land
      const interval = 2.5 + storm.lightningRate * 6 + storm.landProximity * 4;
      nextStrikeRef.current = interval * (0.5 + Math.random() * 0.5);
    }
  });

  useEffect(() => {
    return () => {
      // nothing to dispose for a single shared mesh material
    };
  }, []);

  return (
    <group ref={groupRef}>
      <mesh ref={flashRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 60, 0]} visible={false}>
        <planeGeometry args={[900, 900]} />
        <meshBasicMaterial
          color="#d0e8ff"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
