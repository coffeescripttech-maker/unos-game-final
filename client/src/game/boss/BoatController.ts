import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { BoatState, StormParams, WindGustData } from './types';
import { ISLANDS } from './components/Philippines';

interface BoatControllerProps {
  boatRef: React.MutableRefObject<THREE.Group | null>;
  storm: StormParams;
  isInEye: boolean;
  onBoatMove?: (state: BoatState) => void;
  onDeployBuoy?: () => void;
  onInteract?: () => void;
  /** When true, the boat ignores input and drifts to a standstill (e.g. during a quiz) */
  disabled?: boolean;
}

// Top-down arcade boat constants
const ENGINE_POWER = 12;
const ENGINE_RESPONSE = 2.5;
const MAX_SPEED = 18;
const MAX_REVERSE = 6;
const WATER_RESISTANCE = 0.96;
const TURN_RATE = 1.6;
const GUST_INTERVAL = 4;
const GUST_DURATION = 2.0;
const GUST_STRENGTH = 10;

const EYE_POSITION = new THREE.Vector3(0, 0, -150);
const WORLD_BOUNDARY = 380;
const IS_DEV = (import.meta as any).env?.DEV === true;

/**
 * Top-down boat controller.
 * WASD/Arrows steer the vessel; camera locks directly above the boat.
 * No pitch/roll so the 2D look stays clean.
 */
export function useBoatController({
  boatRef,
  storm,
  isInEye,
  onBoatMove,
  onDeployBuoy,
  onInteract,
  disabled = false,
}: BoatControllerProps) {
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(0);
  const yawRef = useRef(0);
  const boostRef = useRef(false);
  const deployCooldownRef = useRef(0);
  const gustsRef = useRef<WindGustData[]>([]);
  const gustTimerRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const frameLogRef = useRef(0);

  const { camera } = useThree();
  const onDeployBuoyRef = useRef(onDeployBuoy);
  const onInteractRef = useRef(onInteract);
  onDeployBuoyRef.current = onDeployBuoy;
  onInteractRef.current = onInteract;

  // Keep the orthographic camera pointing straight down
  useEffect(() => {
    camera.up.set(0, 0, -1);
  }, [camera]);

  // Key handlers — accept both e.code and e.key for wider keyboard layouts
  useEffect(() => {
    const isMoveKey = (code: string, key: string) =>
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code) ||
      ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;
      if (isMoveKey(code, key)) e.preventDefault();

      keysRef.current.add(code);
      if (['KeyW', 'ArrowUp'].includes(code) || ['w', 'W', 'ArrowUp'].includes(key)) keysRef.current.add('KeyW');
      if (['KeyS', 'ArrowDown'].includes(code) || ['s', 'S', 'ArrowDown'].includes(key)) keysRef.current.add('KeyS');
      if (['KeyA', 'ArrowLeft'].includes(code) || ['a', 'A', 'ArrowLeft'].includes(key)) keysRef.current.add('KeyA');
      if (['KeyD', 'ArrowRight'].includes(code) || ['d', 'D', 'ArrowRight'].includes(key)) keysRef.current.add('KeyD');

      if (code === 'Space' || key === ' ') onDeployBuoyRef.current?.();
      if (code === 'KeyE' || key === 'e' || key === 'E') onInteractRef.current?.();

      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.log('[BoatController] keydown', { code, key, active: Array.from(keysRef.current), velocity: velocityRef.current });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;
      keysRef.current.delete(code);
      if (['KeyW', 'ArrowUp'].includes(code) || ['w', 'W', 'ArrowUp'].includes(key)) keysRef.current.delete('KeyW');
      if (['KeyS', 'ArrowDown'].includes(code) || ['s', 'S', 'ArrowDown'].includes(key)) keysRef.current.delete('KeyS');
      if (['KeyA', 'ArrowLeft'].includes(code) || ['a', 'A', 'ArrowLeft'].includes(key)) keysRef.current.delete('KeyA');
      if (['KeyD', 'ArrowRight'].includes(code) || ['d', 'D', 'ArrowRight'].includes(key)) keysRef.current.delete('KeyD');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch steering — only for touches that start on the game/play area, not on
  // HUD buttons, modals, or the virtual joystick (those manage their own input).
  // Ignoring UI touches also stops preventDefault() from killing tap/click on
  // buttons like the intro DEPLOY button on phones.
  const isUiTouchTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest(
      'button, a, input, [data-ui], [data-joystick], .boss-hud, .modal-card, .boss-overlay, .virtual-joystick'
    );

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (isUiTouchTarget(e.target)) return;
      e.preventDefault();
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      touchCurrentRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      touchCurrentRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = () => {
      touchStartRef.current = null;
      touchCurrentRef.current = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const getBoatState = useCallback((): BoatState => {
    if (!boatRef.current) {
      return { position: new THREE.Vector3(0, 0, 120), rotation: 0, speed: 0, engineOn: true, integrity: 100, boosting: false };
    }
    return {
      position: boatRef.current.position.clone(),
      rotation: yawRef.current,
      speed: velocityRef.current,
      engineOn: velocityRef.current > 0.5,
      integrity: 100,
      boosting: boostRef.current,
    };
  }, [boatRef]);

  const spawnGust = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    gustsRef.current.push({
      direction: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
      strength: GUST_STRENGTH * (0.5 + Math.random() * 0.5),
      duration: GUST_DURATION * (0.5 + Math.random() * 0.5),
      elapsed: 0,
    });
  }, []);

  const getStormForce = useCallback(() => {
    if (!boatRef.current) return new THREE.Vector3(0, 0, 0);
    const pos = boatRef.current.position;
    const dirToEye = new THREE.Vector3().copy(EYE_POSITION).sub(pos).normalize();
    const strength = storm.windSpeed * 0.25 * (1 - (storm.landProximity ?? 0) * 0.4);
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
    // Quiz / cutscene lock: freeze the boat in place
    if (disabled) {
      velocityRef.current = 0;
      return;
    }

    const keys = keysRef.current;
    const boat = boatRef.current;
    const dt = Math.min(delta, 0.05);

    // DEV: confirm the loop is running and which keys are held
    frameLogRef.current++;
    if (IS_DEV && keys.size > 0 && frameLogRef.current % 20 === 0) {
      // eslint-disable-next-line no-console
      console.log('[BoatController] frame', { keys: Array.from(keys), velocity: velocityRef.current.toFixed(2), pos: boat.position.x.toFixed(1) + ',' + boat.position.z.toFixed(1) });
    }

    // ── TOUCH / JOYSTICK INPUT ──
    let touchSteer = 0;
    let touchThrottle = 0;
    if (touchStartRef.current && touchCurrentRef.current) {
      const dx = touchCurrentRef.current.x - touchStartRef.current.x;
      const dy = touchCurrentRef.current.y - touchStartRef.current.y;
      const maxDrag = 80;
      touchSteer = THREE.MathUtils.clamp(dx / maxDrag, -1, 1);
      touchThrottle = THREE.MathUtils.clamp(-dy / maxDrag, -1, 1);
    } else if (joystickRef.current.x !== 0 || joystickRef.current.y !== 0) {
      touchSteer = THREE.MathUtils.clamp(joystickRef.current.x, -1, 1);
      touchThrottle = THREE.MathUtils.clamp(joystickRef.current.y, -1, 1);
    }

    // ── THROTTLE ──
    let targetSpeed = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) targetSpeed = MAX_SPEED;
    else if (keys.has('KeyS') || keys.has('ArrowDown')) targetSpeed = -MAX_REVERSE;
    else if (touchThrottle !== 0) {
      targetSpeed = touchThrottle > 0
        ? touchThrottle * MAX_SPEED
        : touchThrottle * MAX_REVERSE;
    }

    boostRef.current = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const boost = boostRef.current ? 1.6 : 1;

    const speedDiff = targetSpeed * boost - velocityRef.current;
    velocityRef.current += speedDiff * ENGINE_RESPONSE * dt;
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
    if (touchSteer !== 0) {
      yawRef.current -= touchSteer * turnSpeed * dt;
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
    // Forward matches the boat sprite's bow, which points toward -Z when yaw is 0.
    const forward = new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);

    boat.position.x += forward.x * velocityRef.current * dt;
    boat.position.z += forward.z * velocityRef.current * dt;

    // ── WORLD BOUNDARY ──
    const distFromOrigin = Math.sqrt(boat.position.x ** 2 + boat.position.z ** 2);
    if (distFromOrigin > WORLD_BOUNDARY) {
      const clamp = WORLD_BOUNDARY / distFromOrigin;
      boat.position.x *= clamp;
      boat.position.z *= clamp;
      velocityRef.current *= 0.3;
    }

    // ── ISLAND COLLISION ──
    // Treat each island sprite as a circle and slide the boat off its edge.
    const BOAT_RADIUS = 3;
    for (const island of ISLANDS) {
      const ix = island.position[0];
      const iz = island.position[2];
      const dx = boat.position.x - ix;
      const dz = boat.position.z - iz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const islandRadius = island.scale * 0.35 + BOAT_RADIUS;
      if (dist < islandRadius && dist > 0.01) {
        const push = (islandRadius - dist) / dist;
        boat.position.x += dx * push;
        boat.position.z += dz * push;
        velocityRef.current *= 0.7;
      }
    }

    // ── GENTLE BOB ──
    const wavePhase = Date.now() * 0.001;
    const bob = Math.sin(wavePhase * 0.8 + boat.position.x * 0.02 + boat.position.z * 0.02) * 0.08;
    boat.position.y = bob;

    // ── CAMERA SHAKE (storm intensity) ──
    let shakeX = 0;
    let shakeZ = 0;
    if (!isInEye && storm.intensity > 0.35) {
      const shakeAmt = (storm.intensity - 0.35) * 0.6 + (storm.windSpeed / 80) * 0.3;
      const shakeTime = Date.now() * 0.02;
      shakeX = Math.sin(shakeTime) * shakeAmt;
      shakeZ = Math.cos(shakeTime * 1.3) * shakeAmt;
    }

    // ── TOP-DOWN CAMERA FOLLOW ──
    // Lock the orthographic camera straight above the boat.
    camera.up.set(0, 0, -1);
    camera.position.set(boat.position.x + shakeX, 80, boat.position.z + shakeZ);
    camera.lookAt(boat.position.x + shakeX, 0, boat.position.z + shakeZ);
    camera.updateMatrixWorld();

    // Only yaw rotation for the 2D sprite look
    boat.rotation.y = yawRef.current;

    if (onBoatMove) onBoatMove(getBoatState());

    if (deployCooldownRef.current > 0) deployCooldownRef.current -= dt;
  });

  const setJoystickAxes = useCallback((x: number, y: number) => {
    joystickRef.current = { x, y };
  }, []);

  return {
    getBoatState,
    velocity: velocityRef,
    yaw: yawRef,
    setJoystickAxes,
  };
}

export { EYE_POSITION };
