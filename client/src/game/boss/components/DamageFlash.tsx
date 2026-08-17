import { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DamageFlashProps {
  hullIntegrity: number;
  maxIntegrity: number;
}

export interface DamageFlashHandle {
  triggerFlash: () => void;
}

/**
 * Full-screen damage overlay.
 * - Red flash burst on hull hit (decays over ~0.4s).
 * - Pulsing red vignette border when hull ≤ 30%.
 * Mounted inside the R3F Canvas so it inherits the camera/viewport automatically.
 */
const DamageFlash = forwardRef<DamageFlashHandle, DamageFlashProps>(
  ({ hullIntegrity, maxIntegrity }, ref) => {
    const flashRef = useRef(0);
    const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
    const vigMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
    const vigMeshRef = useRef<THREE.Mesh>(null);

    // Expose triggerFlash() to the parent
    useImperativeHandle(ref, () => ({
      triggerFlash: () => { flashRef.current = 0.8; },
    }), []);

    // Build vignette texture once
    const vigTexture = useRef(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.5)');
      g.addColorStop(0.85, 'rgba(180,10,10,0.85)');
      g.addColorStop(1, 'rgba(180,10,10,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }).current();

    useFrame(() => {
      const vigMesh = vigMeshRef.current;
      if (!vigMesh) return;

      // Decay flash
      flashRef.current = Math.max(0, flashRef.current - 0.04);
      if (matRef.current) matRef.current.opacity = flashRef.current;

      // Low-hull pulsing vignette
      const hullPct = Math.max(0, hullIntegrity / maxIntegrity);
      const lowHull = hullPct <= 0.3;
      if (vigMatRef.current) {
        vigMatRef.current.opacity = lowHull
          ? 0.35 + Math.sin(Date.now() * 0.007) * 0.2
          : 0;
      }
    });

    return (
      <>
        {/* Vignette border — pulses red when low hull */}
        <mesh ref={vigMeshRef} position={[0, 99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={vigMatRef}
            map={vigTexture}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Full-screen red flash */}
        <mesh position={[0, 100, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={matRef}
            color="#bb0000"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </>
    );
  }
);

DamageFlash.displayName = 'DamageFlash';
export default DamageFlash;
