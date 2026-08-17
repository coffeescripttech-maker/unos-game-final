import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface BoatWakeProps {
  boatPosition: THREE.Vector3;
  boatYaw: number;
  boatSpeed: number;
  visible: boolean;
}

const FOAM_COUNT = 40;
const SMOKE_COUNT = 24;

interface WakeParticle {
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  drift: THREE.Vector3;
}

/**
 * Boat wake made of soft foam particles + engine smoke puffs.
 * Replaces the plain white rectangle with a more natural trailing effect.
 */
export default function BoatWake({ boatPosition, boatYaw, boatSpeed, visible }: BoatWakeProps) {
  const foamGroupRef = useRef<THREE.Group>(null);
  const smokeGroupRef = useRef<THREE.Group>(null);
  const foamParticlesRef = useRef<WakeParticle[]>([]);
  const smokeParticlesRef = useRef<WakeParticle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const foamGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const foamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const smokeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#c0c8d0',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  // Initialize particle pools
  useMemo(() => {
    foamParticlesRef.current = Array.from({ length: FOAM_COUNT }, () => ({
      position: new THREE.Vector3(0, -100, 0),
      life: 0,
      maxLife: 1 + Math.random(),
      size: 0.3 + Math.random() * 0.5,
      drift: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5),
    }));
    smokeParticlesRef.current = Array.from({ length: SMOKE_COUNT }, () => ({
      position: new THREE.Vector3(0, -100, 0),
      life: 0,
      maxLife: 0.8 + Math.random() * 0.7,
      size: 0.2 + Math.random() * 0.3,
      drift: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3),
    }));
  }, []);

  useFrame((_, delta) => {
    if (!foamGroupRef.current || !smokeGroupRef.current) return;

    const moving = visible && boatSpeed > 0.3;
    foamGroupRef.current.visible = moving;
    smokeGroupRef.current.visible = moving;
    if (!moving) return;

    const foamInst = foamGroupRef.current.children[0] as THREE.InstancedMesh;
    const smokeInst = smokeGroupRef.current.children[0] as THREE.InstancedMesh;

    const dt = Math.min(delta, 0.05);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), boatYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), boatYaw);
    const back = forward.clone().negate();

    const speedFactor = Math.min(1, boatSpeed / 12);

    // Spawn foam behind the boat
    const foamSpawnRate = 1 + speedFactor * 4;
    const foamSpawns = Math.floor(foamSpawnRate * dt * 60);
    for (let s = 0; s < foamSpawns; s++) {
      const dead = foamParticlesRef.current.find(p => p.life <= 0);
      if (!dead) break;

      const sideOffset = right.clone().multiplyScalar((Math.random() - 0.5) * 2.2);
      const backOffset = back.clone().multiplyScalar(1.2 + Math.random() * 0.8);
      dead.position.copy(boatPosition).add(sideOffset).add(backOffset);
      dead.position.y = 0.08;
      dead.life = dead.maxLife;
      dead.size = 0.35 + Math.random() * 0.6 + speedFactor * 0.4;
      dead.drift.set(
        back.x * (0.5 + speedFactor) + (Math.random() - 0.5) * 0.3,
        0,
        back.z * (0.5 + speedFactor) + (Math.random() - 0.5) * 0.3,
      );
    }

    // Spawn engine smoke from the stern
    const smokeSpawns = Math.floor((0.8 + speedFactor * 2) * dt * 60);
    for (let s = 0; s < smokeSpawns; s++) {
      const dead = smokeParticlesRef.current.find(p => p.life <= 0);
      if (!dead) break;

      dead.position.copy(boatPosition).add(back.clone().multiplyScalar(1.6));
      dead.position.y = 0.3 + Math.random() * 0.2;
      dead.life = dead.maxLife;
      dead.size = 0.25 + Math.random() * 0.35;
      dead.drift.set(
        back.x * (0.3 + speedFactor * 0.5) + (Math.random() - 0.5) * 0.2,
        0.2 + Math.random() * 0.2,
        back.z * (0.3 + speedFactor * 0.5) + (Math.random() - 0.5) * 0.2,
      );
    }

    // Update foam instances
    foamParticlesRef.current.forEach((p, idx) => {
      if (p.life > 0) {
        p.life -= dt;
        p.position.add(p.drift.clone().multiplyScalar(dt * 3));
        p.position.x += (Math.random() - 0.5) * 0.02;
        p.position.z += (Math.random() - 0.5) * 0.02;
      } else {
        p.position.set(0, -100, 0);
      }

      dummy.position.copy(p.position);
      dummy.rotation.x = -Math.PI / 2;
      const scale = p.size * Math.max(0, p.life / p.maxLife);
      dummy.scale.set(scale, scale, 1);
      dummy.updateMatrix();
      foamInst.setMatrixAt(idx, dummy.matrix);
    });

    // Update smoke instances
    smokeParticlesRef.current.forEach((p, idx) => {
      if (p.life > 0) {
        p.life -= dt;
        p.position.add(p.drift.clone().multiplyScalar(dt * 2));
        p.size += dt * 0.2; // expand as it dissipates
      } else {
        p.position.set(0, -100, 0);
      }

      dummy.position.copy(p.position);
      dummy.rotation.x = -Math.PI / 2;
      const alpha = Math.max(0, p.life / p.maxLife);
      const scale = p.size * (0.6 + alpha * 0.8);
      dummy.scale.set(scale, scale, 1);
      dummy.updateMatrix();
      smokeInst.setMatrixAt(idx, dummy.matrix);
    });

    foamInst.instanceMatrix.needsUpdate = true;
    smokeInst.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <group ref={foamGroupRef} visible={false}>
        <instancedMesh args={[foamGeo, foamMat, FOAM_COUNT]} />
      </group>
      <group ref={smokeGroupRef} visible={false}>
        <instancedMesh args={[smokeGeo, smokeMat, SMOKE_COUNT]} />
      </group>
    </>
  );
}
