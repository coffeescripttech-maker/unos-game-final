// ────────────────────────── Cross-Framework Events ──────────────────────────
// These events bridge Phaser ←→ React communication.
// Phaser emits on game.events, React subscribes via usePhaserEvent hook.

export const GAME_EVENTS = {
  SCORE_UPDATE: 'GAME:SCORE_UPDATE',
  LEVEL_COMPLETE: 'GAME:LEVEL_COMPLETE',
  LEVEL_FAIL: 'GAME:LEVEL_FAIL',
  POWERUP_ACTIVATED: 'GAME:POWERUP_ACTIVATED',
  FACT_UNLOCKED: 'GAME:FACT_UNLOCKED',
  PAUSE: 'GAME:PAUSE',
  UNPAUSE: 'GAME:UNPAUSE',
  SCENE_CHANGE: 'GAME:SCENE_CHANGE',
  ACHIEVEMENT_UNLOCKED: 'GAME:ACHIEVEMENT_UNLOCKED',
  SETTINGS_CHANGED: 'GAME:SETTINGS_CHANGED',

  // HUD Events — Phaser → React for UI display
  HUD_TIMER: 'HUD:TIMER',
  HUD_OBJECTIVE: 'HUD:OBJECTIVE',
  HUD_SCORE: 'HUD:SCORE',
  HUD_HEALTH: 'HUD:HEALTH',
  HUD_RESULT: 'HUD:RESULT',
  HUD_LEVEL_INFO: 'HUD:LEVEL_INFO',
  HUD_WEATHER: 'HUD:WEATHER',
  HUD_CONTINUE: 'HUD:CONTINUE',
  HUD_LEVEL_INTRO: 'HUD:LEVEL_INTRO',
  HUD_INTRO_DISMISS: 'HUD:INTRO_DISMISS',
  HUD_TUTORIAL_STEP: 'HUD:TUTORIAL_STEP',
  HUD_TUTORIAL_BRIEFING: 'HUD:TUTORIAL_BRIEFING',
  HUD_TUTORIAL_HIDE: 'HUD:TUTORIAL_HIDE',
  HUD_TUTORIAL_SKIP: 'HUD:TUTORIAL_SKIP',
  HUD_TUTORIAL_CONTINUE: 'HUD:TUTORIAL_CONTINUE',
  NAVIGATE_HOME: 'NAVIGATE:HOME',
  NAVIGATE_LEVEL: 'NAVIGATE:LEVEL',

  // Pattern Review — React shows correct H/L pattern between rounds
  HUD_PATTERN_REVIEW: 'HUD:PATTERN_REVIEW',
  HUD_PATTERN_DISMISS: 'HUD:PATTERN_DISMISS',

  // Pressure Controls — React joystick-style buttons for H/L selection
  HUD_PRESSURE_SELECT: 'HUD:PRESSURE_SELECT',
  HUD_PRESSURE_START: 'HUD:PRESSURE_START',
  HUD_PRESSURE_STATE: 'HUD:PRESSURE_STATE',
  HUD_PRESSURE_SLOTS: 'HUD:PRESSURE_SLOTS',

  // Typhoon Controls — React sliders for typhoon formation (Stage 5)
  HUD_TYPHOON_SLIDER: 'HUD:TYPHOON_SLIDER',
  HUD_TYPHOON_SLIDER_UPDATE: 'HUD:TYPHOON_SLIDER_UPDATE',

  // Loading screen — React overlay for asset loading progress
  HUD_LOADING: 'HUD:LOADING',
} as const;

// ────────────────────────── Event Payload Types ──────────────────────────

export interface ScoreUpdatePayload {
  score: number;
  level: string;
}

export interface LevelCompletePayload {
  level: string;
  score: number;
  stars: number;
  time: number;
}

export interface LevelFailPayload {
  level: string;
  reason: string;
}

export interface PowerupActivatedPayload {
  powerupId: string;
}

export interface FactUnlockedPayload {
  factId: string;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  title: string;
}

export interface SceneChangePayload {
  from: string;
  to: string;
}

// ────────────────────────── HUD Event Payloads ──────────────────────────

export interface HUDTimerPayload {
  remaining: number;
  total: number;
}

export interface HUDObjectivePayload {
  text: string;
  progress: number;
  target: number;
}

export interface HUDScorePayload {
  score: number;
  label?: string;
}

export interface HUDHealthPayload {
  current: number;
  max: number;
  label: string;
}

export interface HUDResultPayload {
  type: 'complete' | 'fail';
  title: string;
  subtitle?: string;
  score: number;
  stars: number;
  levelId: string;
  timeUsed: number;
  factsUnlocked: string[];
}

export interface HUDLevelInfoPayload {
  name: string;
  description: string;
}

export interface HUDWeatherPayload {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  stormLevel?: number;
  powerup?: string;
}

export interface HUDLevelIntroMechanic {
  icon: string;
  text: string;
}

export interface HUDLevelIntroPayload {
  levelId: string;
  badge: string;
  title: string;
  subtitle: string;
  mechanics: HUDLevelIntroMechanic[];
}

export interface HUDTutorialStepPayload {
  currentStep: number;
  totalSteps: number;
  task: string;
  instruction: string;
  description: string;
  stepId: string;
}

export interface HUDPressureStatePayload {
  selectedType: 'high' | 'low' | null;
  placedCount: number;
  roundActive: boolean;
  gameStarted: boolean;
  isComplete: boolean;
  round: number;
  totalRounds: number;
}

export interface HUDPressureSlotData {
  x: number;
  y: number;
  index: number;
  correct: 'high' | 'low';
  placed: 'high' | 'low' | null;
}

export interface HUDPressureSlotsPayload {
  slots: HUDPressureSlotData[];
  round: number;
  totalRounds: number;
}

export interface HUDPatternReviewPayload {
  round: number;
  totalRounds: number;
  pattern: ('high' | 'low')[];
  /** 'correct' = player succeeded → show wind flow education; 'wrong' = player failed → show what went wrong */
  type: 'correct' | 'wrong';
  /** What the player actually placed (for wrong reviews — indices differ from correct) */
  placed?: ('high' | 'low' | null)[];
}

// ────────────────────────── Typhoon Slider Payloads ──────────────────────────

export interface TyphoonSliderConfig {
  index: number;
  label: string;
  icon: string;
  min: number;
  max: number;
  defaultValue: number;
  color: string;
  targetMin: number;
  targetMax: number;
}

export interface TyphoonSliderUpdatePayload {
  index: number;
  value: number;
}

// ────────────────────────── Loading Payloads ──────────────────────────

export interface HUDLoadingPayload {
  progress: number; // 0–1
}

export type GameEventPayloads = {
  [GAME_EVENTS.SCORE_UPDATE]: ScoreUpdatePayload;
  [GAME_EVENTS.LEVEL_COMPLETE]: LevelCompletePayload;
  [GAME_EVENTS.LEVEL_FAIL]: LevelFailPayload;
  [GAME_EVENTS.POWERUP_ACTIVATED]: PowerupActivatedPayload;
  [GAME_EVENTS.FACT_UNLOCKED]: FactUnlockedPayload;
  [GAME_EVENTS.PAUSE]: undefined;
  [GAME_EVENTS.UNPAUSE]: undefined;
  [GAME_EVENTS.SCENE_CHANGE]: SceneChangePayload;
  [GAME_EVENTS.ACHIEVEMENT_UNLOCKED]: AchievementUnlockedPayload;
  [GAME_EVENTS.SETTINGS_CHANGED]: Partial<import('./types').GameSettings>;
  [GAME_EVENTS.HUD_TIMER]: HUDTimerPayload;
  [GAME_EVENTS.HUD_OBJECTIVE]: HUDObjectivePayload;
  [GAME_EVENTS.HUD_SCORE]: HUDScorePayload;
  [GAME_EVENTS.HUD_HEALTH]: HUDHealthPayload;
  [GAME_EVENTS.HUD_RESULT]: HUDResultPayload;
  [GAME_EVENTS.HUD_LEVEL_INFO]: HUDLevelInfoPayload;
  [GAME_EVENTS.HUD_LEVEL_INTRO]: HUDLevelIntroPayload;
  [GAME_EVENTS.HUD_INTRO_DISMISS]: undefined;
  [GAME_EVENTS.HUD_TUTORIAL_STEP]: HUDTutorialStepPayload;
  [GAME_EVENTS.HUD_TUTORIAL_BRIEFING]: undefined;
  [GAME_EVENTS.HUD_TUTORIAL_HIDE]: undefined;
  [GAME_EVENTS.HUD_TUTORIAL_SKIP]: undefined;
  [GAME_EVENTS.HUD_TUTORIAL_CONTINUE]: undefined;
  [GAME_EVENTS.HUD_WEATHER]: HUDWeatherPayload;
  [GAME_EVENTS.NAVIGATE_LEVEL]: string;
  [GAME_EVENTS.HUD_PATTERN_REVIEW]: HUDPatternReviewPayload;
  [GAME_EVENTS.HUD_PATTERN_DISMISS]: undefined;
  [GAME_EVENTS.HUD_PRESSURE_SELECT]: 'high' | 'low' | null;
  [GAME_EVENTS.HUD_PRESSURE_START]: undefined;
  [GAME_EVENTS.HUD_PRESSURE_STATE]: HUDPressureStatePayload;
  [GAME_EVENTS.HUD_PRESSURE_SLOTS]: HUDPressureSlotsPayload;
  [GAME_EVENTS.HUD_TYPHOON_SLIDER]: TyphoonSliderConfig[];
  [GAME_EVENTS.HUD_TYPHOON_SLIDER_UPDATE]: TyphoonSliderUpdatePayload;
  [GAME_EVENTS.HUD_LOADING]: HUDLoadingPayload;
};

// ────────────────────────── Socket.IO Event Names ──────────────────────────

export const SOCKET_EVENTS = {
  // Client → Server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  GAME_INPUT: 'game:input',
  PLAYER_READY: 'player:ready',

  // Server → Client
  ROOM_CREATED: 'room:created',
  ROOM_STATE: 'room:state',
  ROOM_UPDATE: 'room:update',
  STATE_SYNC: 'state:sync',
  GAME_START: 'game:start',
  ERROR: 'error',
} as const;
