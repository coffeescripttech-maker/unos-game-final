import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  preload() {
    // RetroUI-style loading bar
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background box
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(COLORS.STORM_MID, 0.8);
    this.progressBox.fillRect(centerX - 160, centerY - 25, 320, 50);
    this.progressBox.lineStyle(3, COLORS.UI_BLACK, 1);
    this.progressBox.strokeRect(centerX - 160, centerY - 25, 320, 50);

    // Fill bar
    this.progressBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontFamily: FONTS.BODY,
      fontSize: '18px',
      color: '#FFFFFF'
    });
    this.loadingText.setOrigin(0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(COLORS.OCEAN_LIGHT, 1);
      this.progressBar.fillRect(centerX - 155, centerY - 20, 310 * value, 40);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
    });

    // Load external assets
    this.load.image('main_menu_bg', 'images/Main Menu BG.png');
    this.load.image('world_map2', 'World Map2.png');
    this.load.image('world_map_bg', 'images/Main Menu BG.png');

    // Tutorial — Research Base
    this.load.image('tutorial_bg', 'images/Tutorial BG.png');

    // Stage 1 — Evaporation assets
    this.load.image('evap_sky', 'images/Stage 1/sky.png');
    this.load.image('evap_sun', 'images/Stage 1/sun.png');
    this.load.image('evap_clouds', 'images/Stage 1/clouds.png');
    this.load.image('evap_island', 'images/Stage 1/island.png');
    this.load.image('evap_ocean', 'images/Stage 1/ocean.png');
    this.load.image('evap_vapor', 'images/Stage 1/water vapor.jpg');

    // Generate placeholder textures
    this.generatePlaceholderAssets();
  }

  create() {
    // Brief delay then go to world map (React HomePage is the main menu)
    this.time.delayedCall(500, () => {
      this.scene.start(SCENES.WORLD_MAP);
    });
  }

  private generatePlaceholderAssets() {
    // Create simple colored rectangle textures for placeholder sprites
    // Using add.graphics() and removing after texture generation

    const gfx = this.add.graphics();

    // Vapor particle
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('vapor_particle', 16, 16);

    // Cloud
    gfx.clear();
    gfx.fillStyle(COLORS.STORM_LIGHT, 1);
    gfx.fillCircle(24, 20, 20);
    gfx.fillCircle(40, 16, 24);
    gfx.fillCircle(56, 20, 20);
    gfx.fillRect(20, 16, 40, 28);
    gfx.generateTexture('cloud', 80, 48);

    // Pressure cell L (red circle)
    gfx.clear();
    gfx.fillStyle(COLORS.WARNING_RED, 1);
    gfx.fillCircle(24, 24, 24);
    gfx.lineStyle(3, COLORS.UI_BLACK, 1);
    gfx.strokeCircle(24, 24, 24);
    gfx.generateTexture('pressure_L', 48, 48);

    // Pressure cell H (blue circle)
    gfx.clear();
    gfx.fillStyle(COLORS.OCEAN_DEEP, 1);
    gfx.fillCircle(24, 24, 24);
    gfx.lineStyle(3, COLORS.UI_BLACK, 1);
    gfx.strokeCircle(24, 24, 24);
    gfx.generateTexture('pressure_H', 48, 48);

    // Ship placeholder
    gfx.clear();
    gfx.fillStyle(COLORS.STORM_DARK, 1);
    gfx.fillRect(10, 20, 60, 20);
    gfx.fillRect(30, 5, 20, 15);
    gfx.generateTexture('ship', 80, 45);

    // Buoy (for tutorial)
    gfx.clear();
    gfx.fillStyle(COLORS.WARNING_ORANGE, 1);
    gfx.fillCircle(12, 12, 12);
    gfx.fillRect(10, 20, 4, 16);
    gfx.generateTexture('buoy', 24, 36);

    // UI button
    gfx.clear();
    gfx.fillStyle(COLORS.OCEAN_MID, 1);
    gfx.fillRect(0, 0, 200, 50);
    gfx.lineStyle(3, COLORS.UI_BLACK, 1);
    gfx.strokeRect(0, 0, 200, 50);
    gfx.generateTexture('btn_primary', 200, 50);

    gfx.destroy();
  }
}
