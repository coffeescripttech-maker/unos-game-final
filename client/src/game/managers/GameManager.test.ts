import { describe, it, expect, beforeEach } from 'vitest';
import { GameManager } from './GameManager';

describe('GameManager', () => {
  let gm: GameManager;

  beforeEach(() => {
    // Reset singleton between tests
    // @ts-expect-error — accessing private instance for reset
    GameManager.instance = undefined;
    gm = GameManager.getInstance();
  });

  describe('getStars', () => {
    it('returns 0 for zero score', () => {
      expect(GameManager.getStars(0, 2500)).toBe(0);
    });

    it('returns 1 for minimal passing score', () => {
      expect(GameManager.getStars(1, 2500)).toBe(1);
      expect(GameManager.getStars(1499, 2500)).toBe(1);
    });

    it('returns 2 at 60% threshold', () => {
      expect(GameManager.getStars(1500, 2500)).toBe(2);
      expect(GameManager.getStars(2249, 2500)).toBe(2);
    });

    it('returns 3 at 90% threshold', () => {
      expect(GameManager.getStars(2250, 2500)).toBe(3);
      expect(GameManager.getStars(2500, 2500)).toBe(3);
    });

    it('handles zero maxScore gracefully', () => {
      expect(GameManager.getStars(0, 0)).toBe(0);
    });
  });

  describe('state management', () => {
    it('starts in menu phase', () => {
      expect(gm.state.phase).toBe('menu');
    });

    it('setPhase changes the phase', () => {
      gm.setPhase('playing');
      expect(gm.state.phase).toBe('playing');
    });

    it('setLevel tracks current level', () => {
      gm.setLevel('evaporation');
      expect(gm.state.currentLevel).toBe('evaporation');
    });

    it('setScore updates score', () => {
      gm.setScore(1500);
      expect(gm.state.score).toBe(1500);
    });

    it('addScore increments score', () => {
      gm.setScore(1000);
      gm.addScore(500);
      expect(gm.state.score).toBe(1500);
    });

    it('setHealth clamps to 0-100', () => {
      gm.setHealth(150);
      expect(gm.state.health).toBe(100);
      gm.setHealth(-10);
      expect(gm.state.health).toBe(0);
    });

    it('reset restores default state', () => {
      gm.setPhase('playing');
      gm.setLevel('boss');
      gm.setScore(9999);
      gm.reset();
      expect(gm.state.phase).toBe('menu');
      expect(gm.state.currentLevel).toBeNull();
      expect(gm.state.score).toBe(0);
      expect(gm.state.health).toBe(100);
    });
  });

  describe('setWeatherParams', () => {
    it('merges partial weather params', () => {
      gm.setWeatherParams({ temperature: 30, humidity: 80 });
      expect(gm.state.weatherParams.temperature).toBe(30);
      expect(gm.state.weatherParams.humidity).toBe(80);
      // Other params unchanged
      expect(gm.state.weatherParams.pressure).toBe(0.5);
    });
  });

  describe('completeLevel', () => {
    it('sets phase to results', () => {
      gm.completeLevel('tutorial', 0, 1, 0);
      expect(gm.state.phase).toBe('results');
    });
  });

  describe('failLevel', () => {
    it('sets phase to results', () => {
      gm.failLevel('evaporation', 'Time expired');
      expect(gm.state.phase).toBe('results');
    });
  });
});
