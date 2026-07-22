// ────────────────────────── Core Level Types ──────────────────────────

export type LevelId =
  | 'tutorial'
  | 'evaporation'
  | 'condensation'
  | 'pressure'
  | 'rotation'
  | 'typhoon'
  | 'boss';

export type GamePhase =
  | 'menu'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'fact_popup'
  | 'results'
  | 'multiplayer_lobby';

// ────────────────────────── Level Config ──────────────────────────

export interface LevelConfig {
  id: LevelId;
  name: string;
  description: string;
  timeLimit: number; // seconds, 0 = no limit
  passThreshold: number;
  maxScore: number;
  difficultyMultiplier: number;
  educationalFactId: string;
  unlockRequirement: LevelId | null; // null = always unlocked
}

// ────────────────────────── Progress ──────────────────────────

export interface LevelProgress {
  completed: boolean;
  bestScore: number;
  bestTime: number;
  stars: number; // 0-3
  attempts: number;
  factsUnlocked: string[];
}

export interface SaveData {
  version: number;
  lastPlayed: string;
  totalPlayTime: number;
  levels: Record<string, LevelProgress>;
  settings: GameSettings;
  inventory: Record<string, number>;
  unlockedAchievements: string[];
  totalXP: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  colorblindMode: boolean;
  reducedMotion: boolean;
}

// ────────────────────────── Game State ──────────────────────────

export interface WeatherParams {
  temperature: number; // 0-1
  humidity: number; // 0-1
  pressure: number; // 0-1 (higher = lower pressure)
  windSpeed: number; // 0-1
  rotation: number; // 0-1
}

export interface GameState {
  phase: GamePhase;
  currentLevel: LevelId | null;
  score: number;
  time: number;
  health: number;
  activePowerups: string[];
  weatherParams: WeatherParams;
}

// ────────────────────────── Achievements ──────────────────────────

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  condition: string; // human-readable description
  rewardXP: number;
}

export interface AchievementProgress {
  achievementId: string;
  unlockedAt: string | null;
  progress: number; // 0-1 for multi-step
}

// ────────────────────────── Power-Ups ──────────────────────────

export interface PowerUpDef {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds, 0 = instant
  rarity: 'common' | 'uncommon' | 'rare';
}

// ────────────────────────── Multiplayer ──────────────────────────

export interface PlayerInfo {
  userId: string;
  displayName: string;
  isReady: boolean;
  joinedAt: string;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  currentLevel: LevelId | null;
  sharedProgress: number;
  status: RoomStatus;
}

// ────────────────────────── Leaderboard ──────────────────────────

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  time: number;
  achievedAt: string;
}

// ────────────────────────── Educational Facts ──────────────────────────

export interface EducationalFact {
  id: string;
  levelId: LevelId;
  text: string;
  source: string;
}
