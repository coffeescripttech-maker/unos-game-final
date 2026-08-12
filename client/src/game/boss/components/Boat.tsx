import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface BoatProps {
  boatRef: React.MutableRefObject<THREE.Group | null>;
  integrity: number;
  engineRunning: boolean;
}

/**
 * PAGASA-style research vessel built from Three.js primitives.
 * Low-poly stylized with flat shading. Shows damage states visually.
 */
export default function Boat({ boatRef, integrity, engineRunning }: BoatProps) {
  const groupRef = useRef<THREE.Group>(null);
  const propellerRef = useRef<THREE.Mesh>(null);
  const radarRef = useRef<THREE.Mesh>(null);
  const smokeParticlesRef = useRef<THREE.Points>(null);

  // Shared geometries
  const geo = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    sphere: new THREE.SphereGeometry(0.5, 8, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 6),
  }), []);

  // Materials with flat shading
  const materials = useMemo(() => ({
    hull: new THREE.MeshLambertMaterial({ color: '#2a4a6a', flatShading: true }),
    hullDark: new THREE.MeshLambertMaterial({ color: '#1a3050', flatShading: true }),
    deck: new THREE.MeshLambertMaterial({ color: '#4a6a7a', flatShading: true }),
    cabin: new THREE.MeshLambertMaterial({ color: '#e8e8f0', flatShading: true }),
    roof: new THREE.MeshLambertMaterial({ color: '#3a4a5a', flatShading: true }),
    window: new THREE.MeshLambertMaterial({ color: '#88ccff', flatShading: true }),
    mast: new THREE.MeshLambertMaterial({ color: '#5a5a5a', flatShading: true }),
    radar: new THREE.MeshLambertMaterial({ color: '#cc3333', flatShading: true }),
    flag: new THREE.MeshLambertMaterial({ color: '#ff4444', flatShading: true }),
    rail: new THREE.MeshLambertMaterial({ color: '#aaaaaa', flatShading: true }),
    smoke: new THREE.PointsMaterial({
      color: '#888888',
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      blending: THREE.NormalBlending,
      depthWrite: false,
    }),
  }), []);

  // Smoke particle positions
  const smokePositions = useMemo(() => {
    const positions = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return positions;
  }, []);

  const smokeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    return g;
  }, [smokePositions]);

  useFrame((_, delta) => {
    // Spin propeller when engine running
    if (propellerRef.current) {
      propellerRef.current.rotation.y += delta * (engineRunning ? 6 : 0.5);
    }

    // Rotate radar dish
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 0.5;
    }

    // Animate smoke particles when damaged
    if (smokeParticlesRef.current && integrity < 70) {
      const positions = smokeParticlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        positions[i * 3 + 1] += delta * 0.3;
        positions[i * 3] += (Math.random() - 0.5) * delta * 0.1;
        positions[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.1;
        if (positions[i * 3 + 1] > 3) {
          positions[i * 3 + 1] = 0;
          positions[i * 3] = (Math.random() - 0.5) * 0.5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
      }
      smokeParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const damageTint = integrity < 40 ? '#ff4444' : integrity < 70 ? '#ffaa00' : '#ffffff';

  return (
    <group ref={groupRef}>
      <group ref={boatRef as React.RefObject<THREE.Group>}>
        {/* === HULL === */}
        {/* Main hull body */}
        <mesh position={[0, 0.3, 0]} scale={[1.6, 0.6, 4.5]} geometry={geo.box} material={materials.hull} />
        {/* Hull bottom (darker) */}
        <mesh position={[0, -0.1, 0.2]} scale={[1.4, 0.2, 4.0]} geometry={geo.box} material={materials.hullDark} />
        {/* Bow (front wedge) */}
        <mesh position={[0, 0.4, 2.3]} scale={[1.2, 0.4, 0.8]} geometry={geo.cone} rotation={[Math.PI / 2, 0, 0]} material={materials.hull} />
        {/* Stern (back) */}
        <mesh position={[0, 0.3, -2.3]} scale={[1.4, 0.3, 0.4]} geometry={geo.box} material={materials.hullDark} />

        {/* === DECK === */}
        <mesh position={[0, 0.7, 0.2]} scale={[1.4, 0.1, 3.8]} geometry={geo.box} material={materials.deck} />

        {/* === CABIN === */}
        <mesh position={[0, 1.2, -0.3]} scale={[1.2, 0.8, 1.8]} geometry={geo.box} material={materials.cabin} />
        {/* Cabin roof */}
        <mesh position={[0, 1.7, -0.3]} scale={[1.3, 0.1, 1.9]} geometry={geo.box} material={materials.roof} />

        {/* Windows */}
        <mesh position={[0.5, 1.1, 0.8]} scale={[0.3, 0.25, 0.05]} geometry={geo.box} material={materials.window} />
        <mesh position={[-0.5, 1.1, 0.8]} scale={[0.3, 0.25, 0.05]} geometry={geo.box} material={materials.window} />
        <mesh position={[0.5, 1.1, 0.2]} scale={[0.3, 0.25, 0.05]} geometry={geo.box} material={materials.window} />
        <mesh position={[-0.5, 1.1, 0.2]} scale={[0.3, 0.25, 0.05]} geometry={geo.box} material={materials.window} />
        {/* Front windshield */}
        <mesh position={[0, 1.2, 1.1]} scale={[0.8, 0.4, 0.05]} rotation={[0.2, 0, 0]} geometry={geo.box} material={materials.window} />

        {/* === MAST === */}
        <mesh position={[0, 2.8, -1.5]} scale={[0.08, 2.0, 0.08]} geometry={geo.cylinder} material={materials.mast} />
        {/* Cross arm */}
        <mesh position={[0.6, 3.8, -1.5]} scale={[1.0, 0.05, 0.05]} geometry={geo.box} material={materials.mast} />
        <mesh position={[-0.6, 3.8, -1.5]} scale={[1.0, 0.05, 0.05]} geometry={geo.box} material={materials.mast} />

        {/* Radar dish on mast */}
        <mesh ref={radarRef} position={[0, 4.0, -1.5]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshLambertMaterial color={damageTint} flatShading />
        </mesh>

        {/* Flag */}
        <mesh position={[0.1, 3.0, -1.5]} scale={[0.4, 0.3, 0.02]} geometry={geo.box} material={materials.flag} />

        {/* === RAILINGS === */}
        <mesh position={[0.8, 0.9, 1.2]} scale={[0.04, 0.15, 2.0]} geometry={geo.box} material={materials.rail} />
        <mesh position={[-0.8, 0.9, 1.2]} scale={[0.04, 0.15, 2.0]} geometry={geo.box} material={materials.rail} />

        {/* === PROPELLER === */}
        <group position={[0, 0.1, -2.6]}>
          <mesh ref={propellerRef} scale={[0.3, 0.05, 0.3]} geometry={geo.box} material={materials.mast} />
        </group>

        {/* === SMOKE STACK === */}
        <mesh position={[0, 2.0, 0]} scale={[0.3, 0.6, 0.3]} geometry={geo.cylinder} material={materials.mast} />

        {/* Smoke particles (visible when damaged) */}
        {integrity < 70 && (
          <points ref={smokeParticlesRef} geometry={smokeGeo} material={materials.smoke} position={[0, 2.3, 0]} />
        )}

        {/* Damage glow (fire, visible when heavily damaged) */}
        {integrity < 40 && (
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
}
