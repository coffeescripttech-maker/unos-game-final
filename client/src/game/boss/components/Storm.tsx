import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';
import { createCloudTexture, useBossTexture } from '../utils/textures';

interface StormProps {
  storm: StormParams;
  isInEye: boolean;
}

const EYE_POSITION = new THREE.Vector3(0, 0, -150);
const EYE_RADIUS = 30;

/**
 * Flat top-down typhoon system.
 * Spiral cloud bands, a rotating eyewall ring, and a calm-eye disc.
 * Uses /assets/boss/cloud.png when available, falling back to a generated puff.
 */
export default function Storm({ storm, isInEye }: StormProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);
  const pulseRef = useRef(0);
  const cloudTexture = useBossTexture('/assets/boss/cloud.png', createCloudTexture);

  useEffect(() => {
    cloudTexture.magFilter = THREE.LinearFilter;
    cloudTexture.minFilter = THREE.LinearFilter;
    cloudTexture.needsUpdate = true;
  }, [cloudTexture]);

  const cloudBands = useMemo(() => {
    const bands: {
      angle: number;
      radius: number;
      width: number;
      length: number;
      color: string;
      opacity: number;
      yOffset: number;
    }[] = [];
    for (let arm = 0; arm < 7; arm++) {
      const baseAngle = (arm / 7) * Math.PI * 2;
      for (let ring = 0; ring < 16; ring++) {
        const t = ring / 16;
        const angle = baseAngle + t * 5 * Math.PI;
        const radius = 22 + t * 125;
        const width = 6 + t * 22;
        const length = 10 + t * 22;
        const opacity = 0.45 - t * 0.28;
        bands.push({
          angle,
          radius,
          width,
          length,
          color: t < 0.25 ? '#d0d0d8' : t < 0.6 ? '#808088' : '#40404a',
          opacity: Math.max(0.07, opacity),
          yOffset: t < 0.35 ? 1.2 : 0.6,
        });
      }
    }
    return bands;
  }, []);

  const eyewallGeo = useMemo(() => new THREE.RingGeometry(14, 22, 48), []);
  const eyeDiscGeo = useMemo(() => new THREE.CircleGeometry(14, 48), []);
  const centerMassGeo = useMemo(() => new THREE.CircleGeometry(26, 48), []);
  const domeGeo = useMemo(() => new THREE.CylinderGeometry(14, 26, 4, 48, 1, true), []);

  useFrame((_, delta) => {
    if (!groupRef.current || !cloudRef.current) return;
    rotationRef.current += delta * (0.12 + storm.intensity * 0.18);
    cloudRef.current.rotation.y = rotationRef.current;

    pulseRef.current += delta * (1.5 + storm.intensity * 2);
    const pulse = 1 + Math.sin(pulseRef.current) * 0.04;

    // Storm clouds dissipate over land — the anvil collapses without warm moist air
    const landShrink = 1 - storm.landProximity * 0.25;
    const scale = (0.9 + storm.intensity * 0.55) * pulse * landShrink;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.set(0, 0.5, -150);
  });

  return (
    <group ref={groupRef}>
      <group ref={cloudRef}>
        {/* Outer spiral cloud bands — flat planes facing the top-down camera */}
        {cloudBands.map((band, i) => (
          <mesh
            key={`band-${i}`}
            position={[
              Math.cos(band.angle) * band.radius,
              0,
              Math.sin(band.angle) * band.radius,
            ]}
            rotation={[-Math.PI / 2, 0, -band.angle]}
          >
            <planeGeometry args={[band.width, band.length]} />
            <meshBasicMaterial
              map={cloudTexture}
              color={band.color}
              transparent
              opacity={band.opacity * storm.intensity * (1 - storm.landProximity * 0.2)}
              depthWrite={false}
              side={THREE.DoubleSide}
              alphaTest={0.05}
            />
          </mesh>
        ))}

        {/* Stacked convective dome above the eyewall */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0]} geometry={domeGeo}>
          <meshBasicMaterial
            map={cloudTexture}
            color="#707078"
            transparent
            opacity={(0.25 + storm.intensity * 0.35) * (1 - storm.landProximity * 0.3)}
            depthWrite={false}
            side={THREE.DoubleSide}
            alphaTest={0.05}
          />
        </mesh>

        {/* Central cloud mass */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={centerMassGeo}>
          <meshBasicMaterial
            map={cloudTexture}
            color="#787880"
            transparent
            opacity={0.35 + storm.intensity * 0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
            alphaTest={0.05}
          />
        </mesh>

        {/* Eyewall ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={eyewallGeo}>
          <meshBasicMaterial
            color="#c0c0c8"
            transparent
            opacity={0.45 + storm.intensity * 0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Calm eye disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={eyeDiscGeo}>
          <meshBasicMaterial
            color="#e0eeff"
            transparent
            opacity={0.22 + storm.intensity * 0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Spiral rainband arcs */}
        <RainBand radius={38} angle={0} storm={storm} />
        <RainBand radius={52} angle={Math.PI * 0.55} storm={storm} />
        <RainBand radius={66} angle={Math.PI * 1.1} storm={storm} />
        <RainBand radius={80} angle={Math.PI * 1.65} storm={storm} />
        <RainBand radius={94} angle={Math.PI * 2.2} storm={storm} />
        <RainBand radius={108} angle={Math.PI * 2.75} storm={storm} />
      </group>
    </group>
  );
}

/** Spiral rainband arc drawn flat on the water */
function RainBand({ radius, angle, storm }: { radius: number; angle: number; storm: StormParams }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const a = angle + t * Math.PI * 2;
      const r = radius + t * 30;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }, [radius, angle]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <tubeGeometry args={[curve, 48, 0.4 + storm.intensity * 0.7, 6, false]} />
      <meshBasicMaterial
        color="#50505f"
        transparent
        opacity={0.18 * storm.intensity}
        depthWrite={false}
      />
    </mesh>
  );
}

export { EYE_POSITION, EYE_RADIUS };
