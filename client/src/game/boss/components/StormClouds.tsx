import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { StormParams } from '../types';
import { useBossTexture, createCloudTexture } from '../utils/textures';

interface StormCloudsProps {
  storm: StormParams;
  isInEye: boolean;
  boatPosition: THREE.Vector3;
}

const CLOUD_COUNT = 24;

interface Cloud {
  offset: THREE.Vector3;
  speed: number;
  scale: number;
  opacity: number;
}

/**
 * Scattered storm cloud sprites that drift around the play area.
 * Follows the boat so the sky always feels busy, and thickens as
 * storm intensity rises.
 */
export default function StormClouds({ storm, isInEye, boatPosition }: StormCloudsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const cloudTex = useBossTexture('/assets/boss/cloud.png', createCloudTexture);

  const clouds = useMemo<Cloud[]>(() => {
    return Array.from({ length: CLOUD_COUNT }, () => ({
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 500,
        45 + Math.random() * 50,
        (Math.random() - 0.5) * 500,
      ),
      speed: 2 + Math.random() * 6,
      scale: 25 + Math.random() * 35,
      opacity: 0.2 + Math.random() * 0.35,
    }));
  }, []);

  const materials = useMemo(() => {
    return clouds.map(c => new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: c.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: isInEye ? '#d8e8ff' : '#5b6f8a',
    }));
  }, [clouds, cloudTex, isInEye]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta;
    const baseOpacity = isInEye ? 0.15 : Math.min(0.85, 0.25 + storm.cloudCover * 0.6);

    groupRef.current.children.forEach((child, i) => {
      const cloud = clouds[i];
      const mesh = child as THREE.Mesh;
      const mat = materials[i];
      if (!cloud || !mat) return;

      // Orbit/drift slowly around the boat
      const angle = timeRef.current * cloud.speed * 0.005 + i * 1.5;
      mesh.position.x = boatPosition.x + cloud.offset.x + Math.cos(angle) * 20;
      mesh.position.z = boatPosition.z + cloud.offset.z + Math.sin(angle) * 20;
      mesh.position.y = cloud.offset.y;

      mat.opacity = cloud.opacity * baseOpacity;
      mat.visible = mat.opacity > 0.02;

      // Face the camera (top-down, so rotation.x keeps the sprite flat)
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = angle * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh
          key={i}
          position={[cloud.offset.x, cloud.offset.y, cloud.offset.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[cloud.scale, cloud.scale, 1]}
          material={materials[i]}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
