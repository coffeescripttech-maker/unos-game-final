import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { LevelId } from '@shared/types';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.WORLD_MAP });
  }

  create() {
    this.cameras.main.fadeIn(500);
    // Dark neutral base so the map image shows through instead of a strong blue
    this.cameras.main.setBackgroundColor(0x060a1a);

    // Background map image (islands + ocean only)
    const bgKey = this.textures.exists('world_map_bg')
      ? 'world_map_bg'
      : this.textures.exists('world_map2')
        ? 'world_map2'
        : null;
    if (bgKey) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(0);
    }

    // Subtle dim overlay — keeps the bg visible but makes cards readable
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
      .setDepth(1);

    // DEBUG quick-jump: /game?level=<id> starts that level directly, so
    // developers can test any stage without unlocking the previous ones.
    const params = new URLSearchParams(window.location.search);
    const quickLevel = params.get('level');
    if (quickLevel) {
      // Consume once — strip the param so returning to the map doesn't re-jump.
      window.history.replaceState({}, '', window.location.pathname);
      const levelId = quickLevel as LevelId;
      this.time.delayedCall(150, () => this.navigateToLevel(levelId));
      return;
    }

    // Signal React that we're on the world map (triggers level select overlay + header)
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'World Map',
      description: 'Select a level',
    });

    // Listen for level navigation from React cards
    this.game.events.on(GAME_EVENTS.NAVIGATE_LEVEL, this.navigateToLevel);
  }

  private navigateToLevel = (levelId: LevelId) => {
    // The boss level is a React/R3F experience rendered at /boss.
    // All other levels launch Phaser scenes.
    if (levelId === 'boss') {
      this.game.events.off(GAME_EVENTS.NAVIGATE_LEVEL, this.navigateToLevel);
      window.location.href = '/boss';
      return;
    }

    const sceneKey = this.getSceneKeyForLevel(levelId);
    if (!sceneKey) return;

    this.game.events.off(GAME_EVENTS.NAVIGATE_LEVEL, this.navigateToLevel);

    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => {
      this.scene.start(sceneKey);
      this.cameras.main.fadeIn(300);
    });
  };

  private getSceneKeyForLevel(levelId: LevelId): string | null {
    const map: Record<string, string> = {
      tutorial: SCENES.TUTORIAL,
      evaporation: SCENES.EVAPORATION,
      condensation: SCENES.CONDENSATION,
      pressure: SCENES.PRESSURE,
      rotation: SCENES.ROTATION,
      typhoon: SCENES.TYPHOON,
    };
    return map[levelId] ?? null;
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.NAVIGATE_LEVEL, this.navigateToLevel);
  }
}
