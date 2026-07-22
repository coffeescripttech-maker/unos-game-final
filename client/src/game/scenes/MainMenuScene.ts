import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { COLORS } from '../constants';

/**
 * Main Menu — redirected to React HomePage.
 * This scene exists only as a safety pass-through when the Phaser game
 * runs inside the /game route; the real main menu is HomePage.tsx.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);
    // Immediately go to WorldMap — React HomePage is the real menu
    this.scene.start(SCENES.WORLD_MAP);
  }
}
