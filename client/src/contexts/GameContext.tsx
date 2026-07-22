import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GamePhase, LevelId, GameState, WeatherParams, GameSettings, LevelProgress } from '@shared/types';

interface GameContextValue {
  game: Phaser.Game | null;
  setGame: (game: Phaser.Game | null) => void;
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  currentLevel: LevelId | null;
  setCurrentLevel: (level: LevelId | null) => void;
  score: number;
  setScore: (score: number) => void;
  health: number;
  setHealth: (health: number) => void;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  progress: Record<string, LevelProgress>;
  updateProgress: (levelId: string, progress: LevelProgress) => void;
  weatherParams: WeatherParams;
  setWeatherParams: (params: WeatherParams) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  colorblindMode: false,
  reducedMotion: false,
};

const DEFAULT_WEATHER: WeatherParams = {
  temperature: 0,
  humidity: 0,
  pressure: 0.5,
  windSpeed: 0,
  rotation: 0,
};

const initialGameState: GameState = {
  phase: 'menu',
  currentLevel: null,
  score: 0,
  time: 0,
  health: 100,
  activePowerups: [],
  weatherParams: DEFAULT_WEATHER,
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGameState] = useState<Phaser.Game | null>(null);
  const [phase, setPhase] = useState<GamePhase>(initialGameState.phase);
  const [currentLevel, setCurrentLevel] = useState<LevelId | null>(initialGameState.currentLevel);
  const [score, setScore] = useState(initialGameState.score);
  const [health, setHealth] = useState(initialGameState.health);
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('unos_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [progress, setProgress] = useState<Record<string, LevelProgress>>(() => {
    const saved = localStorage.getItem('unos_progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [weatherParams, setWeatherParams] = useState<WeatherParams>(DEFAULT_WEATHER);

  const setGame = useCallback((g: Phaser.Game | null) => {
    setGameState(g);
  }, []);

  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('unos_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateProgress = useCallback((levelId: string, p: LevelProgress) => {
    setProgress(prev => {
      const next = { ...prev, [levelId]: p };
      localStorage.setItem('unos_progress', JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPhase('menu');
    setCurrentLevel(null);
    setScore(0);
    setHealth(100);
    setWeatherParams(DEFAULT_WEATHER);
  }, []);

  const value: GameContextValue = {
    game,
    setGame,
    phase,
    setPhase,
    currentLevel,
    setCurrentLevel,
    score,
    setScore,
    health,
    setHealth,
    settings,
    updateSettings,
    progress,
    updateProgress,
    weatherParams,
    setWeatherParams,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
