import type { LevelConfig, PowerUpDef, AchievementDef, EducationalFact, LevelId } from './types';

// ────────────────────────── Game Dimensions ──────────────────────────

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ────────────────────────── Level Order ──────────────────────────

export const LEVEL_ORDER: LevelId[] = [
  'tutorial',
  'evaporation',
  'condensation',
  'pressure',
  'rotation',
  'typhoon',
  'boss',
];

// ────────────────────────── Scene Keys ──────────────────────────

export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  WORLD_MAP: 'WorldMapScene',
  TUTORIAL: 'TutorialScene',
  EVAPORATION: 'EvaporationScene',
  CONDENSATION: 'CondensationScene',
  PRESSURE: 'PressureScene',
  ROTATION: 'RotationScene',
  TYPHOON: 'TyphoonScene',
  BOSS: 'BossScene',
  RESULTS: 'ResultsScene',
  HUD: 'HUDScene',
  PAUSE: 'PauseScene',
} as const;

// ────────────────────────── Scoring ──────────────────────────

export const STAR_THRESHOLDS = {
  ONE: 0, // completing the level = 1 star
  TWO: 0.6, // 60% of max possible score
  THREE: 0.9, // 90% of max possible score
};

// ────────────────────────── Level Configs ──────────────────────────

export const LEVEL_CONFIGS: Record<string, LevelConfig> = {
  tutorial: {
    id: 'tutorial',
    name: 'Welcome Aboard',
    description: 'Learn the basics of navigation and interaction.',
    timeLimit: 0,
    passThreshold: 0,
    maxScore: 0,
    difficultyMultiplier: 1,
    educationalFactId: 'fact_tutorial',
    unlockRequirement: null,
  },
  evaporation: {
    id: 'evaporation',
    name: 'Heat the Ocean',
    description: 'Raise ocean temperature to trigger evaporation.',
    timeLimit: 60,
    passThreshold: 1000,
    maxScore: 2500,
    difficultyMultiplier: 1,
    educationalFactId: 'fact_evaporation',
    unlockRequirement: 'tutorial',
  },
  condensation: {
    id: 'condensation',
    name: 'Build the Clouds',
    description: 'Guide vapor particles into cloud formations.',
    timeLimit: 75,
    passThreshold: 1000,
    maxScore: 2500,
    difficultyMultiplier: 1,
    educationalFactId: 'fact_condensation',
    unlockRequirement: 'evaporation',
  },
  pressure: {
    id: 'pressure',
    name: 'Arrange the Pressure',
    description: 'Place low and high pressure systems to create wind.',
    timeLimit: 45,
    passThreshold: 1000,
    maxScore: 2500,
    difficultyMultiplier: 1,
    educationalFactId: 'fact_pressure',
    unlockRequirement: 'condensation',
  },
  rotation: {
    id: 'rotation',
    name: 'Create the Spin',
    description: 'Apply the Coriolis effect to create cyclonic rotation.',
    timeLimit: 60,
    passThreshold: 1000,
    maxScore: 3000,
    difficultyMultiplier: 1.5,
    educationalFactId: 'fact_rotation',
    unlockRequirement: 'pressure',
  },
  typhoon: {
    id: 'typhoon',
    name: 'Assemble the Storm',
    description: 'Combine all elements to form a complete typhoon.',
    timeLimit: 90,
    passThreshold: 1500,
    maxScore: 3500,
    difficultyMultiplier: 1.5,
    educationalFactId: 'fact_typhoon',
    unlockRequirement: 'rotation',
  },
  boss: {
    id: 'boss',
    name: 'Ride the Storm',
    description: 'Survive the typhoon in your research vessel.',
    timeLimit: 0,
    passThreshold: 2000,
    maxScore: 5000,
    difficultyMultiplier: 2,
    educationalFactId: 'fact_boss',
    unlockRequirement: 'typhoon',
  },
};

// ────────────────────────── Achievements ──────────────────────────

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'FIRST_STEPS', title: 'First Steps', description: 'Complete the Tutorial', condition: 'Tutorial completed', rewardXP: 100 },
  { id: 'OCEAN_WARMER', title: 'Ocean Warmer', description: 'Complete Evaporation', condition: 'Evaporation completed', rewardXP: 100 },
  { id: 'CLOUD_ARCHITECT', title: 'Cloud Architect', description: 'Complete Condensation', condition: 'Condensation completed', rewardXP: 100 },
  { id: 'PRESSURE_MASTER', title: 'Pressure Master', description: 'Complete Pressure', condition: 'Pressure completed', rewardXP: 100 },
  { id: 'SPIN_DOCTOR', title: 'Spin Doctor', description: 'Complete Rotation', condition: 'Rotation completed', rewardXP: 100 },
  { id: 'STORM_BIRTH', title: 'Storm Birth', description: 'Complete Typhoon Formation', condition: 'Typhoon completed', rewardXP: 200 },
  { id: 'STORM_RIDER', title: 'Storm Rider', description: 'Complete the Boss Challenge', condition: 'Boss completed', rewardXP: 300 },
  { id: 'FULL_CAMPAIGN', title: 'Full Campaign', description: 'Complete all levels', condition: 'All levels completed', rewardXP: 500 },
  { id: 'PERFECTIONIST', title: 'Perfectionist', description: 'Get 3 stars on all levels', condition: 'All levels 3-starred', rewardXP: 1000 },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Complete any level in <50% of time limit', condition: 'Time bonus = max', rewardXP: 300 },
  { id: 'NO_MISTAKES', title: 'No Mistakes', description: 'Complete Pressure with zero errors', condition: '0 incorrect placements', rewardXP: 200 },
  { id: 'FACT_COLLECTOR', title: 'Fact Collector', description: 'Unlock all educational facts', condition: 'All 7 facts unlocked', rewardXP: 300 },
  { id: 'STORM_SURVIVOR', title: 'Storm Survivor', description: 'Complete Boss with >80 health', condition: 'Boss health >80', rewardXP: 500 },
  { id: 'SOCIAL_BUTTERFLY', title: 'Social Butterfly', description: 'Play a co-op game', condition: 'Multiplayer game played', rewardXP: 200 },
];

// ────────────────────────── Power-Ups ──────────────────────────

export const POWERUP_DEFS: PowerUpDef[] = [
  { id: 'slow_motion', name: 'Slow Motion', description: 'Slows game time by 50%', duration: 10, rarity: 'common' },
  { id: 'auto_heal', name: 'Auto-Heal', description: 'Restores 25 ship health (Boss only)', duration: 0, rarity: 'uncommon' },
  { id: 'double_score', name: 'Double Score', description: '2× points earned', duration: 15, rarity: 'rare' },
  { id: 'hint', name: 'Hint', description: 'Shows visual guide for current puzzle step', duration: 0, rarity: 'common' },
  { id: 'shield', name: 'Shield', description: 'Negates one failed event (Boss only)', duration: 0, rarity: 'rare' },
  { id: 'vapor_boost', name: 'Vapor Boost', description: 'Auto-generates vapor in Evaporation', duration: 10, rarity: 'uncommon' },
  { id: 'perfect_placement', name: 'Perfect Placement', description: 'Auto-corrects one pressure placement', duration: 0, rarity: 'rare' },
];

// ────────────────────────── Educational Facts ──────────────────────────

export const EDUCATIONAL_FACTS: EducationalFact[] = [
  {
    id: 'fact_tutorial',
    levelId: 'tutorial',
    text: 'A typhoon is a mature tropical cyclone that forms over warm ocean waters near the equator.',
    source: 'NOAA',
  },
  {
    id: 'fact_evaporation',
    levelId: 'evaporation',
    text: 'The ocean must be at least 26.5°C for evaporation to fuel a tropical cyclone. This warmth provides the energy that drives the entire storm.',
    source: 'NASA Earth Observatory',
  },
  {
    id: 'fact_condensation',
    levelId: 'condensation',
    text: 'As water vapor rises, it cools and condenses into tiny water droplets, forming clouds. This releases latent heat — the storm\'s fuel.',
    source: 'UCAR Center for Science Education',
  },
  {
    id: 'fact_pressure',
    levelId: 'pressure',
    text: 'Low pressure at the center draws in surrounding high-pressure air, creating the strong inward winds of a cyclone. The greater the pressure difference, the stronger the winds.',
    source: 'Met Office (UK)',
  },
  {
    id: 'fact_rotation',
    levelId: 'rotation',
    text: 'The Coriolis effect deflects winds to the right in the Northern Hemisphere, creating counter-clockwise rotation. In the Southern Hemisphere, deflection is to the left (clockwise).',
    source: 'NOAA SciJinks',
  },
  {
    id: 'fact_typhoon',
    levelId: 'typhoon',
    text: 'A fully formed typhoon has three parts: the eye (calm center), the eyewall (most intense winds and rain), and spiral rainbands extending outward.',
    source: 'World Meteorological Organization',
  },
  {
    id: 'fact_boss',
    levelId: 'boss',
    text: 'Typhoons can reach Category 5 with sustained winds over 252 km/h — powerful enough to cause catastrophic damage.',
    source: 'National Hurricane Center',
  },
];
