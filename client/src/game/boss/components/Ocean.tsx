import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface OceanProps {
  storm: StormParams;
  isInEye: boolean;
  boatRef: React.MutableRefObject<THREE.Group | null>;
}

/**
 * Realistic ocean with Gerstner wave approximation.
 * Multiple octaves, specular highlights, foam on crests,
 * Fresnel reflection, and color shift inside the eye.
 */
export default function Ocean({ storm, isInEye }: OceanProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Higher resolution grid for more detailed waves
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(800, 800, 200, 200);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveHeight: { value: 0.5 },
    uEyeBlend: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, -0.5).normalize() },
    uCameraPos: { value: new THREE.Vector3(0, 10, 0) },
  }), []);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uWaveHeight;
        uniform float uEyeBlend;

        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vFoam;

        // Gerstner wave function
        vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
          float steepness = wave.z;
          float wavelength = wave.w;
          float k = 2.0 * 3.14159 / wavelength;
          float c = sqrt(9.8 / k);
          vec2 d = normalize(wave.xy);
          float f = k * (dot(d, p.xz) - c * uTime);
          float a = steepness / k;

          tangent += vec3(
            -d.x * d.x * (steepness * sin(f)),
            d.x * (steepness * cos(f)),
            -d.x * d.y * (steepness * sin(f))
          );
          binormal += vec3(
            -d.x * d.y * (steepness * sin(f)),
            d.y * (steepness * cos(f)),
            -d.y * d.y * (steepness * sin(f))
          );

          return vec3(
            d.x * (a * cos(f)),
            a * sin(f),
            d.y * (a * cos(f))
          );
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          float calm = 1.0 - smoothstep(0.0, 0.8, uEyeBlend);
          float heightMult = uWaveHeight * max(calm, 0.05);

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);

          // 6 Gerstner waves — multiple directions and frequencies
          vec4 waves[6];
          waves[0] = vec4(1.0, 0.0, 0.3, 12.0);
          waves[1] = vec4(0.6, 0.8, 0.25, 8.0);
          waves[2] = vec4(-0.3, 0.9, 0.2, 16.0);
          waves[3] = vec4(0.9, -0.4, 0.35, 10.0);
          waves[4] = vec4(-0.7, 0.5, 0.15, 20.0);
          waves[5] = vec4(0.2, -0.8, 0.2, 14.0);

          vec3 totalOffset = vec3(0.0);
          for (int i = 0; i < 6; i++) {
            totalOffset += gerstnerWave(waves[i], pos, tangent, binormal);
          }

          pos += totalOffset * heightMult;

          vec3 normal = normalize(cross(binormal, tangent));
          vNormal = normal;
          vElevation = pos.y;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          // Foam factor — white on crests
          float crest = max(0.0, 1.0 - abs(vElevation) * 3.0);
          vFoam = smoothstep(0.7, 1.0, crest) * 0.5;

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorShallow;
        uniform vec3 uColorDeep;
        uniform float uEyeBlend;
        uniform vec3 uSunDir;
        uniform vec3 uCameraPos;

        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vFoam;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(uCameraPos - vWorldPos);
          vec3 L = normalize(uSunDir);

          // Depth-based color
          float depthFactor = smoothstep(-1.0, 1.0, vUv.x * 2.0 - 1.0);
          vec3 shallowColor = vec3(0.12, 0.55, 0.85);
          vec3 deepColor = vec3(0.02, 0.12, 0.35);
          vec3 waterColor = mix(deepColor, shallowColor, depthFactor);

          // Eye water — turquoise
          vec3 eyeColor = vec3(0.15, 0.65, 0.75);
          waterColor = mix(waterColor, eyeColor, uEyeBlend * 0.6);

          // Diffuse lighting
          float diff = max(0.0, dot(N, L));
          vec3 diffuse = waterColor * (0.3 + 0.7 * diff);

          // Specular highlights (sun reflection on water)
          vec3 H = normalize(L + V);
          float spec = pow(max(0.0, dot(N, H)), 64.0);
          vec3 specular = vec3(1.0, 0.95, 0.8) * spec * 0.6;

          // Fresnel (more reflection at grazing angles)
          float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.0);
          vec3 reflected = mix(vec3(0.05, 0.1, 0.2), vec3(0.8, 0.85, 0.9), fresnel);
          reflected *= (1.0 - uEyeBlend * 0.5);

          // Combine
          vec3 col = diffuse + specular * (1.0 - uEyeBlend * 0.5);
          col = mix(col, reflected, fresnel * 0.3);

          // Foam on crests
          vec3 foamColor = vec3(1.0, 1.0, 1.0);
          col = mix(col, foamColor, vFoam);

          // Distance fog
          float dist = length(vWorldPos - uCameraPos);
          float fog = 1.0 - exp(-dist * 0.002);
          vec3 fogColor = mix(vec3(0.05, 0.08, 0.12), vec3(0.2, 0.4, 0.5), uEyeBlend);
          col = mix(col, fogColor, fog * 0.4);

          gl_FragColor = vec4(col, 0.92);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
    });
  }, [uniforms]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    uniforms.uTime.value = timeRef.current;
    uniforms.uWaveHeight.value = isInEye ? 0.1 : 0.3 + storm.waveHeight * 1.2;
    uniforms.uEyeBlend.value = THREE.MathUtils.lerp(
      uniforms.uEyeBlend.value,
      isInEye ? 1 : 0,
      0.02,
    );

    // Update camera pos from the view matrix
    const camPos = meshRef.current.parent?.parent?.parent?.parent?.children
      ?.find(c => c.type === 'PerspectiveCamera')?.position;
    if (camPos) {
      uniforms.uCameraPos.value.copy(camPos as THREE.Vector3);
    }
  });

  return <mesh ref={meshRef} geometry={geo} material={mat} />;
}
