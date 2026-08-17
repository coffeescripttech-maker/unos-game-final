import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';

interface OceanSprayProps {
  storm: StormParams;
  boatPosition: THREE.Vector3;
  boatYaw: number;
  boatSpeed: number;
}

const SPRAY_COUNT = 200;

interface Spray {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * White ocean spray / splash particles around the boat.
 * Spawns at the sides of the hull when moving, plus extra chop during
 * heavy wind so the sea feels alive.
 */
export default function OceanSpray({ storm, boatPosition, boatYaw, boatSpeed }: OceanSprayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spraysRef = useRef<Spray[]>([]);
  const meshRefs = useRef<THREE.InstancedMesh[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const dotGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e8f7ff',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  // Initialize pool
  useMemo(() => {
    spraysRef.current = Array.from({ length: SPRAY_COUNT }, () => ({
      position: new THREE.Vector3(0, -100, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: 0.5 + Math.random() * 0.6,
      size: 0.4 + Math.random() * 0.6,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const moving = boatSpeed > 0.4;
    const stormChop = storm.waveHeight * 2;
    const visible = moving || stormChop > 0.5;
    groupRef.current.visible = visible;
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), boatYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), boatYaw);

    // Spawn new spray — mostly at the sides of the hull
    const spawnRate = (moving ? 10 : 0) + stormChop * 3;
    const spawns = Math.min(SPRAY_COUNT, Math.floor(spawnRate * dt * 60));
    for (let s = 0; s < spawns; s++) {
      const dead = spraysRef.current.find(p => p.life <= 0);
      if (!dead) break;

      const side = Math.random() > 0.5 ? 1 : -1;
      const sideOffsetMag = 1.0 + Math.random() * 0.8;
      const offset = right.clone().multiplyScalar(side * sideOffsetMag);
      // position along the hull, slightly behind midship for side splash
      offset.add(forward.clone().multiplyScalar(-0.8 - Math.random() * 1.2));

      dead.position.copy(boatPosition).add(offset);
      dead.position.y = 0.12;

      // Splash outward and backward, with upward arc
      const outward = right.clone().multiplyScalar(side * (1.6 + Math.random() * 1.4 + boatSpeed * 0.18));
      const backward = forward.clone().multiplyScalar(-(0.6 + boatSpeed * 0.18));
      dead.velocity.copy(outward).add(backward);
      dead.velocity.y = 0.55 + Math.random() * 0.7;

      dead.life = dead.maxLife;
      dead.size = 0.5 + Math.random() * 0.7 + boatSpeed * 0.06;
    }

    // Update spray physics
    let idx = 0;
    spraysRef.current.forEach(spray => {
      if (spray.life > 0) {
        spray.life -= dt;
        spray.velocity.y -= dt * 2.0; // gravity
        spray.position.add(spray.velocity.clone().multiplyScalar(dt * 3));
        // drift with wind
        spray.position.x += storm.windSpeed * 0.04 * dt;
      } else {
        spray.position.set(0, -100, 0);
      }

      const mesh = meshRefs.current[0];
      if (mesh) {
        dummy.position.copy(spray.position);
        dummy.rotation.x = -Math.PI / 2;
        const lifeRatio = Math.max(0, spray.life / spray.maxLife);
        const scale = spray.size * lifeRatio;
        dummy.scale.set(scale, scale, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      }
      idx++;
    });

    const mesh = meshRefs.current[0];
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <instancedMesh
        ref={(el) => {
          if (!el) return;
          meshRefs.current[0] = el;
        }}
        args={[dotGeo, dotMat, SPRAY_COUNT]}
      />
    </group>
  );
}
