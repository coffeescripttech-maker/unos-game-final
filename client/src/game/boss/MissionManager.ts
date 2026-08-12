import * as THREE from 'three';
import type { MissionState, MissionObjective, ObjectiveId, StormParams, GamePhase } from './types';

export const EYE_POSITION = new THREE.Vector3(0, 0, -150);
export const EYE_RADIUS = 30;

/** Default state for a fresh mission */
export function createDefaultMissionState(): MissionState {
  return {
    status: 'intro',
    phase: 1,
    boatIntegrity: 100,
    maxIntegrity: 100,
    collectedData: [],
    currentObjective: 'collect_temperature',
    nearCollectible: null,
    interactionPrompt: null,
    lastNotification: null,
    objectives: [
      { id: 'collect_temperature', label: 'Temperature Data', description: 'Collect ocean temperature readings from the sensor buoy', completed: false },
      { id: 'collect_humidity', label: 'Humidity Data', description: 'Collect atmospheric humidity readings', completed: false },
      { id: 'collect_pressure', label: 'Pressure Data', description: 'Collect barometric pressure readings', completed: false },
      { id: 'collect_windspeed', label: 'Wind Speed', description: 'Measure wind speed near the storm', completed: false },
      { id: 'deploy_buoy', label: 'Deploy Weather Buoy', description: 'Deploy a weather buoy to track the storm', completed: false },
      { id: 'reach_eye', label: 'Enter the Eye', description: 'Navigate into the calm center of the typhoon', completed: false },
      { id: 'complete', label: 'Mission Complete', description: 'All objectives completed', completed: false },
    ],
    distanceToEye: 200,
    isInEye: false,
  };
}

/** Determine game phase based on collected data */
export function getPhase(collected: ObjectiveId[], isInEye: boolean): GamePhase {
  if (isInEye) return 5;
  if (collected.includes('deploy_buoy')) return 4;
  if (collected.includes('collect_windspeed')) return 3;
  if (collected.length >= 1) return 2;
  return 1;
}

/** Compute storm intensity based on distance to eye + phase */
export function computeStormParams(distanceToEye: number, phase: GamePhase): StormParams {
  const maxDist = 250;
  const distT = Math.max(0, Math.min(1, 1 - distanceToEye / maxDist));

  // Phase 1 = calm, Phase 4 = most intense outside eye
  let phaseMultiplier: number;
  switch (phase) {
    case 1: phaseMultiplier = 0.1; break;  // Calm
    case 2: phaseMultiplier = 0.3; break;  // Light storm
    case 3: phaseMultiplier = 0.6; break;  // Building
    case 4: phaseMultiplier = Math.max(distT, 0.5); break; // Intense
    case 5: phaseMultiplier = 0; break;    // Calm in eye
    default: phaseMultiplier = distT;
  }

  const t = distT * phaseMultiplier;
  return {
    intensity: t,
    windSpeed: t * 80,
    rainIntensity: Math.max(0, (t - 0.1) * 1.2),
    lightningRate: phase === 4 ? Math.max(0, (t - 0.3) * 0.8) : 0,
    cloudCover: 0.2 + t * 0.8,
    waveHeight: 0.3 + t * 3.5,
  };
}

/** Determine the next objective based on collected data */
export function getNextObjective(collected: ObjectiveId[]): MissionState['currentObjective'] {
  const order: ObjectiveId[] = [
    'collect_temperature',
    'collect_humidity',
    'collect_pressure',
    'collect_windspeed',
    'deploy_buoy',
    'reach_eye',
    'complete',
  ];
  for (const id of order) {
    if (!collected.includes(id)) return id;
  }
  return 'complete';
}

/** Check if player has entered the eye */
export function checkEyeEntry(
  boatPos: THREE.Vector3,
  eyePos: THREE.Vector3,
  eyeRadius: number,
): boolean {
  return boatPos.distanceTo(eyePos) < eyeRadius;
}

/** Calculate distance from boat to eye */
export function distanceToEye(boatPos: THREE.Vector3, eyePos: THREE.Vector3): number {
  return boatPos.distanceTo(eyePos);
}
