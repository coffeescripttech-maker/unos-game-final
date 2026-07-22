import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { COLORS } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  create() {
    // Set background and immediately transition to preload
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);

    // Register the GameManager in the registry so all scenes can access it
    this.registry.set('gameManager', true);

    this.scene.start(SCENES.PRELOAD);
  }
}
