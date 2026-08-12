import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';
import type { MutableRefObject } from 'react';

interface SkyProps {
  storm: StormParams;
  isInEye: boolean;
  boatRef: MutableRefObject<THREE.Group | null>;
}

/**
 * Realistic sky dome with gradient + cloud layers.
 * Shifts from golden-hour horizon to storm-dark during the eyewall.
 * Opens to clear blue sky with warm sunlight inside the eye.
 * Cloud layers rotate overhead for added depth.
 */
export default function Sky({ storm, isInEye }: SkyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const eyeBlendRef = useRef(0);
  const cloudLayerRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Sky dome shader
  const domeGeo = useMemo(() => new THREE.SphereGeometry(400, 32, 24), []);

  const domeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uStorm: { value: 0 },
        uEyeBlend: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uStorm;
        uniform float uEyeBlend;
        varying vec3 vWorldPos;

        void main() {
          float height = normalize(vWorldPos).y;
          float h = max(0.0, height);

          // Storm sky: dark grays with greenish tint
          vec3 stormTop = vec3(0.03, 0.03, 0.08);
          vec3 stormMid = vec3(0.08, 0.07, 0.06);
          vec3 stormBot = vec3(0.12, 0.10, 0.08);

          // Clear sky: realistic blue gradient
          vec3 clearTop = vec3(0.15, 0.45, 0.85);
          vec3 clearMid = vec3(0.30, 0.60, 0.90);
          vec3 clearBot = vec3(0.55, 0.75, 0.95);

          // Warm golden hour horizon
          vec3 goldHorizon = vec3(1.0, 0.7, 0.3);
          vec3 goldUpper = vec3(0.5, 0.6, 0.9);

          // Interpolate storm gradient
          vec3 stormColor;
          if (h < 0.3) {
            stormColor = mix(stormBot, stormMid, h / 0.3);
          } else {
            stormColor = mix(stormMid, stormTop, (h - 0.3) / 0.7);
          }

          // Interpolate clear gradient with golden horizon
          vec3 clearColor;
          if (h < 0.05) {
            clearColor = mix(goldHorizon, clearBot, h / 0.05);
          } else if (h < 0.3) {
            clearColor = mix(clearBot, clearMid, (h - 0.05) / 0.25);
          } else {
            clearColor = mix(clearMid, clearTop, (h - 0.3) / 0.7);
          }

          // Blend based on eye transition
          vec3 finalColor = mix(stormColor, clearColor, uEyeBlend);

          // Golden horizon glow (more visible in eye)
          float horizonGlow = exp(-abs(height) * 10.0);
          finalColor += goldHorizon * horizonGlow * 0.4 * (1.0 - uStorm * 0.6);

          // Storm darkens everything
          finalColor *= (1.0 - uStorm * 0.45);

          // Slight blue tint at zenith in eye
          float zenith = pow(max(0.0, h), 2.0);
          finalColor += vec3(0.1, 0.2, 0.4) * zenith * uEyeBlend * 0.3;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  // Cloud layer planes
  const cloudPositions = useMemo(() => {
    const positions: { x: number; z: number; scale: number; speed: number }[] = [];
    for (let i = 0; i < 20; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 600,
        scale: 10 + Math.random() * 30,
        speed: 0.02 + Math.random() * 0.04,
      });
    }
    return positions;
  }, []);

  const cloudGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 1, h = 0.4;
    shape.moveTo(-w, 0);
    shape.quadraticCurveTo(-w * 0.6, h, 0, h);
    shape.quadraticCurveTo(w * 0.6, h, w, 0);
    shape.quadraticCurveTo(w * 0.6, -h * 0.3, 0, -h * 0.3);
    shape.quadraticCurveTo(-w * 0.6, -h * 0.3, -w, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const storm = domeMat.uniforms.uStorm;
    const eye = domeMat.uniforms.uEyeBlend;

    // Storm intensity follows prop
    storm.value = THREE.MathUtils.lerp(storm.value, 0.3, 0.02);

    // Eye blend transition
    eyeBlendRef.current = THREE.MathUtils.lerp(
      eyeBlendRef.current,
      isInEye ? 1 : 0,
      0.02,
    );
    eye.value = eyeBlendRef.current;

    // Sun position: low during storm, higher in eye
    if (sunRef.current) {
      const targetY = isInEye ? 0.4 : -0.15;
      sunRef.current.position.y = THREE.MathUtils.lerp(
        sunRef.current.position.y,
        targetY,
        0.02,
      );
    }

    // Animate cloud layers
    if (cloudLayerRef.current) {
      cloudLayerRef.current.rotation.y += delta * 0.005;
      cloudLayerRef.current.visible = isInEye || storm.value > 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Sky dome */}
      <mesh geometry={domeGeo} material={domeMat} />

      {/* Cloud layer (in front of dome) */}
      <group ref={cloudLayerRef} position={[0, 60, 0]}>
        {cloudPositions.map((c, i) => (
          <mesh
            key={i}
            position={[c.x, 0, c.z]}
            scale={[c.scale, c.scale, c.scale]}
            rotation={[0, Math.random() * Math.PI, 0]}
            geometry={cloudGeo}
          >
            <meshBasicMaterial
              color={isInEye ? '#e8e8f0' : '#505060'}
              transparent
              opacity={isInEye ? 0.3 : 0.15}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Sun */}
      <mesh ref={sunRef} position={[100, -0.15, -80]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#FFE4B5" transparent opacity={0.9} />
      </mesh>

      {/* Sun glow */}
      <mesh position={[100, -0.15, -80]}>
        <sphereGeometry args={[12, 16, 16]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={isInEye ? 0.3 : 0.08}
        />
      </mesh>

      {/* Sun corona (visible in eye) */}
      {isInEye && (
        <mesh position={[100, -0.15, -80]} rotation={[0, 0, 0]}>
          <ringGeometry args={[8, 25, 32]} />
          <meshBasicMaterial
            color="#FFEECC"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
