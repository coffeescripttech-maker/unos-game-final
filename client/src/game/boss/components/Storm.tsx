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
    }[] = [];
    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = (arm / 6) * Math.PI * 2;
      for (let ring = 0; ring < 12; ring++) {
        const t = ring / 12;
        const angle = baseAngle + t * 4 * Math.PI;
        const radius = 20 + t * 110;
        const width = 5 + t * 18;
        const length = 8 + t * 18;
        const opacity = 0.35 - t * 0.22;
        bands.push({
          angle,
          radius,
          width,
          length,
          color: t < 0.3 ? '#b8b8c0' : '#606068',
          opacity: Math.max(0.06, opacity),
        });
      }
    }
    return bands;
  }, []);

  const eyewallGeo = useMemo(() => new THREE.RingGeometry(13, 19, 32), []);
  const eyeDiscGeo = useMemo(() => new THREE.CircleGeometry(13, 32), []);
  const centerMassGeo = useMemo(() => new THREE.CircleGeometry(22, 32), []);

  useFrame((_, delta) => {
    if (!groupRef.current || !cloudRef.current) return;
    rotationRef.current += delta * (0.08 + storm.intensity * 0.12);
    cloudRef.current.rotation.y = rotationRef.current;

    // Storm clouds dissipate over land — the anvil collapses without warm moist air
    const landShrink = 1 - storm.landProximity * 0.25;
    const scale = (0.8 + storm.intensity * 0.4) * landShrink;
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

        {/* Central cloud mass */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={centerMassGeo}>
          <meshBasicMaterial
            map={cloudTexture}
            color="#606068"
            transparent
            opacity={0.25 + storm.intensity * 0.35}
            depthWrite={false}
            side={THREE.DoubleSide}
            alphaTest={0.05}
          />
        </mesh>

        {/* Eyewall ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={eyewallGeo}>
          <meshBasicMaterial
            color="#909098"
            transparent
            opacity={0.35 + storm.intensity * 0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Calm eye disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={eyeDiscGeo}>
          <meshBasicMaterial
            color="#ccddff"
            transparent
            opacity={0.12}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Spiral rainband arcs */}
        <RainBand radius={40} angle={0} storm={storm} />
        <RainBand radius={55} angle={Math.PI * 0.7} storm={storm} />
        <RainBand radius={70} angle={Math.PI * 1.4} storm={storm} />
        <RainBand radius={85} angle={Math.PI * 2.1} storm={storm} />
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
      <tubeGeometry args={[curve, 40, 0.3 + storm.intensity * 0.5, 4, false]} />
      <meshBasicMaterial
        color="#404050"
        transparent
        opacity={0.12 * storm.intensity}
        depthWrite={false}
      />
    </mesh>
  );
}

export { EYE_POSITION, EYE_RADIUS };
