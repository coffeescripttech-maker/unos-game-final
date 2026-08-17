// ────────────────────────── Boss Level Types ──────────────────────────

import type { Vector3 } from 'three';

/** Mission objective states */
export type ObjectiveId =
  | 'collect_temperature'
  | 'collect_humidity'
  | 'collect_pressure'
  | 'collect_windspeed'
  | 'deploy_buoy'
  | 'reach_eye'
  | 'complete';

export interface MissionObjective {
  id: ObjectiveId;
  label: string;
  description: string;
  completed: boolean;
}

export type MissionStatus = 'intro' | 'active' | 'eye' | 'complete' | 'failed';

/** Game phase — progression through the level */
export type GamePhase = 1 | 2 | 3 | 4 | 5;

export interface MissionState {
  status: MissionStatus;
  phase: GamePhase;
  boatIntegrity: number;
  maxIntegrity: number;
  collectedData: ObjectiveId[];
  currentObjective: ObjectiveId;
  objectives: MissionObjective[];
  distanceToEye: number;
  isInEye: boolean;
  nearCollectible: ObjectiveId | null;  // which collectible is nearby
  interactionPrompt: string | null;     // what to show as "Press E to..."
  lastNotification: NotificationData | null;
  quizBonus: number;                     // points earned from science quizzes
}

/** Toast notification */
export interface NotificationData {
  id: string;
  icon: string;
  message: string;
  color: string;
  timestamp: number;
}

/** Data collectible floating in the world */
export interface CollectibleData {
  id: ObjectiveId;
  position: Vector3;
  label: string;
  icon: string;
  color: string;
  collected: boolean;
}

/** Hazard spawn data */
export interface HazardEvent {
  type: 'wave' | 'gust' | 'lightning' | 'debris';
  position: Vector3;
  intensity: number;
  timestamp: number;
}

/** Giant wave hazard */
export interface GiantWaveData {
  id: number;
  position: Vector3;
  velocity: Vector3;
  height: number;
  width: number;
  active: boolean;
  radius: number;
}

/** Lightning strike with warning */
export interface LightningStrikeData {
  id: number;
  position: Vector3;
  warningTime: number;  // seconds before strike
  elapsed: number;
  struck: boolean;
  active: boolean;
}

/** Wind gust event */
export interface WindGustData {
  direction: Vector3;
  strength: number;
  duration: number;
  elapsed: number;
}

/** Boat state for controls */
export interface BoatState {
  position: Vector3;
  rotation: number; // yaw
  speed: number;
  engineOn: boolean;
  integrity: number;
  boosting: boolean;
}

/** Storm intensity parameters (0-1 scale for each) */
export interface StormParams {
  intensity: number;      // overall, based on distance to eye + phase
  windSpeed: number;
  rainIntensity: number;
  lightningRate: number;
  cloudCover: number;
  waveHeight: number;
}

/** Procedural audio state */
export interface AudioState {
  masterVolume: number;
  windVolume: number;
  rainVolume: number;
  engineVolume: number;
  thunderEnabled: boolean;
}
