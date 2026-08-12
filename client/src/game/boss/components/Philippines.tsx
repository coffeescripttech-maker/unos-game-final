import { useMemo } from 'react';
import * as THREE from 'three';

interface Island {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  name: string;
}

/**
 * Stylized low-poly Philippine archipelago in the distance.
 * Shows Luzon, Visayas, Mindanao with lush forests and mountains.
 */
export default function Philippines() {
  const islands: Island[] = useMemo(
    () => [
      // Luzon (large, north)
      { position: [-40, 0, -340], scale: [35, 6, 50], color: '#2d8a4e', name: 'Luzon' },
      { position: [-38, 2, -330], scale: [20, 4, 25], color: '#3a9a5e', name: 'Luzon-Highlands' },
      { position: [-55, 1, -350], scale: [8, 3, 12], color: '#4aaa6e', name: 'Luzon-West' },
      // Mountain ranges (Cordillera)
      { position: [-30, 4, -345], scale: [6, 5, 10], color: '#5a7a3a', name: 'Cordillera' },
      { position: [-25, 3, -340], scale: [5, 4, 8], color: '#5a7a3a', name: 'Sierra-Madre' },
      // Visayas (central)
      { position: [15, -1, -300], scale: [12, 4, 20], color: '#3a9a5e', name: 'Visayas' },
      { position: [5, -1, -285], scale: [8, 3, 12], color: '#4aaa6e', name: 'Cebu' },
      { position: [20, 0, -290], scale: [10, 3, 15], color: '#3a9a5e', name: 'Leyte-Samar' },
      { position: [-5, 0, -295], scale: [6, 3, 10], color: '#4aaa6e', name: 'Panay' },
      // Mindanao (south, large)
      { position: [25, 1, -250], scale: [30, 5, 40], color: '#2d8a4e', name: 'Mindanao' },
      { position: [30, 3, -240], scale: [18, 4, 22], color: '#3a9a5e', name: 'Mindanao-Highlands' },
      { position: [15, 2, -260], scale: [10, 3, 15], color: '#4aaa6e', name: 'Mindanao-West' },
      // Small islands (Palawan, etc.)
      { position: [-60, 0, -310], scale: [4, 2, 18], color: '#4aaa6e', name: 'Palawan' },
      { position: [-35, 0, -310], scale: [3, 2, 8], color: '#5aba7e', name: 'Mindoro' },
      { position: [40, 0, -270], scale: [5, 2, 8], color: '#5aba7e', name: 'Surigao' },
    ],
    [],
  );

  // One shared geometry for all islands
  const hillGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);

  return (
    <group position={[0, 0, 0]}>
      {islands.map((island, i) => (
        <group key={i} position={island.position as unknown as THREE.Vector3}>
          {/* Main island body */}
          <mesh
            scale={island.scale as unknown as THREE.Vector3}
            geometry={hillGeo}
          >
            <meshLambertMaterial
              color={island.color}
              flatShading
            />
          </mesh>
          {/* Beach ring */}
          <mesh
            scale={[
              island.scale[0] * 1.05,
              0.3,
              island.scale[2] * 1.05,
            ]}
            position={[0, -2, 0]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshLambertMaterial color="#e8d5a3" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}
