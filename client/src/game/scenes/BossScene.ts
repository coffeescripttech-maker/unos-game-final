import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDObjectivePayload,
  HUDResultPayload,
  HUDLevelInfoPayload,
  HUDHealthPayload,
  HUDScorePayload,
  HUDWeatherPayload
} from '@shared/events';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  WORLD
// ═══════════════════════════════════════════════════════════════════

// Single panoramic boss_background.png (2172×724) at ~1.84× stretch
const WORLD_W = 4000;
const WORLD_H = 724;

const PLAYER_START_X = 200;
const PLAYER_START_Y = 500;

// ═══════════════════════════════════════════════════════════════════
//  DISPLAY WIDTHS  (setDisplayWidth → displayWidth property)
// ═══════════════════════════════════════════════════════════════════

const DW_BOAT = 160;
const DW_BUOY = 65;
const DW_FINISH = 120;
const DW_LOG = 90;
const DW_BARREL = 55;
const DW_CRATE = 70;
const DW_WAVE_SMALL = 180;
const DW_WAVE_LARGE = 320;
const DW_LIGHTNING_STRIKE = 180;
const DW_WATER_PARTICLE = 30;

// ═══════════════════════════════════════════════════════════════════
//  COLLISION RADII  (body.setCircle)
// ═══════════════════════════════════════════════════════════════════

const CR_BOAT = 58;
const CR_BUOY = 30;
const CR_LOG = 35;
const CR_BARREL = 20;
const CR_CRATE = 28;
const CR_WAVE_SMALL = 80;
const CR_WAVE_LARGE = 150;

// ═══════════════════════════════════════════════════════════════════
//  BOAT PHYSICS
// ═══════════════════════════════════════════════════════════════════

const MAX_SPEED_FWD = 280;
const MAX_SPEED_REV = 80;
const ACCEL = 200;
const BRAKE = 300;
const FRICTION = 0.96;
const TURN_RATE = 2.5;
const DRIFT_RECOVER = 0.88;

// ═══════════════════════════════════════════════════════════════════
//  INTEGRITY
// ═══════════════════════════════════════════════════════════════════

const MAX_INTEGRITY = 100;

const DMG = {
  WAVE: 5,
  LOG: 10,
  BARREL: 15,
  CRATE: 20,
  LIGHTNING: 25
} as const;

// ═══════════════════════════════════════════════════════════════════
//  COLLECTION
// ═══════════════════════════════════════════════════════════════════

const BUOY_ACTIVATE_RADIUS = 110;
const EYE_FINISH_RADIUS = 120;
const COLLECT_TIME = 2.0;

// ═══════════════════════════════════════════════════════════════════
//  LIGHTNING
// ═══════════════════════════════════════════════════════════════════

const LIGHTNING_WARN_DUR = 1.0;
const LIGHTNING_STRIKE_RADIUS = 120;

// ═══════════════════════════════════════════════════════════════════
//  WAVES
// ═══════════════════════════════════════════════════════════════════

const WAVE_BASE_SPEED = 80;
const WAVE_SPAWN_INTERVAL_BASE = 3000;

// ═══════════════════════════════════════════════════════════════════
//  DEPTH LAYERS
// ═══════════════════════════════════════════════════════════════════

const D = {
  BG: 0,
  CLOUD: 1,
  FOG: 2,
  BUOYS: 3,
  HAZARDS: 4,
  WAKE: 5,
  BOAT: 6,
  WAVES: 7,
  RAIN: 8,
  WIND: 9,
  LIGHTNING: 10,
  SUNRAYS: 11,
  HUD: 20
} as const;

// ═══════════════════════════════════════════════════════════════════
//  PHASE OVERLAY ALPHAS
// ═══════════════════════════════════════════════════════════════════

const PHASE = [
  { cloud: 0.2, fog: 0, rain: 0, wind: 0, sun: 0 },
  { cloud: 0.4, fog: 0.15, rain: 0.3, wind: 0.2, sun: 0 },
  { cloud: 0.7, fog: 0.4, rain: 0.7, wind: 0.5, sun: 0 },
  { cloud: 1.0, fog: 0.7, rain: 1.0, wind: 1.0, sun: 0 },
  { cloud: 0.1, fog: 0, rain: 0, wind: 0, sun: 0.8 }
];

// ═══════════════════════════════════════════════════════════════════
//  BUOY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

interface BuoyDef {
  x: number;
  y: number;
  key: string;
  type: string;
  label: string;
  fact: string;
}

const BUOY_DEFS: BuoyDef[] = [
  {
    x: 1100,
    y: 380,
    key: 'buoy_temp',
    type: 'temperature',
    label: 'Temperature',
    fact: 'Warm ocean water provides the energy that fuels tropical cyclones.'
  },
  {
    x: 1850,
    y: 420,
    key: 'buoy_humidity',
    type: 'humidity',
    label: 'Humidity',
    fact: 'Moist air supplies water vapor for cloud formation, releasing heat that powers the storm.'
  },
  {
    x: 2600,
    y: 340,
    key: 'buoy_pressure',
    type: 'pressure',
    label: 'Air Pressure',
    fact: 'Low-pressure areas draw surrounding air inward, helping storms strengthen and organize.'
  },
  {
    x: 3100,
    y: 400,
    key: 'buoy_wind',
    type: 'wind',
    label: 'Wind Speed',
    fact: 'Strong rotating winds organize the cyclone into a powerful typhoon with a defined eye.'
  }
];

const FINISH_X = 3700;
const FINISH_Y = 362;

type DebrisKind = 'debris_log' | 'debris_barrel' | 'debris_crate';

// ═══════════════════════════════════════════════════════════════════
//  LIGHTNING STATE
// ═══════════════════════════════════════════════════════════════════

interface LightningState {
  cooldown: number;
  phase: 'idle' | 'warning' | 'strike' | 'cooldown';
  warnX: number;
  warnY: number;
  warnTimer: number;
  warningSprite?: Phaser.GameObjects.Image;
  boltSprite?: Phaser.GameObjects.Image;
}

// ═══════════════════════════════════════════════════════════════════
//  PHYSICS BODY HELPER
// ═══════════════════════════════════════════════════════════════════

/** Narrow the Body|StaticBody union to the dynamic Arcade Body we actually use. */
function arcadeBody(
  obj: Phaser.Physics.Arcade.Image
): Phaser.Physics.Arcade.Body {
  return obj.body as Phaser.Physics.Arcade.Body;
}

/** Union matching Phaser's internal overlap-callback parameter type. */
type PhysOverlapObj =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Tilemaps.Tile
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody;

// ═══════════════════════════════════════════════════════════════════
//  SCENE
// ═══════════════════════════════════════════════════════════════════

export class BossScene extends Phaser.Scene {
  // ── Player ──
  private boat!: Phaser.Physics.Arcade.Image;
  private speed = 0;
  private heading = 0;
  private lateralDrift = 0;

  // ── Health ──
  private integrity = MAX_INTEGRITY;
  private stunned = false;
  private stunTimer = 0;

  // ── Mission ──
  private activeIdx = -1;
  private buoys: Phaser.Physics.Arcade.Image[] = [];
  private buoyGlows: Phaser.GameObjects.Image[] = [];
  private collected: boolean[] = [false, false, false, false];
  private collecting = false;
  private collectProgress = 0;
  private nearBuoy = false;
  private showingFact = false;
  private lastCheckpoint = -1;
  private finishBeacon?: Phaser.Physics.Arcade.Image;
  private finishGlow?: Phaser.GameObjects.Image;

  // ── Overlays ──
  private overlayCloud!: Phaser.GameObjects.TileSprite;
  private overlayFog!: Phaser.GameObjects.Image;
  private overlayRain!: Phaser.GameObjects.TileSprite;
  private overlayWind!: Phaser.GameObjects.TileSprite;
  private overlaySun!: Phaser.GameObjects.Image;

  // ── Storm ──
  private phase = 1;
  private transitioningPhase = false;

  // ── Hazard groups ──
  private waveGroup!: Phaser.Physics.Arcade.Group;
  private debrisGroup!: Phaser.Physics.Arcade.Group;

  // ── Hazard timers ──
  private waveTimer = 0;
  private debrisTimer = 0;
  private lightning: LightningState = {
    cooldown: 4,
    phase: 'idle',
    warnX: 0,
    warnY: 0,
    warnTimer: 0
  };

  // ── Effects ──
  private wakeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private nearText!: Phaser.GameObjects.Text;
  private collectBar!: Phaser.GameObjects.Graphics;
  private collectLabel!: Phaser.GameObjects.Text;

  // ── State ──
  private isComplete = false;
  private isFailed = false;
  private elapsed = 0;
  private score = 0;

  // ── Input ──
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: SCENES.BOSS });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════

  create() {
    this.ensurePlaceholderTextures();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.resetState();
    this.createBackground();
    this.createWeather();
    this.createPlayer();
    this.createWakeEffect();
    this.createHazardGroups();
    this.createCheckpoints();
    this.createCollectionUI();
    this.setupCamera();
    this.setupInput();
    this.emitIntro();
  }

  // ──────────────────────────────────────────────────────────────────
  //  PLACEHOLDER TEXTURES
  // ──────────────────────────────────────────────────────────────────

  private ensurePlaceholderTextures() {
    const gfx = this.add.graphics();

    if (!this.textures.exists('boss_fog_overlay')) {
      gfx.clear();
      gfx.fillStyle(0x8899bb, 0.4);
      gfx.fillRect(0, 0, 128, 128);
      gfx.generateTexture('boss_fog_overlay', 128, 128);
    }
    if (!this.textures.exists('sun_rays')) {
      gfx.clear();
      gfx.fillStyle(0xffffcc, 0.25);
      gfx.fillCircle(64, 64, 60);
      gfx.fillStyle(0xffffaa, 0.12);
      gfx.fillRect(56, 0, 16, 128);
      gfx.fillRect(20, 20, 8, 88);
      gfx.fillRect(90, 30, 8, 68);
      gfx.fillRect(38, 40, 8, 48);
      gfx.fillRect(72, 25, 8, 78);
      gfx.generateTexture('sun_rays', 128, 128);
    }
    if (!this.textures.exists('boat_wake')) {
      gfx.clear();
      gfx.fillStyle(0xffffff, 0.25);
      gfx.fillRect(0, 2, 28, 4);
      gfx.fillRect(4, 0, 20, 8);
      gfx.generateTexture('boat_wake', 28, 8);
    }
    if (!this.textures.exists('foam')) {
      gfx.clear();
      gfx.fillStyle(0xffffff, 0.2);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('foam', 8, 8);
    }
    if (!this.textures.exists('water_particles')) {
      gfx.clear();
      gfx.fillStyle(0x88ccff, 0.35);
      gfx.fillCircle(3, 3, 3);
      gfx.generateTexture('water_particles', 6, 6);
    }
    if (!this.textures.exists('finish_beacon')) {
      gfx.clear();
      gfx.fillStyle(0x44ff44, 1);
      gfx.fillCircle(16, 16, 14);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(16, 16, 6);
      gfx.lineStyle(3, 0x22dd22, 1);
      gfx.strokeCircle(16, 16, 14);
      gfx.generateTexture('finish_beacon', 32, 32);
    }

    // Buoy textures — color-coded circles for missing PNGs
    for (const def of BUOY_DEFS) {
      if (!this.textures.exists(def.key)) {
        const color =
          def.type === 'temperature'
            ? 0xff4444
            : def.type === 'humidity'
              ? 0x4488ff
              : def.type === 'pressure'
                ? 0x44ff88
                : 0xffcc44;
        gfx.clear();
        gfx.fillStyle(color, 1);
        gfx.fillCircle(14, 14, 12);
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillCircle(14, 14, 5);
        gfx.lineStyle(2, 0xffffff, 0.4);
        gfx.strokeCircle(14, 14, 12);
        gfx.generateTexture(def.key, 28, 28);
      }
    }

    // Fallback boat sprite — transparent top-down research vessel
    // Used if the PNG file is missing or saved without alpha
    if (!this.textures.exists('boss_boat')) {
      gfx.clear();

      // Hull — rounded rectangle body
      gfx.fillStyle(0xf0f4f8, 1);
      gfx.fillRoundedRect(15, 70, 80, 50, 8);
      // Bow (pointed front, top of texture = forward)
      gfx.fillTriangle(55, 5, 25, 65, 85, 65);
      // Stern (flat back)
      gfx.fillRoundedRect(20, 110, 70, 16, 4);

      // Waterline stripe — PAGASA blue
      gfx.fillStyle(0x1a5276, 1);
      gfx.fillRect(22, 95, 66, 5);
      // Second accent stripe
      gfx.fillStyle(0x2980b9, 1);
      gfx.fillRect(25, 102, 60, 3);

      // Cabin (superstructure)
      gfx.fillStyle(0xd5e1eb, 1);
      gfx.fillRoundedRect(32, 50, 46, 35, 4);
      // Cabin roof
      gfx.fillStyle(0xb0c4d4, 1);
      gfx.fillRoundedRect(34, 48, 42, 6, 3);

      // Windows
      gfx.fillStyle(0x85c1e9, 1);
      gfx.fillRect(38, 58, 10, 8);
      gfx.fillRect(52, 58, 10, 8);
      gfx.fillRect(66, 58, 10, 8);

      // Radar dome
      gfx.fillStyle(0xe8e8e8, 1);
      gfx.fillCircle(55, 40, 9);
      gfx.fillStyle(0xcccccc, 1);
      gfx.fillCircle(55, 40, 6);
      gfx.fillStyle(0xaaaaaa, 1);
      gfx.fillCircle(55, 40, 3);

      // GPS antenna (mast pointing up)
      gfx.lineStyle(2, 0x888888, 1);
      gfx.beginPath();
      gfx.moveTo(55, 10);
      gfx.lineTo(55, 28);
      gfx.strokePath();
      gfx.fillStyle(0xdd4444, 1);
      gfx.fillCircle(55, 9, 3);

      // Communication antenna (rear)
      gfx.lineStyle(1.5, 0x888888, 1);
      gfx.beginPath();
      gfx.moveTo(35, 118);
      gfx.lineTo(30, 128);
      gfx.strokePath();

      // Orange life rings (port & starboard)
      gfx.fillStyle(0xff6600, 1);
      gfx.fillCircle(25, 78, 5);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(25, 78, 3);
      gfx.fillStyle(0xff6600, 1);
      gfx.fillCircle(85, 78, 5);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(85, 78, 3);

      // Deck equipment (scientific instruments)
      gfx.fillStyle(0x99aabb, 1);
      gfx.fillRect(35, 82, 8, 6);
      gfx.fillRect(67, 82, 8, 6);
      gfx.fillStyle(0xaabbcc, 1);
      gfx.fillRect(42, 84, 10, 4);

      // Bow railing
      gfx.lineStyle(1, 0x8899aa, 0.5);
      gfx.beginPath();
      gfx.moveTo(35, 35);
      gfx.lineTo(35, 45);
      gfx.lineTo(75, 45);
      gfx.lineTo(75, 35);
      gfx.strokePath();

      gfx.generateTexture('boss_boat', 110, 130);
    }

    // Custom wake particle — soft elongated oval (no PNG dependency)
    if (!this.textures.exists('wake_particle')) {
      gfx.clear();
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillEllipse(16, 6, 28, 10);
      gfx.fillStyle(0xffffff, 0.4);
      gfx.fillEllipse(16, 6, 32, 14);
      gfx.generateTexture('wake_particle', 32, 14);
    }

    // Foam splash particle (fallback)
    if (!this.textures.exists('foam')) {
      gfx.clear();
      gfx.fillStyle(0xffffff, 0.5);
      gfx.fillCircle(6, 6, 6);
      gfx.fillStyle(0xffffff, 0.25);
      gfx.fillCircle(6, 6, 8);
      gfx.generateTexture('foam', 14, 14);
    }

    gfx.destroy();
  }

  // ──────────────────────────────────────────────────────────────────
  //  RESET
  // ──────────────────────────────────────────────────────────────────

  private resetState() {
    this.speed = 0;
    this.heading = 0;
    this.lateralDrift = 0;
    this.phase = 1;
    this.transitioningPhase = false;
    this.integrity = MAX_INTEGRITY;
    this.isComplete = false;
    this.isFailed = false;
    this.elapsed = 0;
    this.score = 0;
    this.activeIdx = -1;
    this.collected = [false, false, false, false];
    this.collecting = false;
    this.collectProgress = 0;
    this.nearBuoy = false;
    this.showingFact = false;
    this.lastCheckpoint = -1;
    this.stunned = false;
    this.stunTimer = 0;
    this.buoys = [];
    this.buoyGlows = [];
    this.waveTimer = 0;
    this.debrisTimer = 0;
    this.lightning = {
      cooldown: 4,
      phase: 'idle',
      warnX: 0,
      warnY: 0,
      warnTimer: 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BACKGROUND  – Depth 0
  // ═══════════════════════════════════════════════════════════════════

  createBackground() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Single panoramic background stretched across the full world
    this.add
      .image(0, 0, 'boss_bg')
      .setOrigin(0)
      .setDepth(D.BG)
      .setDisplaySize(WORLD_W, WORLD_H);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WEATHER OVERLAYS  – Depths 1, 2, 8, 9, 11
  // ═══════════════════════════════════════════════════════════════════

  createWeather() {
    const sw = this.scale.width;
    const sh = this.scale.height;

    this.overlayCloud = this.add
      .tileSprite(0, 0, sw, sh, 'boss_cloud_overlay')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D.CLOUD)
      .setAlpha(0);

    this.overlayFog = this.add
      .image(0, 0, 'boss_fog_overlay')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D.FOG)
      .setAlpha(0)
      .setTint(0x8899bb)
      .setDisplaySize(sw, sh);

    this.overlayRain = this.add
      .tileSprite(0, 0, sw, sh, 'boss_rain_overlay')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D.RAIN)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.overlayWind = this.add
      .tileSprite(0, 0, sw, sh, 'boss_wind_overlay')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D.WIND)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.overlaySun = this.add
      .image(0, 0, 'sun_rays')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D.SUNRAYS)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(sw, sh);
  }

  updateWeather() {
    const dt = this.game.loop.delta / 1000;
    this.overlayCloud.tilePositionX += dt * 4;
    this.overlayRain.tilePositionY += dt * 30;
    this.overlayWind.tilePositionX += dt * 20;
  }

  private transitionToPhase(phase: number) {
    this.phase = phase;
    this.transitioningPhase = true;
    const t = PHASE[phase - 1];
    const dur = 2000;

    this.tweens.add({
      targets: this.overlayCloud,
      alpha: t.cloud,
      duration: dur,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.overlayFog,
      alpha: t.fog * 0.5,
      duration: dur,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.overlayRain,
      alpha: t.rain * 0.6,
      duration: dur,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.overlayWind,
      alpha: t.wind * 0.4,
      duration: dur,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.overlaySun,
      alpha: t.sun,
      duration: dur,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(dur, () => {
      this.transitioningPhase = false;
    });
    this.emitWeather();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PLAYER  – Depth 6
  // ═══════════════════════════════════════════════════════════════════

  createPlayer() {
    this.boat = this.physics.add
      .image(PLAYER_START_X, PLAYER_START_Y, 'boss_boat')
      .setDepth(D.BOAT);

    // Display size
    this.boat.displayWidth = DW_BOAT;
    this.boat.scaleY = this.boat.scaleX;

    // Physics body – collision radius 40, centered
    const body = arcadeBody(this.boat);
    body.setCircle(CR_BOAT);
    body.setOffset(
      (this.boat.displayWidth - CR_BOAT * 2) / 2,
      (this.boat.displayHeight - CR_BOAT * 2) / 2
    );
    body.collideWorldBounds = true;
  }

  updateBoat(dt: number) {
    if (this.stunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.stunned = false;
      this.speed *= FRICTION;
      this.syncVelocity();
      return;
    }

    // Steering
    if (this.keys.A.isDown || this.keys.LEFT.isDown)
      this.heading -= TURN_RATE * dt;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown)
      this.heading += TURN_RATE * dt;

    // Thrust / brake
    if (this.keys.W.isDown || this.keys.UP.isDown) {
      this.speed = Math.min(MAX_SPEED_FWD, this.speed + ACCEL * dt);
    } else if (this.keys.S.isDown || this.keys.DOWN.isDown) {
      this.speed = Math.max(-MAX_SPEED_REV, this.speed - BRAKE * dt);
    } else {
      this.speed *= FRICTION;
      if (Math.abs(this.speed) < 1) this.speed = 0;
    }

    // Convert to velocity
    this.syncVelocity();

    // Recover lateral drift
    this.lateralDrift *= DRIFT_RECOVER;

    // Sprite rotation
    this.boat.rotation = this.heading;

    // ── Forward-progress lock ──
    // Prevent the boat from sailing backward past the camera's left edge.
    // The player can steer freely but the mission always pushes rightward.
    if (this.boat.x < this.cameras.main.scrollX + 80) {
      this.boat.x = this.cameras.main.scrollX + 80;
      if (this.speed < 0) this.speed = 0;
    }
  }

  private syncVelocity() {
    const body = arcadeBody(this.boat);
    body.velocity.set(
      Math.cos(this.heading) * this.speed + this.lateralDrift,
      Math.sin(this.heading) * this.speed
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WAKE EFFECT  – Depth 5
  // ═══════════════════════════════════════════════════════════════════

  createWakeEffect() {
    this.wakeEmitter = this.add
      .particles(0, 0, 'wake_particle', {
        follow: this.boat,
        followOffset: { x: -50, y: 0 },
        speed: { min: 2, max: 8 },
        scale: { start: 1.2, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        rotate: { min: 0, max: 360 },
        lifespan: { min: 500, max: 1000 },
        frequency: 60,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      })
      .setDepth(D.WAKE);
  }

  private updateWake() {
    if (!this.wakeEmitter) return;
    const moving = Math.abs(this.speed) > 10;
    this.wakeEmitter.emitting = moving && !this.isComplete;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HAZARD PHYSICS GROUPS
  // ═══════════════════════════════════════════════════════════════════

  createHazardGroups() {
    this.waveGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.debrisGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    // Register overlap callbacks — cast to match Phaser's internal union type
    this.physics.add.overlap(
      this.boat,
      this.waveGroup,
      this.onWaveOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.boat,
      this.debrisGroup,
      this.onDebrisOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CHECKPOINTS  – Depth 3
  // ═══════════════════════════════════════════════════════════════════

  createCheckpoints() {
    for (const def of BUOY_DEFS) {
      const sprite = this.physics.add
        .image(def.x, def.y, def.key)
        .setDepth(D.BUOYS)
        .setVisible(false)
        .setAlpha(0);
      sprite.displayWidth = DW_BUOY;
      sprite.scaleY = sprite.scaleX;
      const body = arcadeBody(sprite);
      body.setCircle(CR_BUOY);
      body.setOffset(
        (sprite.displayWidth - CR_BUOY * 2) / 2,
        (sprite.displayHeight - CR_BUOY * 2) / 2
      );
      this.buoys.push(sprite);

      const glow = this.add
        .image(def.x, def.y, 'lightning_warning')
        .setDepth(D.BUOYS - 0.5)
        .setScale(1.5)
        .setVisible(false)
        .setAlpha(0)
        .setTint(0x44ff44);
      this.buoyGlows.push(glow);
    }
  }

  private activateCheckpoint(index: number) {
    this.activeIdx = index;
    this.collecting = false;
    this.collectProgress = 0;
    this.nearBuoy = false;

    if (index >= BUOY_DEFS.length) {
      this.activateFinishBeacon();
      return;
    }

    const sprite = this.buoys[index];
    const glow = this.buoyGlows[index];
    sprite.setVisible(true).setAlpha(0);
    glow.setVisible(true).setAlpha(0);

    this.tweens.add({
      targets: [sprite, glow],
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.updateObjectiveDisplay();
  }

  private activateFinishBeacon() {
    this.activeIdx = BUOY_DEFS.length;

    this.finishBeacon = this.physics.add
      .image(FINISH_X, FINISH_Y, 'finish_beacon')
      .setDepth(D.BUOYS)
      .setAlpha(0);
    this.finishBeacon.displayWidth = DW_FINISH;
    this.finishBeacon.scaleY = this.finishBeacon.scaleX;
    const body = arcadeBody(this.finishBeacon);
    body.setCircle(40);
    body.setOffset(
      (this.finishBeacon.displayWidth - 80) / 2,
      (this.finishBeacon.displayHeight - 80) / 2
    );

    this.finishGlow = this.add
      .image(FINISH_X, FINISH_Y, 'lightning_warning')
      .setDepth(D.BUOYS - 0.5)
      .setScale(2)
      .setAlpha(0)
      .setTint(0xffff44);

    this.tweens.add({
      targets: [this.finishBeacon, this.finishGlow],
      alpha: 1,
      duration: 1000,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.finishGlow,
      alpha: 0.3,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.transitionToPhase(5);
    this.updateObjectiveDisplay();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COLLECTION UI  – Depth 20
  // ═══════════════════════════════════════════════════════════════════

  createCollectionUI() {
    this.nearText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '[E] Collect', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#44ff88',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD)
      .setVisible(false);

    this.collectBar = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(D.HUD)
      .setVisible(false);

    this.collectLabel = this.add
      .text(GAME_WIDTH / 2, 580, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD)
      .setVisible(false);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MISSION UPDATE
  // ═══════════════════════════════════════════════════════════════════

  updateMission() {
    if (this.showingFact) return;

    // Proximity to active data buoy
    if (this.activeIdx >= 0 && this.activeIdx < BUOY_DEFS.length) {
      const sprite = this.buoys[this.activeIdx];
      const def = BUOY_DEFS[this.activeIdx];
      const dist = Phaser.Math.Distance.Between(
        this.boat.x,
        this.boat.y,
        sprite.x,
        sprite.y
      );

      if (dist < BUOY_ACTIVATE_RADIUS) {
        if (!this.collecting) {
          this.nearBuoy = true;
          this.nearText
            .setVisible(true)
            .setText(`[E] Collect ${def.label} Data`);
        }
      } else {
        this.nearBuoy = false;
        this.nearText.setVisible(false);
        if (this.collecting) this.cancelCollection();
      }
    }

    // Finish beacon proximity
    if (this.activeIdx === BUOY_DEFS.length && this.finishBeacon) {
      const dist = Phaser.Math.Distance.Between(
        this.boat.x,
        this.boat.y,
        this.finishBeacon.x,
        this.finishBeacon.y
      );
      if (dist < EYE_FINISH_RADIUS) this.completeLevel();
    }

    if (this.collecting) this.updateCollectionProgress();
  }

  startCollection() {
    if (
      this.collecting ||
      this.activeIdx < 0 ||
      this.activeIdx >= BUOY_DEFS.length
    )
      return;
    this.collecting = true;
    this.collectProgress = 0;
    this.nearText.setVisible(false);
    this.collectBar.setVisible(true);
    this.collectLabel
      .setVisible(true)
      .setText(`Collecting ${BUOY_DEFS[this.activeIdx].label} data...`);
  }

  private cancelCollection() {
    this.collecting = false;
    this.collectProgress = 0;
    this.collectBar.setVisible(false);
    this.collectLabel.setVisible(false);
  }

  private updateCollectionProgress() {
    const dt = this.game.loop.delta / 1000;
    this.collectProgress += dt;
    const pct = Math.min(this.collectProgress / COLLECT_TIME, 1);

    this.collectBar.clear();
    this.collectBar.fillStyle(0x111a2a, 0.85);
    this.collectBar.fillRect(GAME_WIDTH / 2 - 100, 600, 200, 18);
    this.collectBar.fillStyle(0x44ff88, 1);
    this.collectBar.fillRect(GAME_WIDTH / 2 - 100, 600, 200 * pct, 18);
    this.collectBar.lineStyle(2, 0xffffff, 0.5);
    this.collectBar.strokeRect(GAME_WIDTH / 2 - 100, 600, 200, 18);

    if (pct >= 1) this.completeCollecting();
  }

  private completeCollecting() {
    const idx = this.activeIdx;
    if (idx < 0 || idx >= BUOY_DEFS.length) return;

    this.collecting = false;
    this.collectBar.setVisible(false);
    this.collectLabel.setVisible(false);
    this.collected[idx] = true;
    this.lastCheckpoint = idx;
    this.score += 500;
    this.emitScore();

    // Buoy disappears
    const sprite = this.buoys[idx];
    const glow = this.buoyGlows[idx];
    this.tweens.add({
      targets: [sprite, glow],
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        sprite.setVisible(false);
        glow.setVisible(false);
      }
    });
    this.spawnSplash(BUOY_DEFS[idx].x, BUOY_DEFS[idx].y);

    // Minor health restore on collection
    this.integrity = Math.min(MAX_INTEGRITY, this.integrity + 5);
    this.emitHealth();

    // Advance storm phase
    const nextPhase = idx + 2;
    if (nextPhase <= 4) this.transitionToPhase(nextPhase);

    this.showEducationalFact(idx);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EDUCATIONAL FACTS
  // ═══════════════════════════════════════════════════════════════════

  private showEducationalFact(index: number) {
    this.showingFact = true;
    const def = BUOY_DEFS[index];

    const bg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 300, 0x0a1628, 0.95)
      .setScrollFactor(0)
      .setDepth(D.HUD)
      .setStrokeStyle(2, 0x4488ff);

    const title = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 100,
        `${def.label} Data Collected!`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: '#44ff88'
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD);

    const body = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, `"${def.fact}"`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#ccddff',
        wordWrap: { width: 540 },
        align: 'center',
        lineSpacing: 4
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD);

    const btn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '[ Continue ]', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#88bbff'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD)
      .setInteractive({ useHandCursor: true });

    const container = this.add.container(0, 0, [bg, title, body, btn]);
    this.game.events.emit(GAME_EVENTS.FACT_UNLOCKED, {
      factId: `boss_${def.type}`
    });

    btn.on('pointerdown', () => {
      container.destroy(true);
      this.showingFact = false;
      this.activateCheckpoint(index + 1);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HAZARDS — WAVES  (Depth 7)
  // ═══════════════════════════════════════════════════════════════════

  private spawnWave() {
    if (this.phase < 1 || this.phase === 5) return;

    const cam = this.cameras.main;
    const edge = Phaser.Math.Between(0, 3);
    let x: number, y: number, vx: number, vy: number;
    const spd = WAVE_BASE_SPEED + this.phase * 25;

    switch (edge) {
      case 0:
        x = Phaser.Math.Between(
          cam.scrollX - 80,
          cam.scrollX + GAME_WIDTH + 80
        );
        y = cam.scrollY - 60;
        vx = (Math.random() - 0.5) * spd * 0.6;
        vy = spd / 2;
        break;
      case 1:
        x = Phaser.Math.Between(
          cam.scrollX - 80,
          cam.scrollX + GAME_WIDTH + 80
        );
        y = cam.scrollY + GAME_HEIGHT + 60;
        vx = (Math.random() - 0.5) * spd * 0.6;
        vy = -spd / 2;
        break;
      case 2:
        x = cam.scrollX - 60;
        y = Phaser.Math.Between(
          cam.scrollY - 60,
          cam.scrollY + GAME_HEIGHT + 60
        );
        vx = spd;
        vy = (Math.random() - 0.5) * spd * 0.3;
        break;
      default:
        x = cam.scrollX + GAME_WIDTH + 60;
        y = Phaser.Math.Between(
          cam.scrollY - 60,
          cam.scrollY + GAME_HEIGHT + 60
        );
        vx = -spd;
        vy = (Math.random() - 0.5) * spd * 0.3;
        break;
    }

    const tex = Math.random() > 0.5 ? 'boss_wave_large' : 'boss_wave_small';
    const isLarge = tex === 'boss_wave_large';
    const wave = this.waveGroup.create(
      x,
      y,
      tex
    ) as Phaser.Physics.Arcade.Image;
    wave.setDepth(D.WAVES).setAlpha(0.7);
    wave.displayWidth = isLarge ? DW_WAVE_LARGE : DW_WAVE_SMALL;
    wave.scaleY = wave.scaleX;
    const waveBody = arcadeBody(wave);
    waveBody.setCircle(isLarge ? CR_WAVE_LARGE : CR_WAVE_SMALL);
    waveBody.velocity.set(vx, vy);

    const lifetime = 8000 + Math.random() * 4000;
    this.time.delayedCall(lifetime, () => {
      this.tweens.add({
        targets: wave,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          if (wave.active) wave.destroy();
        }
      });
    });
  }

  private onWaveOverlap(_boat: PhysOverlapObj, _wave: PhysOverlapObj) {
    if (this.stunned || this.phase === 5 || this.isComplete) return;
    const wave = _wave as Phaser.Physics.Arcade.Image;
    const waveBody = arcadeBody(wave);
    const vx = waveBody.velocity.x;
    const vy = waveBody.velocity.y;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;

    const boatBody = arcadeBody(this.boat);
    boatBody.velocity.x += (vy / len) * 120;
    boatBody.velocity.y += (-vx / len) * 120;
    this.speed *= 0.85;

    this.damageBoat(DMG.WAVE);
    this.spawnSplash(wave.x, wave.y);

    this.tweens.add({
      targets: wave,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 250,
      onComplete: () => {
        if (wave.active) wave.destroy();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HAZARDS — DEBRIS  (Depth 4)
  // ═══════════════════════════════════════════════════════════════════

  private spawnDebris() {
    if (this.phase < 2 || this.phase === 5) return;

    let available: DebrisKind[];
    if (this.phase === 2) available = ['debris_log'];
    else if (this.phase === 3) available = ['debris_log', 'debris_barrel'];
    else available = ['debris_log', 'debris_barrel', 'debris_crate'];

    const kind = available[Math.floor(Math.random() * available.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 250 + Math.random() * 350;
    const sx = Phaser.Math.Clamp(
      this.boat.x + Math.cos(angle) * dist,
      30,
      WORLD_W - 30
    );
    const sy = Phaser.Math.Clamp(
      this.boat.y + Math.sin(angle) * dist,
      50,
      WORLD_H - 50
    );

    const sprite = this.debrisGroup.create(
      sx,
      sy,
      kind
    ) as Phaser.Physics.Arcade.Image;
    sprite.setDepth(D.HAZARDS);
    sprite.displayWidth =
      kind === 'debris_log'
        ? DW_LOG
        : kind === 'debris_barrel'
          ? DW_BARREL
          : DW_CRATE;
    sprite.scaleY = sprite.scaleX;
    const body = arcadeBody(sprite);
    body.setCircle(
      kind === 'debris_log'
        ? CR_LOG
        : kind === 'debris_barrel'
          ? CR_BARREL
          : CR_CRATE
    );

    // Slight drift
    body.velocity.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);

    this.time.delayedCall(20000, () => this.despawnDebris(sprite));
  }

  private despawnDebris(sprite: Phaser.Physics.Arcade.Image) {
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (sprite.active) sprite.destroy();
      }
    });
  }

  private onDebrisOverlap(_boat: PhysOverlapObj, _debris: PhysOverlapObj) {
    if (this.stunned || this.phase === 5 || this.isComplete) return;
    const sprite = _debris as Phaser.Physics.Arcade.Image;

    // Determine damage based on texture key
    let dmg: number;
    if (sprite.texture.key === 'debris_log') dmg = DMG.LOG;
    else if (sprite.texture.key === 'debris_barrel') dmg = DMG.BARREL;
    else dmg = DMG.CRATE;

    this.damageBoat(dmg);
    this.spawnSplash(sprite.x, sprite.y);

    // Bounce boat
    const pushAngle = Math.atan2(
      sprite.y - this.boat.y,
      sprite.x - this.boat.x
    );
    const boatBody = arcadeBody(this.boat);
    boatBody.velocity.x -= Math.cos(pushAngle) * 80;
    boatBody.velocity.y -= Math.sin(pushAngle) * 80;
    this.speed = Math.max(-50, this.speed - 60);

    this.despawnDebris(sprite);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HAZARDS — LIGHTNING  (Depth 10)
  // ═══════════════════════════════════════════════════════════════════

  private updateLightning(dt: number) {
    if (this.phase < 4 || this.phase === 5) {
      this.lightning.phase = 'idle';
      this.lightning.cooldown = 3;
      return;
    }

    switch (this.lightning.phase) {
      case 'idle':
        this.lightning.cooldown -= dt;
        if (this.lightning.cooldown <= 0) {
          this.lightning.phase = 'warning';
          this.lightning.warnTimer = LIGHTNING_WARN_DUR;
          this.lightning.cooldown = 5 + Math.random() * 4;

          const ox = (Math.random() - 0.5) * 350;
          const oy = (Math.random() - 0.5) * 250;
          this.lightning.warnX = Phaser.Math.Clamp(
            this.boat.x + ox,
            30,
            WORLD_W - 30
          );
          this.lightning.warnY = Phaser.Math.Clamp(
            this.boat.y + oy,
            40,
            WORLD_H - 40
          );

          this.lightning.warningSprite = this.add
            .image(
              this.lightning.warnX,
              this.lightning.warnY,
              'lightning_warning'
            )
            .setDepth(D.LIGHTNING)
            .setAlpha(0)
            .setScale(0.5);
          this.tweens.add({
            targets: this.lightning.warningSprite,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 250,
            ease: 'Sine.easeOut'
          });
        }
        break;

      case 'warning':
        this.lightning.warnTimer -= dt;
        if (this.lightning.warningSprite) {
          this.lightning.warningSprite.setAlpha(
            0.5 + Math.sin(this.lightning.warnTimer * 14) * 0.5
          );
        }
        if (this.lightning.warnTimer <= 0) this.executeLightningStrike();
        break;

      case 'cooldown':
        this.lightning.warnTimer -= dt;
        if (this.lightning.warnTimer <= 0) this.lightning.phase = 'idle';
        break;
    }
  }

  private executeLightningStrike() {
    this.lightning.phase = 'strike';
    if (this.lightning.warningSprite) {
      this.lightning.warningSprite.destroy();
      this.lightning.warningSprite = undefined;
    }

    // Bolt sprite
    this.lightning.boltSprite = this.add
      .image(
        this.lightning.warnX,
        this.lightning.warnY,
        'boss_lightning_strike'
      )
      .setDepth(D.LIGHTNING)
      .setAlpha(1);
    this.lightning.boltSprite.displayWidth = DW_LIGHTNING_STRIKE;
    this.lightning.boltSprite.scaleY = this.lightning.boltSprite.scaleX;

    // Screen flash
    const flash = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0xffffff,
        0.35
      )
      .setScrollFactor(0)
      .setDepth(D.LIGHTNING + 1);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy()
    });

    // Fade bolt
    this.tweens.add({
      targets: this.lightning.boltSprite,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (this.lightning.boltSprite) {
          this.lightning.boltSprite.destroy();
          this.lightning.boltSprite = undefined;
        }
      }
    });

    this.cameras.main.shake(300, 0.008);

    // Damage check (distance-based, not physics overlap, since it's an area effect)
    const dist = Phaser.Math.Distance.Between(
      this.boat.x,
      this.boat.y,
      this.lightning.warnX,
      this.lightning.warnY
    );
    if (dist < LIGHTNING_STRIKE_RADIUS) {
      this.damageBoat(DMG.LIGHTNING);
      this.stunned = true;
      this.stunTimer = 0.5;
    }

    this.lightning.phase = 'cooldown';
    this.lightning.warnTimer = 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DAMAGE & RESPAWN
  // ═══════════════════════════════════════════════════════════════════

  private damageBoat(amount: number) {
    if (this.phase === 5 || this.isFailed || this.isComplete) return;
    this.integrity = Math.max(0, this.integrity - amount);
    this.emitHealth();
    this.cameras.main.shake(180, 0.006 * (amount / 25));
    this.boat.setTint(0xff4444);
    this.time.delayedCall(180, () => {
      if (this.boat.active) this.boat.clearTint();
    });
    if (this.integrity <= 0) this.failMission();
  }

  private failMission() {
    if (this.isFailed || this.isComplete) return;
    this.isFailed = true;

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail',
      title: 'Vessel Damaged',
      subtitle: 'Returning to last checkpoint...',
      score: this.score,
      stars: 0,
      levelId: 'boss',
      timeUsed: this.elapsed,
      factsUnlocked: []
    } satisfies HUDResultPayload);

    this.time.delayedCall(2000, () => this.respawnAtCheckpoint());
  }

  private respawnAtCheckpoint() {
    this.isFailed = false;
    this.integrity = MAX_INTEGRITY;
    this.emitHealth();
    this.stunned = false;

    let rx = PLAYER_START_X,
      ry = PLAYER_START_Y;
    if (this.lastCheckpoint >= 0 && this.lastCheckpoint < BUOY_DEFS.length) {
      rx = BUOY_DEFS[this.lastCheckpoint].x + 100;
      ry = BUOY_DEFS[this.lastCheckpoint].y;
    }

    this.boat.setPosition(rx, ry);
    this.speed = 0;
    this.lateralDrift = 0;
    this.heading = 0;
    this.boat.rotation = 0;
    arcadeBody(this.boat).velocity.set(0, 0);

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SPLASH / EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  private spawnSplash(x: number, y: number) {
    const tex = this.textures.exists('water_particles')
      ? 'water_particles'
      : 'boss_splash';
    for (let i = 0; i < 6; i++) {
      const p = this.add
        .image(x, y, tex)
        .setDepth(D.WAVES + 0.5)
        .setAlpha(0.8);
      p.displayWidth = DW_WATER_PARTICLE;
      p.scaleY = p.scaleX;
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 350 + Math.random() * 200,
        ease: 'Sine.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CAMERA
  // ═══════════════════════════════════════════════════════════════════

  setupCamera() {
    this.cameras.main.startFollow(this.boat, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(-300, 0);
    this.cameras.main.setZoom(1);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════════════════════════════════

  setupInput() {
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    };

    this.input.keyboard!.on('keydown-E', () => {
      if (this.nearBuoy && !this.collecting && !this.showingFact)
        this.startCollection();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HUD EMITTERS
  // ═══════════════════════════════════════════════════════════════════

  private emitIntro() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Ride the Storm',
      description:
        'Navigate your research vessel through the typhoon to collect weather data!'
    } satisfies HUDLevelInfoPayload);
    this.emitHealth();
    this.emitScore();
    this.time.delayedCall(1500, () => this.activateCheckpoint(0));
  }

  private emitHealth() {
    this.game.events.emit(GAME_EVENTS.HUD_HEALTH, {
      current: this.integrity,
      max: MAX_INTEGRITY,
      label: 'Boat Integrity'
    } satisfies HUDHealthPayload);
  }

  private emitScore() {
    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: this.score,
      label: 'Research Data'
    } satisfies HUDScorePayload);
  }

  private emitWeather() {
    this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
      temperature: 28 - this.phase * 2,
      humidity: 60 + this.phase * 9,
      windSpeed: 20 + this.phase * 40,
      stormLevel: this.phase === 5 ? 0 : this.phase
    } satisfies HUDWeatherPayload);
  }

  private updateObjectiveDisplay() {
    if (this.activeIdx >= 0 && this.activeIdx < BUOY_DEFS.length) {
      this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
        text: `Collect ${BUOY_DEFS[this.activeIdx].label} Data`,
        progress: this.collected.filter(Boolean).length,
        target: 4
      } satisfies HUDObjectivePayload);
    } else if (this.activeIdx === BUOY_DEFS.length) {
      this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
        text: 'Reach the Eye of the Typhoon',
        progress: 4,
        target: 4
      } satisfies HUDObjectivePayload);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MISSION COMPLETE
  // ═══════════════════════════════════════════════════════════════════

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const timeBonus = Math.max(0, Math.floor(3000 - this.elapsed * 8));
    this.score += timeBonus;
    const finalScore = this.score;
    const stars = finalScore >= 4000 ? 3 : finalScore >= 2500 ? 2 : 1;

    // Weather fades
    this.transitionToPhase(5);

    this.cameras.main.flash(600, 255, 255, 255);
    this.cameras.main.shake(400, 0.004);

    // Particle burst
    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 60, () => {
        this.spawnSplash(
          this.boat.x + (Math.random() - 0.5) * 150,
          this.boat.y + (Math.random() - 0.5) * 100
        );
      });
    }

    // Mission Complete title
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'MISSION COMPLETE', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#ffdd44',
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D.HUD + 1)
      .setAlpha(0);
    this.tweens.add({
      targets: title,
      alpha: 1,
      y: GAME_HEIGHT / 2 - 100,
      duration: 1000,
      ease: 'Back.easeOut'
    });

    // Subtitle message
    this.time.delayedCall(1800, () => {
      const msg = this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 20,
          'Excellent work!\n\nYou successfully collected weather observations\ninside a tropical cyclone.\n\nThe information gathered helps meteorologists\nunderstand how typhoons develop\nand improve future forecasts.',
          {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#ccddff',
            align: 'center',
            lineSpacing: 6,
            stroke: '#000000',
            strokeThickness: 2
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(D.HUD + 1)
        .setAlpha(0);
      this.tweens.add({
        targets: msg,
        alpha: 1,
        duration: 800,
        ease: 'Sine.easeInOut'
      });

      this.time.delayedCall(4000, () => {
        this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
          type: 'complete',
          title: 'Mission Complete',
          subtitle:
            'You successfully navigated the typhoon and collected all weather data!',
          score: finalScore,
          stars,
          levelId: 'boss',
          timeUsed: this.elapsed,
          factsUnlocked: BUOY_DEFS.map(d => `boss_${d.type}`)
        } satisfies HUDResultPayload);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  update(_time: number, delta: number) {
    if (this.isComplete || this.showingFact) return;

    const dt = Math.min(delta / 1000, 0.05);
    this.elapsed += dt;

    // Debug: log position once per second
    if (Math.floor(this.elapsed) !== Math.floor(this.elapsed - dt)) {
      const cam = this.cameras.main;
      const sx = this.boat.x - cam.scrollX;
      const sy = this.boat.y - cam.scrollY;
      console.log(
        `boat: (${Math.round(this.boat.x)}, ${Math.round(this.boat.y)}) | screen: (${Math.round(sx)}, ${Math.round(sy)}) | camera: (${Math.round(cam.scrollX)}, ${Math.round(cam.scrollY)})`
      );
    }

    this.updateBoat(dt);
    this.updateWeather();
    this.updateMission();
    this.updateWake();

    if (!this.transitioningPhase && this.phase < 5) {
      // Spawn waves on timer
      this.waveTimer += delta;
      if (
        this.waveTimer >=
        WAVE_SPAWN_INTERVAL_BASE / Math.max(1, this.phase * 0.6)
      ) {
        this.waveTimer = 0;
        this.spawnWave();
      }

      // Spawn debris on timer
      this.debrisTimer += delta;
      if (this.phase >= 2 && this.debrisTimer >= 4000 / (this.phase * 0.5)) {
        this.debrisTimer = 0;
        this.spawnDebris();
      }

      this.updateLightning(dt);
    }

    // Periodic weather HUD
    if (Math.floor(this.elapsed * 2) !== Math.floor((this.elapsed - dt) * 2)) {
      this.emitWeather();
    }
  }

  shutdown() {
    this.wakeEmitter?.destroy();
  }
}
