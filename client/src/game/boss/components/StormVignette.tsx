import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { StormParams } from '../types';

interface StormVignetteProps {
  storm: StormParams;
  isInEye: boolean;
}

/**
 * Full-screen vignette overlay that darkens the edges as the storm worsens.
 * Gives the feeling of being swallowed by the typhoon.
 */
export default function StormVignette({ storm, isInEye }: StormVignetteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#000510',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient: transparent center to dark edges
    const grad = ctx.createRadialGradient(128, 128, 40, 128, 128, 180);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,5,16,0.35)');
    grad.addColorStop(1, 'rgba(0,5,16,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  material.map = texture;
  material.alphaMap = texture;
  material.alphaTest = 0;

  useFrame(() => {
    if (!meshRef.current) return;

    // Base storm darkening, relieved inside the eye
    const target = isInEye ? 0.12 : Math.min(0.7, storm.intensity * 0.55 + storm.cloudCover * 0.25);
    material.opacity += (target - material.opacity) * 0.05;

    // Keep the vignette big enough to cover the orthographic view
    const size = Math.max(viewport.width, viewport.height) * 1.2;
    meshRef.current.scale.set(size, size, 1);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 99, 0]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
