import { describe, it, expect } from 'vitest';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, LEVEL_ORDER, LEVEL_CONFIGS, STAR_THRESHOLDS } from '@shared/constants';

describe('Shared constants', () => {
  it('has correct game dimensions matching scene expectations', () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
  });

  it('has all 7 levels in order', () => {
    expect(LEVEL_ORDER).toHaveLength(7);
    expect(LEVEL_ORDER).toEqual([
      'tutorial',
      'evaporation',
      'condensation',
      'pressure',
      'rotation',
      'typhoon',
      'boss',
    ]);
  });

  it('has scene keys for all levels plus supporting scenes', () => {
    expect(SCENES.BOOT).toBe('BootScene');
    expect(SCENES.WORLD_MAP).toBe('WorldMapScene');
    expect(SCENES.TUTORIAL).toBe('TutorialScene');
    expect(SCENES.BOSS).toBe('BossScene');
  });

  it('has level configs for all levels', () => {
    for (const id of LEVEL_ORDER) {
      expect(LEVEL_CONFIGS[id]).toBeDefined();
      expect(LEVEL_CONFIGS[id].id).toBe(id);
      expect(LEVEL_CONFIGS[id].name).toBeTruthy();
    }
  });

  it('has sequential unlock requirements', () => {
    expect(LEVEL_CONFIGS.tutorial.unlockRequirement).toBeNull();
    expect(LEVEL_CONFIGS.evaporation.unlockRequirement).toBe('tutorial');
    expect(LEVEL_CONFIGS.condensation.unlockRequirement).toBe('evaporation');
    expect(LEVEL_CONFIGS.pressure.unlockRequirement).toBe('condensation');
    expect(LEVEL_CONFIGS.rotation.unlockRequirement).toBe('pressure');
    expect(LEVEL_CONFIGS.typhoon.unlockRequirement).toBe('rotation');
    expect(LEVEL_CONFIGS.boss.unlockRequirement).toBe('typhoon');
  });

  it('has valid star thresholds', () => {
    expect(STAR_THRESHOLDS.ONE).toBe(0);
    expect(STAR_THRESHOLDS.TWO).toBe(0.6);
    expect(STAR_THRESHOLDS.THREE).toBe(0.9);
  });
});
