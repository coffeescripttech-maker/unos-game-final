import { useRef, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { BoatState, StormParams, WindGustData } from './types';

interface BoatControllerProps {
  boatRef: React.MutableRefObject<THREE.Group | null>;
  storm: StormParams;
  isInEye: boolean;
  onBoatMove?: (state: BoatState) => void;
  onDeployBuoy?: () => void;
  onInteract?: () => void;
}

// Realistic boat physics constants
const ENGINE_POWER = 12;
const ENGINE_RESPONSE = 2.5;     // how fast engine responds to throttle
const MAX_SPEED = 18;
const MAX_REVERSE = 6;
const WATER_RESISTANCE = 0.96;   // drag (lower = more drag)
const HULL_INERTIA = 0.3;        // rotational inertia
const TURN_RATE = 1.2;           // base turn rate
const WAVE_TILT_RESPONSE = 0.15; // how much waves tilt the hull
const GUST_INTERVAL = 4;
const GUST_DURATION = 2.0;
const GUST_STRENGTH = 10;

const EYE_POSITION = new THREE.Vector3(0, 0, -150);
const WORLD_BOUNDARY = 380;

/**
 * Realistic boat controller with inertia, hull dynamics, wave response, and wind gusts.
 */
export function useBoatController({
  boatRef,
  storm,
  isInEye,
  onBoatMove,
  onDeployBuoy,
  onInteract,
}: BoatControllerProps) {
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);
  const boostRef = useRef(false);
  const deployCooldownRef = useRef(0);
  const gustsRef = useRef<WindGustData[]>([]);
  const gustTimerRef = useRef(0);
  const [boatYaw, setBoatYaw] = useState(0);

  const { camera } = useThree();
  const cameraOrbitRef = useRef({ theta: 0, phi: Math.PI / 5, distance: 22 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);
  const cameraSmoothRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleDown = () => { isPointerDownRef.current = true; };
    const handleUp = () => { isPointerDownRef.current = false; };
    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  // Key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === 'Space' && onDeployBuoy) onDeployBuoy();
      if (e.code === 'KeyE' && onInteract) onInteract();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onDeployBuoy, onInteract]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerDownRef.current) {
        mouseRef.current.x += e.movementX * 0.003;
        mouseRef.current.y += e.movementY * 0.003;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const requestPointerLock = useCallback(() => {
    document.body.requestPointerLock();
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      isPointerDownRef.current = document.pointerLockElement !== null;
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const getBoatState = useCallback((): BoatState => {
    if (!boatRef.current) {
      return { position: new THREE.Vector3(0, 0, 120), rotation: 0, speed: 0, engineOn: true, integrity: 100 };
    }
    return {
      position: boatRef.current.position.clone(),
      rotation: yawRef.current,
      speed: velocityRef.current,
      engineOn: velocityRef.current > 0.5,
      integrity: 100,
    };
  }, [boatRef]);

  // Wind gusts
  const spawnGust = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    gustsRef.current.push({
      direction: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
      strength: GUST_STRENGTH * (0.5 + Math.random() * 0.5),
      duration: GUST_DURATION * (0.5 + Math.random() * 0.5),
      elapsed: 0,
    });
  }, []);

  // Storm drift
  const getStormForce = useCallback(() => {
    if (!boatRef.current) return new THREE.Vector3(0, 0, 0);
    const pos = boatRef.current.position;
    const dirToEye = new THREE.Vector3().copy(EYE_POSITION).sub(pos).normalize();
    const strength = storm.windSpeed * 0.25;
    const angle = Math.atan2(dirToEye.x, dirToEye.z);
    const spiralAngle = angle + Math.PI / 4;
    return new THREE.Vector3(
      Math.sin(spiralAngle) * strength,
      0,
      Math.cos(spiralAngle) * strength,
    );
  }, [storm.windSpeed]);

  useFrame((_, delta) => {
    if (!boatRef.current) return;

    const keys = keysRef.current;
    const boat = boatRef.current;
    const dt = Math.min(delta, 0.05); // cap delta for physics stability

    // ── THROTTLE ──
    let targetSpeed = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) targetSpeed = MAX_SPEED;
    else if (keys.has('KeyS') || keys.has('ArrowDown')) targetSpeed = -MAX_REVERSE;

    boostRef.current = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const boost = boostRef.current ? 1.6 : 1;

    // Smooth throttle response (inertia)
    const speedDiff = targetSpeed * boost - velocityRef.current;
    velocityRef.current += speedDiff * ENGINE_RESPONSE * dt;

    // Water resistance (drag)
    velocityRef.current *= Math.pow(WATER_RESISTANCE, dt * 60);

    if (Math.abs(velocityRef.current) < 0.01) velocityRef.current = 0;

    // ── STEERING ──
    const speedFactor = Math.abs(velocityRef.current) / MAX_SPEED;
    const turnSpeed = TURN_RATE * (0.3 + speedFactor * 0.7);

    if (keys.has('KeyA') || keys.has('ArrowLeft')) {
      yawRef.current += turnSpeed * dt * (velocityRef.current >= 0 ? 1 : -0.4);
    }
    if (keys.has('KeyD') || keys.has('ArrowRight')) {
      yawRef.current -= turnSpeed * dt * (velocityRef.current >= 0 ? 1 : -0.4);
    }

    // ── STORM FORCES ──
    if (!isInEye && storm.intensity > 0.2) {
      const stormForce = getStormForce();
      boat.position.x += stormForce.x * dt;
      boat.position.z += stormForce.z * dt;
    }

    // Wind gusts
    if (!isInEye && storm.intensity > 0.4) {
      gustTimerRef.current += dt;
      if (gustTimerRef.current > GUST_INTERVAL / (0.5 + storm.intensity * 0.5)) {
        gustTimerRef.current = 0;
        if (gustsRef.current.length < 3) spawnGust();
      }
    }

    for (let i = gustsRef.current.length - 1; i >= 0; i--) {
      const g = gustsRef.current[i];
      g.elapsed += dt;
      const gStrength = g.strength * (1 - g.elapsed / g.duration) * dt;
      boat.position.x += g.direction.x * gStrength;
      boat.position.z += g.direction.z * gStrength;
      if (g.elapsed >= g.duration) gustsRef.current.splice(i, 1);
    }

    // ── APPLY VELOCITY ──
    const forward = new THREE.Vector3(0, 0, 1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);

    boat.position.x += forward.x * velocityRef.current * dt;
    boat.position.z += forward.z * velocityRef.current * dt;

    // ── WAVE RESPONSE (realistic hull pitch/roll) ──
    const wavePhase = Date.now() * 0.001;
    const waveH = storm.waveHeight * 0.8 + (isInEye ? 0 : 0.3);

    // Multiple wave influences for natural motion
    const wave1 = Math.sin(wavePhase * 0.4 + boat.position.x * 0.015 + boat.position.z * 0.02);
    const wave2 = Math.sin(wavePhase * 0.6 - boat.position.x * 0.025 + boat.position.z * 0.015);
    const wave3 = Math.sin(wavePhase * 0.8 + boat.position.x * 0.03 - boat.position.z * 0.025);

    // Hull follows the wave slope
    const slopeX = (wave2 - wave1) * 0.5;
    const slopeZ = (wave3 - wave2) * 0.5;

    pitchRef.current = slopeX * waveH * WAVE_TILT_RESPONSE;
    rollRef.current = slopeZ * waveH * WAVE_TILT_RESPONSE * 0.7;

    // Speed-induced bow rise
    const bowRise = velocityRef.current * 0.002;
    pitchRef.current -= bowRise;

    // Gust-induced heel (lean into wind)
    if (gustsRef.current.length > 0) {
      const totalGust = gustsRef.current.reduce((sum, g) => {
        const str = g.strength * (1 - g.elapsed / g.duration);
        return sum + str;
      }, 0);
      rollRef.current += totalGust * 0.003;
    }

    // Apply rotation
    boat.rotation.x = pitchRef.current;
    boat.rotation.z = rollRef.current;
    boat.rotation.y = yawRef.current;

    // ── WORLD BOUNDARY ──
    const distFromOrigin = Math.sqrt(boat.position.x ** 2 + boat.position.z ** 2);
    if (distFromOrigin > WORLD_BOUNDARY) {
      const clamp = WORLD_BOUNDARY / distFromOrigin;
      boat.position.x *= clamp;
      boat.position.z *= clamp;
      velocityRef.current *= 0.3;
    }

    // ── WATER LEVEL BOBBING ──
    const bob = (wave1 * 0.12 + wave2 * 0.08) * (1 + storm.waveHeight * 0.5);
    boat.position.y = bob;

    // ── THIRD-PERSON CAMERA ──
    const cam = cameraOrbitRef.current;
    if (isPointerDownRef.current) {
      cam.theta += mouseRef.current.x * 0.5;
      cam.phi = Math.max(0.1, Math.min(Math.PI / 2.2, cam.phi - mouseRef.current.y * 0.5));
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    }

    // Auto-follow when not interacting
    if (!isPointerDownRef.current) {
      const targetTheta = yawRef.current + Math.PI;
      let diff = targetTheta - cam.theta;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cam.theta += diff * 0.015;
    }

    // Camera distance responds to speed
    const targetDist = 22 + Math.abs(velocityRef.current) * 0.3;
    cam.distance += (targetDist - cam.distance) * 0.02;

    // Compute camera world position
    const camX = Math.sin(cam.theta) * Math.cos(cam.phi) * cam.distance;
    const camY = Math.sin(cam.phi) * cam.distance;
    const camZ = Math.cos(cam.theta) * Math.cos(cam.phi) * cam.distance;

    // Camera shake from gusts and waves
    const gustShake = gustsRef.current.length > 0 ? 0.08 : 0;
    const waveShake = waveH * 0.02;
    const shake = gustShake + waveShake;

    const targetCamPos = new THREE.Vector3(
      boat.position.x + camX + (Math.random() - 0.5) * shake,
      boat.position.y + camY + 2 + (Math.random() - 0.5) * shake * 0.5,
      boat.position.z + camZ + (Math.random() - 0.5) * shake,
    );

    // Smooth camera follow
    if (cameraSmoothRef.current.length() === 0) {
      cameraSmoothRef.current.copy(targetCamPos);
    }
    cameraSmoothRef.current.lerp(targetCamPos, 0.06);
    camera.position.copy(cameraSmoothRef.current);

    camera.lookAt(boat.position.x, boat.position.y + 1, boat.position.z);

    // Expose yaw
    setBoatYaw(yawRef.current);

    // Callback
    if (onBoatMove) onBoatMove(getBoatState());

    if (deployCooldownRef.current > 0) deployCooldownRef.current -= dt;
  });

  return {
    getBoatState,
    requestPointerLock,
    velocity: velocityRef,
    yaw: yawRef,
    boatYaw,
  };
}

export { EYE_POSITION };
