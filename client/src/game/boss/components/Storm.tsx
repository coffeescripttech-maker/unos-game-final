import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface StormProps {
  storm: StormParams;
  isInEye: boolean;
}

const EYE_POSITION = new THREE.Vector3(0, 0, -150);
const EYE_RADIUS = 30;

/**
 * The typhoon storm system — rotating cloud bands, eyewall, and eye.
 * Visible from across the map. Intensifies as player approaches.
 */
export default function Storm({ storm, isInEye }: StormProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);

  // Generate cloud band positions (spiral arms)
  const cloudBands = useMemo(() => {
    const bands: {
      angle: number;
      radius: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
    }[] = [];
    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = (arm / 6) * Math.PI * 2;
      for (let ring = 0; ring < 12; ring++) {
        const t = ring / 12;
        const angle = baseAngle + t * 4 * Math.PI;
        const radius = 15 + t * 110;
        const width = 5 + t * 15;
        const height = 0.5 + t * 2;
        const opacity = 0.4 - t * 0.25;
        bands.push({
          angle,
          radius,
          width,
          height,
          color: t < 0.3 ? '#b0b0b8' : '#606068',
          opacity: Math.max(0.05, opacity),
        });
      }
    }
    return bands;
  }, []);

  // Eyewall cloud segments
  const eyewall = useMemo(() => {
    const segs: { angle: number; color: string; height: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const height = 10 + Math.sin(i * 3.7) * 5;
      segs.push({
        angle,
        color: i % 2 === 0 ? '#c0c0c8' : '#909098',
        height,
      });
    }
    return segs;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !cloudRef.current) return;
    rotationRef.current += delta * (0.1 + storm.intensity * 0.15);

    // Rotate the cloud system
    cloudRef.current.rotation.y = rotationRef.current;

    // Scale group based on storm intensity
    const scale = 0.8 + storm.intensity * 0.4;
    groupRef.current.scale.setScalar(scale);

    // Position
    groupRef.current.position.set(0, 5 + storm.intensity * 15, -150);
  });

  return (
    <group ref={groupRef}>
      <group ref={cloudRef}>
        {/* Outer cloud bands */}
        {cloudBands.map((band, i) => (
          <mesh
            key={`band-${i}`}
            position={[
              Math.cos(band.angle) * band.radius,
              -2 + Math.sin(i) * 1,
              Math.sin(band.angle) * band.radius,
            ]}
            rotation={[0, -band.angle, 0]}
          >
            <planeGeometry args={[band.width, band.height]} />
            <meshBasicMaterial
              color={band.color}
              transparent
              opacity={band.opacity * storm.intensity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* Central cloud mass */}
        <mesh position={[0, 5, 0]}>
          <sphereGeometry args={[20 + storm.intensity * 15, 16, 12]} />
          <meshLambertMaterial
            color="#606068"
            transparent
            opacity={0.3 + storm.intensity * 0.4}
          />
        </mesh>

        {/* Eyewall ring */}
        {eyewall.map((seg, i) => (
          <mesh
            key={`eye-${i}`}
            position={[
              Math.cos(seg.angle) * 16,
              seg.height * (0.3 + storm.intensity * 0.3),
              Math.sin(seg.angle) * 16,
            ]}
            scale={[3, seg.height * 0.2, 3]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshLambertMaterial
              color={seg.color}
              transparent
              opacity={0.4 + storm.intensity * 0.4}
            />
          </mesh>
        ))}

        {/* Eye glow */}
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[6, 16, 12]} />
          <meshBasicMaterial
            color="#ccddff"
            transparent
            opacity={0.15}
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

/** Spiral rainband arc */
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
    <mesh>
      <tubeGeometry args={[curve, 40, 0.3 + storm.intensity * 0.5, 4, false]} />
      <meshBasicMaterial
        color="#404050"
        transparent
        opacity={0.15 * storm.intensity}
        depthWrite={false}
      />
    </mesh>
  );
}

export { EYE_POSITION, EYE_RADIUS };
