import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';
import { createWaterTileTexture, useBossTexture } from '../utils/textures';

interface OceanProps {
  storm: StormParams;
  isInEye: boolean;
  boatRef: React.MutableRefObject<THREE.Group | null>;
}

/**
 * Stylised flat ocean for the top-down 2D boss view.
 * Uses /assets/boss/water.png when available, falling back to a generated
 * tileable water texture. Adds directional swell, wind-driven foam streaks,
 * and whitecaps that intensify with the storm.
 */
export default function Ocean({ storm, isInEye }: OceanProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const waterTexture = useBossTexture('/assets/boss/water.png', createWaterTileTexture);

  useEffect(() => {
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(18, 18);
    waterTexture.needsUpdate = true;
  }, [waterTexture]);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 2, 2);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveHeight: { value: 0.5 },
    uWindSpeed: { value: 0 },
    uEyeBlend: { value: 0 },
    uColorDeep: { value: new THREE.Color('#0a2472') },
    uColorMid: { value: new THREE.Color('#1e5aa0') },
    uColorEye: { value: new THREE.Color('#1e7a8a') },
    uColorFoam: { value: new THREE.Color('#cceeff') },
    uColorWhitecap: { value: new THREE.Color('#ffffff') },
    uWaterTex: { value: waterTexture },
    uTexOffset: { value: new THREE.Vector2(0, 0) },
    uWindDir: { value: new THREE.Vector2(1, 0.3) },
    uLandProximity: { value: 0 },
  }), [waterTexture]);

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
        uniform float uTime;
        uniform float uWaveHeight;
        uniform float uWindSpeed;
        uniform float uEyeBlend;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorEye;
        uniform vec3 uColorFoam;
        uniform vec3 uColorWhitecap;
        uniform sampler2D uWaterTex;
        uniform vec2 uTexOffset;
        uniform vec2 uWindDir;
        uniform float uLandProximity;

        varying vec2 vWorldPos;

        // Simple pseudo-random noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          float dist = length(vWorldPos);

          // Wind-driven texture scroll
          vec2 windNorm = normalize(uWindDir);
          float windStrength = 0.03 + uWindSpeed * 0.0015;
          vec2 texUv = vWorldPos * 0.015 + uTexOffset + windNorm * uTime * windStrength;
          vec4 texDetail = texture2D(uWaterTex, texUv);

          // Base colour mix
          vec3 water = mix(uColorDeep, uColorMid, 0.35 + 0.15 * sin(dist * 0.02));
          water = mix(water, uColorEye, uEyeBlend * 0.55);

          // Add texture detail — keep the water image visible
          water = mix(water, texDetail.rgb, 0.45);

          // Subtle directional swell lines (wind-driven)
          vec2 swellUv = vWorldPos * 0.04;
          float swell = sin(dot(swellUv, windNorm) * 6.0 - uTime * (0.6 + uWindSpeed * 0.015));
          float swellMask = smoothstep(0.3, 0.7, swell) * smoothstep(0.0, 120.0, uWindSpeed);
          water += uColorFoam * swellMask * 0.06 * uWaveHeight;

          // Cross chop / secondary waves
          vec2 chopDir = vec2(-windNorm.y, windNorm.x);
          float chop = sin(dot(vWorldPos * 0.06, chopDir) * 5.0 - uTime * 1.0);
          float chopMask = smoothstep(0.4, 0.8, chop) * 0.03 * uWaveHeight;
          water += uColorMid * chopMask;

          // Stylised moving wave rings (storm spiral feel)
          float ring = sin(dist * 0.08 - uTime * 0.6);
          float ring2 = sin(dist * 0.15 - uTime * 0.9);
          float ringMix = smoothstep(0.2, 0.8, ring) * 0.08;
          float ringMix2 = smoothstep(0.2, 0.8, ring2) * 0.04 * uWaveHeight;

          water += uColorMid * ringMix;
          water += uColorFoam * ringMix2;

          // Whitecaps / foam streaks when storm is strong
          float foamNoise = hash(vWorldPos * 0.07 + floor(uTime * 1.5));
          float foamThresh = 0.97 - uWaveHeight * 0.2;
          float whitecap = smoothstep(foamThresh, 1.0, foamNoise) * smoothstep(40.0, 80.0, uWindSpeed) * uWaveHeight;
          water = mix(water, uColorWhitecap, whitecap * 0.4);

          // Subtle darkening toward the storm edge
          float edge = smoothstep(350.0, 420.0, dist);
          water = mix(water, uColorDeep * 0.6, edge * 0.5);

          // Land influence: near land, water carries sediment — warmer, shallower tone
          vec3 landColor = mix(vec3(0.30, 0.25, 0.18), vec3(0.20, 0.45, 0.35), uLandProximity);
          water = mix(water, landColor, uLandProximity * 0.35);

          gl_FragColor = vec4(water, 0.98);
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
    uniforms.uLandProximity.value = storm.landProximity;
    uniforms.uWaveHeight.value = isInEye ? 0.1 : 0.4 + storm.waveHeight * 0.8 * (1 - storm.landProximity * 0.5);
    uniforms.uWindSpeed.value = isInEye ? 5 : storm.windSpeed;
    uniforms.uEyeBlend.value = THREE.MathUtils.lerp(
      uniforms.uEyeBlend.value,
      isInEye ? 1 : 0,
      0.02,
    );

    // Slowly rotating storm wind direction
    const angle = timeRef.current * 0.025 + Math.PI / 4;
    const windDir = new THREE.Vector2(Math.sin(angle), Math.cos(angle));
    windDir.normalize();

    uniforms.uWindDir.value.lerp(windDir, 0.02);
    uniforms.uTexOffset.value.x += delta * 0.012;
    uniforms.uTexOffset.value.y += delta * 0.008;
  });

  return <mesh ref={meshRef} geometry={geo} material={mat} position={[0, -0.5, 0]} />;
}
