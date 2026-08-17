import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createFishTexture, createSplashTexture } from '../utils/textures';
import { ISLANDS } from './Philippines';
import type { StormParams } from '../types';

interface FishProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
}

// Palette of reef-fish colors (tailwind hex values)
const FISH_COLORS = ['#53d769', '#4ecdc4', '#a78f40', '#ffe066', '#ff9f43'];
const FISH_COUNT = 14;
const WORLD_RADIUS = 190;
const NEAR_ISLAND = 26; // min distance from island centers
const SCATTER_RADIUS = 14; // fish dart away when boat comes within this range

const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const _qYaw = new THREE.Quaternion();
const _q = new THREE.Quaternion();

/** Simple deterministic PRNG so fish don't re-scatter every render. */
function mulberry32(a: number): () => number {
  let seed = a;
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FishData {
  baseX: number;
  baseZ: number;
  radius: number;
  speed: number;
  phase: number;
  size: number;
  color: string;
  scatterVx: number; // scatter impulse velocity (decays back to 0)
  scatterVz: number;
}

/**
 * A school of small reef fish swimming in island-avoiding patrol loops.
 * Rendered as flat top-down sprites so they read as 2D sea-chart critters.
 * Each fish trails a soft foam "wake" puff that pulses with its motion.
 * Fish scatter away when the boat comes within SCATTER_RADIUS.
 */
export default function Fish({ storm, isInEye, boatPosition }: FishProps) {
  const fishRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wakeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const timeRef = useRef(0);

  // Build fish layout once (deterministic, island-aware)
  const fish = useMemo<FishData[]>(() => {
    const rng = mulberry32(7123);
    const list: FishData[] = [];
    const islandCenters = ISLANDS.map(i => ({ x: i.position[0], z: i.position[2] }));

    const nearIsland = (x: number, z: number) =>
      islandCenters.some(ic => Math.hypot(x - ic.x, z - ic.z) < NEAR_ISLAND);

    while (list.length < FISH_COUNT) {
      const angle = rng() * Math.PI * 2;
      const r = 70 + rng() * (WORLD_RADIUS - 70); // spawn in a ring away from the eye
      const baseX = Math.cos(angle) * r + (rng() - 0.5) * 30;
      const baseZ = Math.sin(angle) * r + (rng() - 0.5) * 30;
      if (nearIsland(baseX, baseZ)) continue; // don't spawn on land
      list.push({
        baseX,
        baseZ,
        radius: 6 + rng() * 10,
        speed: 0.25 + rng() * 0.4,
        phase: rng() * Math.PI * 2,
        size: 1.2 + rng() * 1.2,
        color: FISH_COLORS[list.length % FISH_COLORS.length],
        scatterVx: 0,
        scatterVz: 0,
      });
    }
    return list;
  }, []);

  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const fishTextures = useMemo(() => {
    const map: Record<string, THREE.CanvasTexture> = {};
    FISH_COLORS.forEach(c => { map[c] = createFishTexture(c); });
    return map;
  }, []);
  const wakeTexture = useMemo(() => createSplashTexture(), []);

  // Crisp pixel-art sprites
  useEffect(() => {
    [...Object.values(fishTextures), wakeTexture].forEach(t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.needsUpdate = true;
    });
  }, [fishTextures, wakeTexture]);

  // Shared opacity from storm
  const opacity = isInEye ? 0.95 : Math.max(0.5, 0.9 - storm.intensity * 0.35);

  useFrame((_, delta) => {
    if (!fishRefs.current.length) return;
    timeRef.current += delta;
    const t = timeRef.current;

    fish.forEach((f, i) => {
      const a = t * f.speed + f.phase;

      // Scatter from boat
      const dx = (f.baseX + Math.cos(a) * f.radius) - boatPosition.x;
      const dz = (f.baseZ + Math.sin(a) * f.radius) - boatPosition.z;
      const distToBoat = Math.sqrt(dx * dx + dz * dz);
      if (distToBoat < SCATTER_RADIUS) {
        const strength = (SCATTER_RADIUS - distToBoat) / SCATTER_RADIUS * 18;
        f.scatterVx += (dx / distToBoat) * strength * delta;
        f.scatterVz += (dz / distToBoat) * strength * delta;
      }
      // Decay scatter back to orbit
      f.scatterVx *= Math.pow(0.88, delta * 60);
      f.scatterVz *= Math.pow(0.88, delta * 60);

      const x = f.baseX + Math.cos(a) * f.radius + f.scatterVx;
      const z = f.baseZ + Math.sin(a) * f.radius + f.scatterVz;
      const y = Math.sin(a * 2.4 + f.phase) * 0.12;

      // Face along the CCW tangent of the orbit: forward = (-sin a, cos a)
      const heading = a + Math.PI / 2;
      _qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      // orient: flatten sprite (-X) then yaw by heading
      _q.multiplyQuaternions(_qYaw, _qPitch); // _q = qYaw * qPitch (pitch applied first)

      // Fish sprite
      const fishMesh = fishRefs.current[i];
      if (fishMesh) {
        fishMesh.position.set(x, y + 0.15, z);
        fishMesh.quaternion.copy(_q);
        fishMesh.scale.set(f.size, f.size, 1);
        (fishMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      }

      // Wake puff behind the fish (opposite of the tangent), pulsing with motion
      const speedFactor = 0.18 + Math.abs(Math.sin(a)) * 0.18;
      const pull = f.size * (0.8 + speedFactor);
      const bx = x + Math.sin(a) * pull;
      const bz = z - Math.cos(a) * pull;
      const scale = f.size * (1.1 + speedFactor);

      const wakeMesh = wakeRefs.current[i];
      if (wakeMesh) {
        wakeMesh.position.set(bx, 0.14, bz);
        wakeMesh.scale.set(scale, scale * 0.85, 1);
        wakeMesh.rotation.set(-Math.PI / 2, 0, a * 0.5); // flat + slight swirl
        (wakeMesh.material as THREE.MeshBasicMaterial).opacity = 0.18 + speedFactor * 0.25;
      }
    });
  });

  return (
    <group>
      {fish.map((f, i) => (
        <group key={`fish-${i}`}>
          {/* Fish sprite */}
          <mesh
            ref={el => { fishRefs.current[i] = el; }}
            geometry={planeGeo}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={10}
          >
            <meshBasicMaterial
              map={fishTextures[f.color]}
              transparent
              opacity={opacity}
              alphaTest={0.05}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Soft wake / splash puff */}
          <mesh
            ref={el => { wakeRefs.current[i] = el; }}
            geometry={planeGeo}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={9}
          >
            <meshBasicMaterial
              map={wakeTexture}
              transparent
              opacity={0.2}
              alphaTest={0.02}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
