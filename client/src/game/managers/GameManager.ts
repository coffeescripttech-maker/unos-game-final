import { GAME_EVENTS, type LevelCompletePayload, type LevelFailPayload } from '@shared/events';
import type { LevelId, GameState, WeatherParams, GamePhase } from '@shared/types';
import { SCENES } from '@shared/constants';

/**
 * Central orchestrator singleton for game state.
 * Accessible from any Phaser scene via the global game registry.
 */
export class GameManager {
  private static instance: GameManager;

  state: GameState = {
    phase: 'menu',
    currentLevel: null,
    score: 0,
    time: 0,
    health: 100,
    activePowerups: [],
    weatherParams: {
      temperature: 0,
      humidity: 0,
      pressure: 0.5,
      windSpeed: 0,
      rotation: 0,
    },
  };

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  setPhase(phase: GamePhase) {
    this.state.phase = phase;
  }

  setLevel(levelId: LevelId | null) {
    this.state.currentLevel = levelId;
  }

  setScore(score: number) {
    this.state.score = score;
  }

  addScore(points: number) {
    this.state.score += points;
  }

  setHealth(health: number) {
    this.state.health = Math.max(0, Math.min(100, health));
  }

  setWeatherParams(params: Partial<WeatherParams>) {
    Object.assign(this.state.weatherParams, params);
  }

  setTime(time: number) {
    this.state.time = time;
  }

  reset() {
    this.state = {
      phase: 'menu',
      currentLevel: null,
      score: 0,
      time: 0,
      health: 100,
      activePowerups: [],
      weatherParams: {
        temperature: 0,
        humidity: 0,
        pressure: 0.5,
        windSpeed: 0,
        rotation: 0,
      },
    };
  }

  completeLevel(level: LevelId, score: number, stars: number, time: number) {
    const payload: LevelCompletePayload = { level, score, stars, time };
    this.state.phase = 'results';
    // Emit for React to pick up
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(GAME_EVENTS.LEVEL_COMPLETE, { detail: payload }));
    }
  }

  failLevel(level: LevelId, reason: string) {
    const payload: LevelFailPayload = { level, reason };
    this.state.phase = 'results';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(GAME_EVENTS.LEVEL_FAIL, { detail: payload }));
    }
  }

  /**
   * Start a scene by key. Returns the scene instance if found.
   */
  static goToScene(scene: Phaser.Scene, sceneKey: string, data?: Record<string, unknown>) {
    scene.cameras.main.fadeOut(300, 0, 0, 0);
    scene.time.delayedCall(300, () => {
      scene.scene.start(sceneKey, data);
      scene.cameras.main.fadeIn(300, 0, 0, 0);
    });
  }

  /**
   * Calculate star rating based on score / maxScore.
   */
  static getStars(score: number, maxScore: number): number {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.6) return 2;
    if (ratio > 0) return 1;
    return 0;
  }
}
