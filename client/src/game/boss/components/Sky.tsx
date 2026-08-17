import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface SkyProps {
  storm: StormParams;
  isInEye: boolean;
}

/**
 * Flat top-down sky backdrop.
 * A single circular gradient plane that darkens toward the storm's edge,
 * replacing the 3D dome so the scene reads as a 2D sea chart.
 */
export default function Sky({ storm, isInEye }: SkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(450, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uStorm: { value: 0 },
    uEyeBlend: { value: 0 },
    uColorStorm: { value: new THREE.Color('#060a1a') },
    uColorMid: { value: new THREE.Color('#0a1a3a') },
    uColorEye: { value: new THREE.Color('#1a3a5a') },
  }), []);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uStorm;
        uniform float uEyeBlend;
        uniform vec3 uColorStorm;
        uniform vec3 uColorMid;
        uniform vec3 uColorEye;
        varying vec2 vWorldPos;

        void main() {
          float dist = length(vWorldPos);
          float t = smoothstep(0.0, 420.0, dist);

          vec3 color = mix(uColorMid, uColorStorm, t);
          color = mix(color, uColorEye, uEyeBlend * 0.4);
          color = mix(color, uColorStorm, uStorm * 0.35);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [uniforms]);

  useFrame(() => {
    if (!meshRef.current) return;
    uniforms.uStorm.value = THREE.MathUtils.lerp(
      uniforms.uStorm.value,
      storm.intensity,
      0.02,
    );
    uniforms.uEyeBlend.value = THREE.MathUtils.lerp(
      uniforms.uEyeBlend.value,
      isInEye ? 1 : 0,
      0.02,
    );
  });

  return <mesh ref={meshRef} geometry={geo} material={mat} position={[0, 40, 0]} />;
}
