import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLoadingPayload } from '@shared/events';
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

      // Emit to React overlay
      this.game.events.emit(GAME_EVENTS.HUD_LOADING, { progress: value } satisfies HUDLoadingPayload);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();

      // Signal completion to React
      this.game.events.emit(GAME_EVENTS.HUD_LOADING, { progress: 1 } satisfies HUDLoadingPayload);
    });

    // Load external assets
    this.load.image('main_menu_bg', 'images/Main Menu BG.png');
    this.load.image('world_map2', 'World Map2.png');
    this.load.image('world_map_bg', 'images/Main Menu BG.png');

    // Tutorial â€” Research Base
    this.load.image('tutorial_bg', 'images/Tutorial BG.png');

    // Stage 1 â€” Evaporation assets
    this.load.image('evap_sky', 'images/Stage 1/sky.png');
    this.load.image('evap_sun', 'images/Stage 1/sun.png');
    this.load.image('evap_clouds', 'images/Stage 1/clouds.png');
    this.load.image('evap_island', 'images/Stage 1/island.png');
    this.load.image('evap_ocean', 'images/Stage 1/ocean.png');
    this.load.image('evap_vapor', 'images/Stage 1/water vapor.jpg');

    // Stage 2 â€” Condensation assets (actual PNG files)
    this.load.image(
      'condensation_sky',
      'images/Stage 2/backgrounds/condensation_sky.png'
    );
    this.load.image(
      'ocean_strip',
      'images/Stage 2/environment/ocean_strip.png'
    );
    this.load.image('cloud_small', 'images/Stage 2/sprites/cloud_small.png');
    this.load.image(
      'vapor_particle',
      'images/Stage 2/gameplay/vapor_particle.png'
    );
    this.load.image('cool_zone', 'images/Stage 2/gameplay/cool_zone.png');
    this.load.image('wind_stream', 'images/Stage 2/gameplay/wind_stream.png');
    this.load.image(
      'condensation_effect',
      'images/Stage 2/gameplay/condensation_effect.png'
    );
    this.load.image('cloud_glow', 'images/Stage 2/gameplay/cloud_glow.png');
    this.load.image('mist_layer', 'images/Stage 2/gameplay/Mist Layer.png');
    this.load.image(
      'temperature_layer_overlay',
      'images/Stage 2/gameplay/temperature_layer_overlay.png'
    );

    // Stage 3 â€” Air Pressure assets
    this.load.image(
      'pressure_island_bg',
      'images/Stage 3/backgrounds/pressure_island.png'
    );
    this.load.image(
      'clouds_front',
      'images/Stage 3/backgrounds/clouds_front.png'
    );
    this.load.image(
      'airflow_overlay',
      'images/Stage 3/backgrounds/airflow_overlay.png'
    );
    this.load.image('stage3_ocean', 'images/Stage 3/backgrounds/ocean.png');
    this.load.image(
      'clouds_back',
      'images/Stage 3/backgrounds/clouds_back.png'
    );
    this.load.image(
      'high_pressure_marker',
      'images/Stage 3/gameplay/high_pressure.png'
    );
    this.load.image(
      'low_pressure_marker',
      'images/Stage 3/gameplay/low_pressure.png'
    );
    this.load.image(
      'pressure_node_slot',
      'images/Stage 3/gameplay/pressure_node.png'
    );
    this.load.image('target_zone', 'images/Stage 3/gameplay/target_zone.png');
    this.load.image('wind_arrow_s3', 'images/Stage 3/gameplay/wind_arrow.png');
    this.load.image(
      'pressure_wave',
      'images/Stage 3/gameplay/pressure_wave.png'
    );
    this.load.image(
      'wind_stream_s3',
      'images/Stage 3/gameplay/wind_stream.png'
    );
    this.load.image('wind_meter_ui', 'images/Stage 3/wind_meter.png');
    this.load.image('air_energy', 'images/Stage 3/air_energy.png');
    this.load.image('wind_gust_effect', 'images/Stage 3/effects/wind_gust.png');
    this.load.image(
      'wind_particles',
      'images/Stage 3/effects/wind_particles.png'
    );
    this.load.image('cloud_glow_s3', 'images/Stage 3/gameplay/cloud_glow.png');

    // Stage 4 â€” Rotation / Coriolis assets
    this.load.image('rotation_bg', 'images/Stage 4/backgrounds/background.png');
    // Stage 5 — Typhoon assets
    this.load.image(
      'typhoon_bg',
      'images/Stage 5/backgrounds/Stage 5 — Typhoon BG.png'
    );

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

    // Vapor particle (fallback â€” actual file loaded above)
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('vapor_particle_fallback', 16, 16);

    // Cloud (generic, for other scenes)
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

    // â”€â”€ Condensation placeholder textures (for missing assets) â”€â”€
    // cloud_medium (no file exists)
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.85);
    gfx.fillCircle(30, 24, 20);
    gfx.fillCircle(55, 18, 26);
    gfx.fillCircle(80, 24, 22);
    gfx.fillRect(28, 18, 54, 28);
    gfx.generateTexture('cloud_medium', 100, 50);

    // cloud_large (no file exists)
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(40, 32, 28);
    gfx.fillCircle(75, 24, 36);
    gfx.fillCircle(115, 32, 30);
    gfx.fillCircle(135, 30, 22);
    gfx.fillRect(38, 24, 100, 38);
    gfx.generateTexture('cloud_large', 150, 66);

    gfx.destroy();
  }
}
