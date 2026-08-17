import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { createIslandTexture, useBossTexture } from '../utils/textures';

export interface IslandDef {
  position: [number, number, number];
  scale: number;
  rotation: number;
  name: string;
}

/**
 * Shared island layout used by the renderer and the boat controller.
 *
 * Scattered across the storm-tossed northern ocean rather than clumped in one
 * cluster: a recognisable Philippines shape (Luzon, Visayas, Mindanao) with the
 * major landmasses spread east–west and a few small islets peppered in between
 * so the map reads as a real, spread-out archipelago.
 */
export const ISLANDS: IslandDef[] = [
  // Luzon (large, far north-west)
  { position: [-90, 0.2, -280], scale: 26, rotation: 0.1, name: 'Luzon' },
  { position: [-62, 0.2, -270], scale: 16, rotation: -0.3, name: 'Luzon-Highlands' },
  { position: [-115, 0.2, -268], scale: 10, rotation: 0.5, name: 'Luzon-West' },
  { position: [-55, 0.2, -245], scale: 7, rotation: 0.2, name: 'Zambales' },
  // Cordillera & Sierra Madre (scattered)
  { position: [-78, 0.2, -225], scale: 8, rotation: -0.2, name: 'Cordillera' },
  { position: [-42, 0.2, -252], scale: 7.5, rotation: 0.4, name: 'Sierra-Madre' },
  // Visayas (centre-north, spread east-west)
  { position: [18, 0.2, -235], scale: 13, rotation: -0.4, name: 'Negros' },
  { position: [8, 0.2, -222], scale: 8, rotation: 0.2, name: 'Cebu' },
  { position: [44, 0.2, -230], scale: 11, rotation: -0.1, name: 'Leyte-Samar' },
  { position: [-6, 0.2, -240], scale: 7.5, rotation: 0.6, name: 'Panay' },
  { position: [22, 0.2, -255], scale: 6, rotation: 0.35, name: 'Bohol' },
  // Mindanao (south-east quadrant)
  { position: [40, 0.2, -178], scale: 22, rotation: 0.15, name: 'Mindanao' },
  { position: [62, 0.2, -185], scale: 14, rotation: -0.25, name: 'Mindanao-Highlands' },
  { position: [28, 0.2, -165], scale: 9, rotation: 0.35, name: 'Mindanao-West' },
  { position: [80, 0.2, -192], scale: 7, rotation: -0.4, name: 'Davao-Gulf' },
  // Small scattered islets
  { position: [-125, 0.2, -235], scale: 6.5, rotation: -0.5, name: 'Palawan' },
  { position: [-88, 0.2, -210], scale: 5.5, rotation: 0.45, name: 'Mindoro' },
  { position: [100, 0.2, -175], scale: 6, rotation: -0.15, name: 'Surigao' },
  { position: [60, 0.2, -255], scale: 5, rotation: 0.55, name: 'Catanduanes' },
];

/**
 * Philippine archipelago rendered as top-down island sprites.
 * Uses /assets/boss/island.png when available, falling back to a generated
 * canvas texture. Each island is rotated so the repeated sprite stays varied.
 */
export default function Philippines() {
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const islandTexture = useBossTexture('/assets/boss/island.png', createIslandTexture);

  // Keep the texture crisp for pixel-art style assets
  useEffect(() => {
    islandTexture.magFilter = THREE.NearestFilter;
    islandTexture.minFilter = THREE.NearestFilter;
    islandTexture.needsUpdate = true;
  }, [islandTexture]);

  return (
    <group position={[0, 0, 0]}>
      {ISLANDS.map((island, i) => (
        <mesh
          key={i}
          position={island.position as unknown as THREE.Vector3}
          rotation={[-Math.PI / 2, 0, island.rotation]}
          scale={[island.scale, island.scale, island.scale]}
          geometry={planeGeo}
          renderOrder={1}
        >
          <meshBasicMaterial
            map={islandTexture}
            transparent
            alphaTest={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
