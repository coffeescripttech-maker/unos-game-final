import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDTimerPayload,
  HUDObjectivePayload,
  HUDResultPayload,
  HUDLevelInfoPayload,
  HUDHealthPayload,
  HUDScorePayload,
  HUDWeatherPayload,
} from '@shared/events';
import { FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════

interface Hazard {
  gfx: Phaser.GameObjects.Graphics;
  type: 'lightning' | 'wave' | 'wind' | 'debris' | 'rain';
  vx: number;
  vy: number;
  active: boolean;
  rot: number;
  rotSpeed: number;
}

interface WaveConfig {
  name: string;
  subtitle: string;
  color: string;
  duration: number;
  hazards: ('lightning' | 'wave' | 'wind' | 'debris' | 'rain')[];
  spawnRate: number;
  intensity: number;
}

interface SmokeParticle {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// ═══════════════════════════════════════════════
//  SCENE
// ═══════════════════════════════════════════════

export class BossScene extends Phaser.Scene {
  // ── Core state ──
  private shipHealth = 100;
  private bossHealth = 100;
  private maxHealth = 100;
  private totalTime = 120;
  private timeRemaining = 120;
  private isComplete = false;
  private currentWave = 0;
  private bossDefeated = false;
  private gameStarted = false;

  // ── Ship ──
  private shipX = GAME_WIDTH / 2;
  private shipY = GAME_HEIGHT - 120;
  private shipGfx!: Phaser.GameObjects.Graphics;
  private shipDamageGfx!: Phaser.GameObjects.Graphics;
  private smokeParticles: SmokeParticle[] = [];
  private fireParticles: SmokeParticle[] = [];

  // ── Ocean ──
  private oceanGfx!: Phaser.GameObjects.Graphics;
  private oceanTime = 0;
  private foamParticles: Phaser.GameObjects.Arc[] = [];

  // ── Boss Typhoon (background) ──
  private typhoonGfx!: Phaser.GameObjects.Graphics;
  private typhoonGlowGfx!: Phaser.GameObjects.Graphics;
  private stormTime = 0;

  // ── Hazards ──
  private hazards: Hazard[] = [];
  private waveTimer!: Phaser.Time.TimerEvent;
  private lightningBolts: Phaser.GameObjects.Graphics[] = [];

  // ── Atmosphere ──
  private darkOverlay!: Phaser.GameObjects.Graphics;
  private lightningFlashGfx!: Phaser.GameObjects.Graphics;
  private fogGfx!: Phaser.GameObjects.Graphics;
  private bgColor = 0x050510;

  // ── Info ──
  private infoText!: Phaser.GameObjects.Text;
  private wavePhaseGfx!: Phaser.GameObjects.Graphics;

  // ── Wave Configs ──
  private waves: WaveConfig[] = [
    {
      name: 'Gathering Storm',
      subtitle: 'Rain and wind sweep the deck',
      color: '#6DB3E6',
      duration: 30,
      hazards: ['rain', 'wind'],
      spawnRate: 700,
      intensity: 0.3,
    },
    {
      name: 'Rough Seas',
      subtitle: 'Giant waves batter the hull',
      color: '#FF8C00',
      duration: 35,
      hazards: ['wave', 'rain', 'wind', 'debris'],
      spawnRate: 500,
      intensity: 0.6,
    },
    {
      name: 'Eye of the Typhoon',
      subtitle: 'The full fury of the storm',
      color: '#D62828',
      duration: 40,
      hazards: ['lightning', 'wave', 'wind', 'debris', 'rain'],
      spawnRate: 280,
      intensity: 1.0,
    },
  ];

  constructor() {
    super({ key: SCENES.BOSS });
  }

  // ═══════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════

  create() {
    this.cameras.main.fadeIn(600);
    this.resetState();
    this.buildBackground();
    this.buildAtmosphere();
    this.buildTyphoonBackground();
    this.buildShip();
    this.buildUI();
    this.setupInput();
    this.setupTimers();
    this.setupEventListeners();
    this.showWaveIntro(0);
  }

  private resetState() {
    this.isComplete = false;
    this.gameStarted = true;
    this.hazards = [];
    this.shipHealth = 100;
    this.bossHealth = 100;
    this.maxHealth = 100;
    this.currentWave = 0;
    this.bossDefeated = false;
    this.timeRemaining = this.totalTime;
    this.stormTime = 0;
    this.oceanTime = 0;
    this.smokeParticles = [];
    this.fireParticles = [];
    this.foamParticles = [];
    this.lightningBolts = [];
    this.bgColor = 0x050510;
  }

  private buildBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x0a0a20, 0x1a0a0a, 0x0a0515);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(DEPTH.BG);

    this.oceanGfx = this.add.graphics().setDepth(DEPTH.BG + 1);
  }

  private buildAtmosphere() {
    // Dark overlay — intensifies as boss HP drops
    this.darkOverlay = this.add.graphics().setDepth(DEPTH.BG + 2);
    this.darkOverlay.fillStyle(0x000000, 0);
    this.darkOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Lightning flash overlay
    this.lightningFlashGfx = this.add.graphics().setDepth(DEPTH.UI + 1);
    this.lightningFlashGfx.fillStyle(0xffffff, 0);
    this.lightningFlashGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Fog / mist layer
    this.fogGfx = this.add.graphics().setDepth(DEPTH.BG + 3);
  }

  private buildTyphoonBackground() {
    this.typhoonGfx = this.add.graphics().setDepth(DEPTH.BG + 5);
    this.typhoonGlowGfx = this.add.graphics().setDepth(DEPTH.BG + 4);
  }

  private buildShip() {
    this.shipGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);
    this.shipDamageGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS + 1);
  }

  private buildUI() {
    // Title
    this.add
      .text(GAME_WIDTH / 2, 16, '⚡ Ride the Storm ⚡', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '20px',
        color: '#D62828',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY);

    // Wave info text (centered, for announcements)
    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '32px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0);

    // Wave phase graphic
    this.wavePhaseGfx = this.add.graphics().setDepth(DEPTH.OVERLAY - 1);

    // Emit level info
    this.game.events.emit(
      GAME_EVENTS.HUD_LEVEL_INFO,
      {
        name: 'Ride the Storm',
        description: 'Survive the typhoon in your research vessel!',
      } satisfies HUDLevelInfoPayload
    );
    this.emitObjective();
    this.emitHealth();
  }

  private setupInput() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.shipX = Phaser.Math.Clamp(pointer.x, 50, GAME_WIDTH - 50);
      this.shipY = Phaser.Math.Clamp(pointer.y, GAME_HEIGHT * 0.45, GAME_HEIGHT - 50);
    });
  }

  private setupTimers() {
    // Timer tick
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.game.events.emit(
          GAME_EVENTS.HUD_TIMER,
          { remaining: this.timeRemaining, total: this.totalTime } satisfies HUDTimerPayload
        );

        // Weather data
        const wp = 1 - this.bossHealth / this.maxHealth;
        this.game.events.emit(
          GAME_EVENTS.HUD_WEATHER,
          {
            temperature: 22 + Math.round(this.currentWave * 4),
            humidity: 75 + Math.round(wp * 25),
            windSpeed: Math.round(30 + this.currentWave * 30 + wp * 50),
            stormLevel: Math.min(5, this.currentWave + 2 + Math.floor(wp * 2)),
          } satisfies HUDWeatherPayload
        );

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    // Ocean splash spawner
    this.time.addEvent({
      delay: 400,
      callback: () => this.spawnFoam(),
      loop: true,
    });

    // Smoke/fire update
    this.time.addEvent({
      delay: 200,
      callback: () => this.updateShipDamage(),
      loop: true,
    });
  }

  private setupEventListeners() {
    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

  // ═══════════════════════════════════════════════
  //  WAVE SYSTEM
  // ═══════════════════════════════════════════════

  private showWaveIntro(waveIndex: number) {
    if (waveIndex >= this.waves.length) {
      this.victory();
      return;
    }
    if (this.isComplete) return;

    this.currentWave = waveIndex;
    const wave = this.waves[waveIndex];
    this.emitObjective();

    // Wave phase border flash
    this.wavePhaseGfx.clear();
    this.wavePhaseGfx.lineStyle(4, Phaser.Display.Color.HexStringToColor(wave.color).color, 0.8);
    this.wavePhaseGfx.strokeRect(4, 4, GAME_WIDTH - 8, GAME_HEIGHT - 8);
    this.tweens.add({
      targets: this.wavePhaseGfx,
      alpha: { from: 1, to: 0 },
      duration: 3000,
      ease: 'Quad.easeOut',
    });

    // Announce with dramatic scale-in
    this.infoText.setText(`${wave.name}\n${wave.subtitle}`);
    this.infoText.setColor(wave.color).setAlpha(1).setScale(0.01);
    this.tweens.add({
      targets: this.infoText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.infoText,
          alpha: 0,
          delay: 1500,
          duration: 400,
        });
      },
    });

    // Screen pulse on wave start
    this.cameras.main.flash(400, 100, 100, 200, false);

    this.time.delayedCall(2500, () => this.startWave(waveIndex));
  }

  private startWave(waveIndex: number) {
    if (this.isComplete) return;
    const wave = this.waves[waveIndex];
    this.emitObjective();

    this.waveTimer = this.time.addEvent({
      delay: wave.spawnRate,
      callback: () => this.spawnHazard(wave),
      loop: true,
    });

    this.time.delayedCall(wave.duration * 1000, () => {
      if (this.isComplete) return;
      this.waveTimer.remove();
      // Clean up leftover hazards
      this.hazards.forEach((h) => {
        if (h.active) {
          h.gfx.destroy();
          h.active = false;
        }
      });
      this.hazards = [];
      this.showWaveIntro(waveIndex + 1);
    });
  }

  private emitObjective() {
    this.game.events.emit(
      GAME_EVENTS.HUD_OBJECTIVE,
      {
        text:
          this.currentWave < this.waves.length
            ? `Survive: ${this.waves[this.currentWave].name}`
            : 'All waves cleared!',
        progress: this.currentWave + 1,
        target: this.waves.length,
      } satisfies HUDObjectivePayload
    );
  }

  private emitHealth() {
    this.game.events.emit(
      GAME_EVENTS.HUD_HEALTH,
      { current: this.shipHealth, max: this.maxHealth, label: 'Ship' } satisfies HUDHealthPayload
    );
    this.game.events.emit(
      GAME_EVENTS.HUD_HEALTH,
      { current: this.bossHealth, max: this.maxHealth, label: 'Storm' } satisfies HUDHealthPayload
    );
  }

  // ═══════════════════════════════════════════════
  //  HAZARD SPAWNING
  // ═══════════════════════════════════════════════

  private spawnHazard(wave: WaveConfig) {
    if (this.isComplete) return;
    const type = Phaser.Utils.Array.GetRandom(wave.hazards);
    let x: number, y: number, vx: number, vy: number;

    switch (type) {
      case 'lightning':
        x = Phaser.Math.Between(80, GAME_WIDTH - 80);
        y = 0;
        vx = 0;
        vy = Phaser.Math.Between(300, 500);
        break;
      case 'wave':
        x = Math.random() > 0.5 ? -20 : GAME_WIDTH + 20;
        y = GAME_HEIGHT - Phaser.Math.Between(60, 140);
        vx = (x < 0 ? 1 : -1) * Phaser.Math.Between(100, 220);
        vy = Phaser.Math.Between(-30, 10);
        break;
      case 'wind':
        x = -20;
        y = Phaser.Math.Between(80, GAME_HEIGHT - 120);
        vx = Phaser.Math.Between(200, 400) * (1 + wave.intensity * 0.5);
        vy = Phaser.Math.Between(-50, 50);
        break;
      case 'debris':
        x = Phaser.Math.Between(50, GAME_WIDTH - 50);
        y = -20;
        vx = Phaser.Math.Between(-120, 120);
        vy = Phaser.Math.Between(150, 350);
        break;
      default:
        x = Phaser.Math.Between(0, GAME_WIDTH);
        y = -10;
        vx = Phaser.Math.Between(-30, 30);
        vy = Phaser.Math.Between(300, 500);
        break;
    }

    const gfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);
    const hazard: Hazard = {
      gfx,
      type,
      vx,
      vy,
      active: true,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
    };

    // Draw the hazard shape
    this.drawHazardShape(gfx, type, wave.intensity);

    // Lightning special: flash + bolt
    if (type === 'lightning') {
      this.flashLightning(x);
    }

    this.hazards.push(hazard);

    // Auto-destroy after 5s
    this.time.delayedCall(5000, () => {
      if (hazard.active) {
        hazard.active = false;
        hazard.gfx.destroy();
      }
    });
  }

  private drawHazardShape(gfx: Phaser.GameObjects.Graphics, type: string, intensity: number) {
    const i = intensity;

    switch (type) {
      case 'lightning':
        // Bolt core — will be drawn at position in update
        gfx.lineStyle(3, 0xffffaa, 1);
        break;
      case 'wave': {
        // Large crest shape
        const w = 30 + i * 30;
        const h = 8 + i * 10;
        gfx.fillStyle(0x1a6aaa, 0.6);
        gfx.fillEllipse(0, 0, w, h);
        // Foam cap
        gfx.fillStyle(0xffffff, 0.3 + i * 0.3);
        gfx.fillEllipse(0, -h * 0.3, w * 0.7, h * 0.3);
        break;
      }
      case 'wind': {
        // Streak with trail
        const len = 20 + i * 20;
        gfx.lineStyle(2 + i * 3, 0x88ccff, 0.4 + i * 0.4);
        gfx.beginPath();
        gfx.moveTo(-len, 0);
        gfx.lineTo(0, 0);
        gfx.strokePath();
        // Wind tip
        gfx.fillStyle(0xffffff, 0.5 + i * 0.3);
        gfx.fillCircle(0, 0, 2 + i * 2);
        break;
      }
      case 'debris': {
        // Rotating plank
        const dw = 6 + i * 6;
        const dh = 3 + i * 3;
        gfx.fillStyle(0x8B4513, 0.8);
        gfx.fillRect(-dw / 2, -dh / 2, dw, dh);
        // Edge highlight
        gfx.lineStyle(1, 0xaa6633, 0.5);
        gfx.strokeRect(-dw / 2, -dh / 2, dw, dh);
        break;
      }
      default: {
        // Rain drop — angled line
        const len = 4 + i * 3;
        gfx.lineStyle(1.5, 0x6699ff, 0.3 + i * 0.3);
        gfx.beginPath();
        gfx.moveTo(0, 0);
        gfx.lineTo(2 + i, len);
        gfx.strokePath();
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  LIGHTNING
  // ═══════════════════════════════════════════════

  private flashLightning(x: number) {
    // Screen white flash
    this.lightningFlashGfx.clear();
    this.lightningFlashGfx.fillStyle(0xffffff, 0.6 + Math.random() * 0.3);
    this.lightningFlashGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.time.delayedCall(60, () => {
      this.lightningFlashGfx.clear();
      this.lightningFlashGfx.fillStyle(0xffffff, 0);
      this.lightningFlashGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    });

    // Draw branching bolt
    const boltGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS + 2);
    this.lightningBolts.push(boltGfx);
    const targetX = x + Phaser.Math.Between(-30, 30);

    this.drawLightningBolt(x, 0, targetX, GAME_HEIGHT * 0.6, boltGfx);

    // Cascade shake
    this.cameras.main.shake(150, 0.008);
    this.time.delayedCall(150, () => this.cameras.main.shake(100, 0.005));
    this.time.delayedCall(300, () => this.cameras.main.shake(60, 0.003));

    // Auto-remove bolt after flash
    this.time.delayedCall(400, () => {
      boltGfx.destroy();
      const idx = this.lightningBolts.indexOf(boltGfx);
      if (idx >= 0) this.lightningBolts.splice(idx, 1);
    });
  }

  private drawLightningBolt(x1: number, y1: number, x2: number, y2: number, gfx: Phaser.GameObjects.Graphics) {
    const segments = Phaser.Math.Between(6, 10);
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: x1, y: y1 });

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      pts.push({
        x: x1 + (x2 - x1) * t + Phaser.Math.Between(-35, 35),
        y: y1 + (y2 - y1) * t + Phaser.Math.Between(-15, 15),
      });
    }
    pts.push({ x: x2, y: y2 });

    // Glow
    gfx.lineStyle(6, 0xffffff, 0.15);
    this.drawBoltPath(gfx, pts);
    // Mid
    gfx.lineStyle(3, 0xffffaa, 0.5);
    this.drawBoltPath(gfx, pts);
    // Core
    gfx.lineStyle(1.5, 0xffffff, 1);
    this.drawBoltPath(gfx, pts);

    // Branches
    const branchCount = Phaser.Math.Between(1, 3);
    for (let b = 0; b < branchCount; b++) {
      const bp = pts[Phaser.Math.Between(2, segments - 2)];
      const bex = bp.x + Phaser.Math.Between(-80, 80);
      const bey = bp.y + Phaser.Math.Between(40, 100);
      gfx.lineStyle(1.5, 0xffffaa, 0.4);
      this.drawBoltPath(gfx, [bp, { x: bex, y: bey }]);
    }
  }

  private drawBoltPath(gfx: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]) {
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      gfx.lineTo(pts[i].x, pts[i].y);
    }
    gfx.strokePath();
  }

  // ═══════════════════════════════════════════════
  //  FOAM / OCEAN EFFECTS
  // ═══════════════════════════════════════════════

  private spawnFoam() {
    if (this.isComplete) return;
    const intensity = this.waves[this.currentWave]?.intensity ?? 0.3;
    if (intensity < 0.3) return;

    const count = 1 + Math.floor(intensity * 2);
    for (let i = 0; i < count; i++) {
      const fx = Phaser.Math.Between(0, GAME_WIDTH);
      const fy = GAME_HEIGHT - Phaser.Math.Between(10, 40);
      const foam = this.add
        .circle(fx, fy, Phaser.Math.Between(2, 5), 0xffffff, 0.2 + intensity * 0.2)
        .setDepth(DEPTH.PARTICLES);
      this.foamParticles.push(foam);

      this.tweens.add({
        targets: foam,
        x: fx + Phaser.Math.Between(-30, 30),
        alpha: 0,
        scale: 0.2,
        duration: 800 + Math.random() * 500,
        onComplete: () => {
          foam.destroy();
          const idx = this.foamParticles.indexOf(foam);
          if (idx >= 0) this.foamParticles.splice(idx, 1);
        },
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  SHIP DAMAGE EFFECTS
  // ═══════════════════════════════════════════════

  private updateShipDamage() {
    const hpPct = this.shipHealth / this.maxHealth;

    // Clean up excess particles
    const maxSmoke = hpPct < 0.4 ? 15 : hpPct < 0.7 ? 8 : 0;
    while (this.smokeParticles.length > maxSmoke) {
      const p = this.smokeParticles.shift();
      if (p) p.sprite.destroy();
    }
    const maxFire = hpPct < 0.25 ? 10 : hpPct < 0.5 ? 5 : 0;
    while (this.fireParticles.length > maxFire) {
      const p = this.fireParticles.shift();
      if (p) p.sprite.destroy();
    }

    // Spawn smoke
    if (hpPct < 0.7) {
      const smokeRate = hpPct < 0.4 ? 2 : 1;
      for (let i = 0; i < smokeRate; i++) {
        const sx = this.shipX + Phaser.Math.Between(-15, 15);
        const sy = this.shipY - 10;
        const p = this.add
          .circle(sx, sy, Phaser.Math.Between(3, 6), 0x666666, 0.5)
          .setDepth(DEPTH.PARTICLES);
        const particle: SmokeParticle = {
          sprite: p,
          vx: Phaser.Math.FloatBetween(-15, 15),
          vy: Phaser.Math.FloatBetween(-40, -20),
          life: 0,
          maxLife: Phaser.Math.Between(500, 1000),
        };
        this.smokeParticles.push(particle);
      }
    }

    // Spawn fire
    if (hpPct < 0.5) {
      for (let i = 0; i < 2; i++) {
        const fx = this.shipX + Phaser.Math.Between(-12, 12);
        const fy = this.shipY + Phaser.Math.Between(-8, 8);
        const p = this.add
          .circle(fx, fy, Phaser.Math.Between(2, 5), 0xff4400, 0.7)
          .setDepth(DEPTH.PARTICLES + 1);
        const particle: SmokeParticle = {
          sprite: p,
          vx: Phaser.Math.FloatBetween(-8, 8),
          vy: Phaser.Math.FloatBetween(-20, -10),
          life: 0,
          maxLife: Phaser.Math.Between(300, 600),
        };
        this.fireParticles.push(particle);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  COLLISION
  // ═══════════════════════════════════════════════

  private checkCollisions() {
    if (this.isComplete) return;

    for (const hazard of this.hazards) {
      if (!hazard.active) continue;

      const dist = Phaser.Math.Distance.Between(
        this.shipX,
        this.shipY,
        hazard.gfx.x,
        hazard.gfx.y
      );
      const hitRadius =
        hazard.type === 'wave' ? 28 : hazard.type === 'lightning' ? 18 : hazard.type === 'debris' ? 20 : 14;

      if (dist < hitRadius) {
        hazard.active = false;
        hazard.gfx.destroy();

        const dmgMap: Record<string, number> = {
          lightning: 14,
          wave: 10,
          debris: 7,
          wind: 5,
          rain: 2,
        };
        let damage = dmgMap[hazard.type] || 2;
        damage *= this.waves[this.currentWave]?.intensity || 0.3;
        damage = Math.max(1, Math.round(damage));

        this.shipHealth = Math.max(0, this.shipHealth - damage);
        this.emitHealth();

        this.game.events.emit(
          GAME_EVENTS.HUD_SCORE,
          {
            score: Math.round((1 - this.shipHealth / this.maxHealth) * 2000),
            label: 'Survival',
          } satisfies HUDScorePayload
        );

        // Impact effects
        const shakeIntensity = 0.003 * damage;
        this.cameras.main.shake(120, shakeIntensity);

        // Damage particles (red sparks)
        for (let i = 0; i < 5; i++) {
          const p = this.add
            .circle(
              this.shipX + Phaser.Math.Between(-10, 10),
              this.shipY + Phaser.Math.Between(-10, 10),
              Phaser.Math.Between(2, 4),
              0xff4444,
              0.8
            )
            .setDepth(DEPTH.PARTICLES + 2);
          this.tweens.add({
            targets: p,
            x: this.shipX + Phaser.Math.Between(-40, 40),
            y: this.shipY + Phaser.Math.Between(-40, 40),
            alpha: 0,
            scale: 0.2,
            duration: 400,
            onComplete: () => p.destroy(),
          });
        }

        // Ship hit flash
        this.shipDamageGfx.clear();
        this.shipDamageGfx.fillStyle(0xff0000, 0.3);
        this.shipDamageGfx.fillCircle(this.shipX, this.shipY, 25);
        this.time.delayedCall(150, () => this.shipDamageGfx.clear());

        // Boss takes damage too
        if (!this.bossDefeated) {
          this.bossHealth -= damage * 0.7;
          this.bossHealth = Math.max(0, this.bossHealth);
          this.emitHealth();

          if (this.bossHealth <= 0) {
            this.bossDefeated = true;
            // Don't instantly win — finish current wave
          }
        }

        if (this.shipHealth <= 0) {
          this.failLevel();
          return;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  SHIP DRAWING
  // ═══════════════════════════════════════════════

  private drawShip() {
    const gfx = this.shipGfx;
    gfx.clear();

    const x = this.shipX;
    const y = this.shipY;
    const sway = Math.sin(this.oceanTime * 4) * 1.5; // gentle rocking
    const sy = y + sway;

    // ── Hull ──
    // Main hull (trapezoid - wider at bottom)
    gfx.fillStyle(0x3a4a5a, 1);
    gfx.beginPath();
    gfx.moveTo(x, sy - 22); // bow point
    gfx.lineTo(x + 28, sy + 14); // starboard stern
    gfx.lineTo(x + 22, sy + 18); // starboard bottom
    gfx.lineTo(x - 22, sy + 18); // port bottom
    gfx.lineTo(x - 28, sy + 14); // port stern
    gfx.closePath();
    gfx.fillPath();

    // Hull outline
    gfx.lineStyle(1.5, 0x5a6a7a, 0.7);
    gfx.strokePath();

    // Waterline stripe (red)
    gfx.fillStyle(0x992222, 0.8);
    gfx.fillRect(x - 24, sy + 12, 48, 4);

    // ── Deck ──
    gfx.fillStyle(0x5a6a6a, 1);
    gfx.beginPath();
    gfx.moveTo(x, sy - 18);
    gfx.lineTo(x + 24, sy + 10);
    gfx.lineTo(x - 24, sy + 10);
    gfx.closePath();
    gfx.fillPath();

    // Deck line
    gfx.lineStyle(1, 0x6a7a7a, 0.5);
    gfx.beginPath();
    gfx.moveTo(x, sy - 18);
    gfx.lineTo(x + 24, sy + 10);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(x, sy - 18);
    gfx.lineTo(x - 24, sy + 10);
    gfx.strokePath();

    // ── Cabin / Wheelhouse ──
    gfx.fillStyle(0x4a5a5a, 1);
    gfx.fillRect(x - 12, sy - 18, 24, 14);

    // Cabin outline
    gfx.lineStyle(1, 0x6a7a8a, 0.6);
    gfx.strokeRect(x - 12, sy - 18, 24, 14);

    // Cabin roof
    gfx.fillStyle(0x6a7a7a, 0.8);
    gfx.fillRect(x - 13, sy - 19, 26, 3);

    // ── Windows (lit cabin) ──
    const windowColor = 0x88ccff;
    const windowAlpha = 0.7 + Math.sin(this.oceanTime * 3) * 0.15;
    gfx.fillStyle(windowColor, windowAlpha);
    gfx.fillRect(x - 8, sy - 15, 5, 4);
    gfx.fillRect(x + 3, sy - 15, 5, 4);

    // ── Mast ──
    gfx.lineStyle(2, 0x7a8a8a, 0.9);
    gfx.beginPath();
    gfx.moveTo(x, sy - 10);
    gfx.lineTo(x, sy - 40);
    gfx.strokePath();

    // ── Mast cross-arm ──
    gfx.lineStyle(1.5, 0x7a8a8a, 0.7);
    gfx.beginPath();
    gfx.moveTo(x - 8, sy - 30);
    gfx.lineTo(x + 8, sy - 30);
    gfx.strokePath();

    // ── Radar dish (spinning) ──
    const radarAngle = this.oceanTime * 3;
    gfx.lineStyle(1.5, 0x88dd88, 0.6);
    gfx.beginPath();
    gfx.moveTo(x, sy - 40);
    gfx.lineTo(x + Math.cos(radarAngle) * 8, sy - 42 + Math.sin(radarAngle) * 4);
    gfx.strokePath();
    gfx.fillStyle(0x88dd88, 0.4);
    gfx.fillCircle(x, sy - 40, 2);

    // ── Exhaust stack (engine room) ──
    gfx.fillStyle(0x3a3a3a, 0.9);
    gfx.fillRect(x + 10, sy - 4, 6, 8);
    gfx.lineStyle(1, 0x5a5a5a, 0.5);
    gfx.strokeRect(x + 10, sy - 4, 6, 8);

    // ── Bow railing ──
    gfx.lineStyle(0.5, 0x8a9a9a, 0.4);
    gfx.beginPath();
    gfx.moveTo(x - 6, sy - 12);
    gfx.lineTo(x, sy - 22);
    gfx.lineTo(x + 6, sy - 12);
    gfx.strokePath();

    // ── Stern flag ──
    const flagWave = Math.sin(this.oceanTime * 5) * 2;
    gfx.lineStyle(1, 0x888888, 0.5);
    gfx.beginPath();
    gfx.moveTo(x - 28, sy + 4);
    gfx.lineTo(x - 28, sy - 4);
    gfx.strokePath();
    gfx.fillStyle(0x2244aa, 0.7);
    gfx.beginPath();
    gfx.moveTo(x - 28, sy - 4);
    gfx.lineTo(x - 28 + 8 + flagWave, sy - 2);
    gfx.lineTo(x - 28, sy);
    gfx.closePath();
    gfx.fillPath();

    // ── Bow wake ──
    gfx.lineStyle(1.5, 0xffffff, 0.15 + Math.sin(this.oceanTime * 3) * 0.08);
    gfx.beginPath();
    gfx.moveTo(x, sy - 20);
    gfx.lineTo(x - 15, sy - 10);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(x, sy - 20);
    gfx.lineTo(x + 15, sy - 10);
    gfx.strokePath();
  }

  // ═══════════════════════════════════════════════
  //  OCEAN DRAWING
  // ═══════════════════════════════════════════════

  private drawOcean() {
    this.oceanGfx.clear();

    const intensity = this.waves[this.currentWave]?.intensity ?? 0.3;
    const waveHeight = 6 + intensity * 12;
    const time = this.oceanTime;

    // Dark ocean base
    this.oceanGfx.fillStyle(0x0a1a2a, 0.8);
    this.oceanGfx.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);

    // Multiple wave layers
    const layers = [
      { amp: waveHeight * 0.4, freq: 0.015, speed: 1.5, yOff: -10, color: 0x1a4a7a, alpha: 0.15 },
      { amp: waveHeight * 0.6, freq: 0.025, speed: 2.0, yOff: 0, color: 0x2a5a8a, alpha: 0.2 },
      { amp: waveHeight * 0.8, freq: 0.035, speed: 2.5, yOff: 10, color: 0x3a6a9a, alpha: 0.25 },
    ];

    for (const layer of layers) {
      this.oceanGfx.lineStyle(2, layer.color, layer.alpha);
      this.oceanGfx.beginPath();
      this.oceanGfx.moveTo(0, GAME_HEIGHT - 30 + layer.yOff);
      for (let x = 0; x <= GAME_WIDTH; x += 4) {
        const y =
          GAME_HEIGHT - 30 + layer.yOff +
          Math.sin(x * layer.freq + time * layer.speed) * layer.amp +
          Math.sin(x * layer.freq * 2.3 + time * layer.speed * 1.7) * layer.amp * 0.4;
        this.oceanGfx.lineTo(x, y);
      }
      this.oceanGfx.strokePath();
    }

    // High-intensity: whitecap streaks
    if (intensity > 0.5) {
      const capAlpha = (intensity - 0.5) * 0.3;
      for (let i = 0; i < 5; i++) {
        const cx = ((i / 5) * GAME_WIDTH + time * 100 * (1 + i * 0.3)) % GAME_WIDTH;
        const cy =
          GAME_HEIGHT - 30 +
          Math.sin(cx * 0.025 + time * 2) * waveHeight * 0.6;
        this.oceanGfx.lineStyle(2, 0xffffff, capAlpha);
        this.oceanGfx.beginPath();
        this.oceanGfx.moveTo(cx - 15, cy);
        this.oceanGfx.lineTo(cx + 10, cy - 2);
        this.oceanGfx.strokePath();
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  BOSS TYPHOON BACKGROUND
  // ═══════════════════════════════════════════════

  private drawTyphoonBackground() {
    const hpPct = this.bossHealth / this.maxHealth;
    const intensity = Math.max(0.15, 1 - hpPct); // Weak at full HP, strong at low HP

    const gfx = this.typhoonGfx;
    const glowGfx = this.typhoonGlowGfx;
    gfx.clear();
    glowGfx.clear();

    const cx = GAME_WIDTH * 0.78; // top-right corner
    const cy = GAME_HEIGHT * 0.25;
    const baseSize = 0.35 + intensity * 0.5;
    const maxR = 25 + intensity * 100;
    const rot = this.stormTime * 0.6;

    // Outer glow
    glowGfx.fillStyle(intensity > 0.5 ? 0x881111 : 0x114488, intensity * 0.06);
    glowGfx.fillCircle(cx, cy, maxR * 1.8);

    // Outer haze
    gfx.fillStyle(0x8899aa, 0.015 + intensity * 0.02);
    gfx.fillCircle(cx, cy, maxR * 1.3);

    // Spiral rainbands (reduced complexity for background)
    const arms = 2 + Math.floor(intensity * 2);
    for (let arm = 0; arm < arms; arm++) {
      const armAngle = (arm / arms) * Math.PI * 2 + rot;
      for (let step = 0; step < 20; step++) {
        const t = step / 20;
        const angle = armAngle + t * 3 * Math.PI * 2 + Math.sin(t * 5 + arm) * 0.2;
        const radius = 14 + t * (maxR * 0.85 - 14);
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        const thickness = (1 - t * 0.6) * (4 + intensity * 8);
        const alpha = (0.08 + intensity * 0.15) * (1 - t * 0.5);
        const gray = 160 - Math.floor(t * 60);
        gfx.fillStyle(
          Phaser.Display.Color.GetColor(gray, gray, gray + 20),
          Math.max(0, alpha)
        );
        gfx.fillCircle(sx, sy, Math.max(1, thickness));
      }
    }

    // Eyewall
    const eyewallR = 7 + intensity * 18;
    for (let i = 3; i >= 0; i--) {
      const r = eyewallR + i * 4;
      const alpha = (0.1 + intensity * 0.3) - i * 0.04;
      const bright = 180 - i * 20 + intensity * 40;
      gfx.fillStyle(
        Phaser.Display.Color.GetColor(
          Math.min(255, bright + 40),
          Math.min(255, bright),
          Math.min(255, bright)
        ),
        Math.max(0, alpha)
      );
      gfx.fillCircle(cx, cy, r);
    }

    // Eye
    const eyeR = eyewallR * 0.3;
    gfx.fillStyle(0x000000, 0.1 + intensity * 0.15);
    gfx.fillCircle(cx, cy, eyeR * 1.2);
    gfx.fillStyle(0xffffff, 0.03 + intensity * 0.06);
    gfx.fillCircle(cx, cy, eyeR * 0.5);

    // High intensity: red glow
    if (intensity > 0.6) {
      gfx.fillStyle(0xff4422, (intensity - 0.6) * 0.12);
      gfx.fillCircle(cx, cy, eyewallR * 1.4);
    }
  }

  // ═══════════════════════════════════════════════
  //  ATMOSPHERE
  // ═══════════════════════════════════════════════

  private updateAtmosphere() {
    const hpPct = this.bossHealth / this.maxHealth;
    const intensity = 1 - hpPct;

    // Dark overlay — gets darker as boss loses health
    this.darkOverlay.clear();
    const darkAlpha = intensity * 0.25;
    this.darkOverlay.fillStyle(0x000000, darkAlpha);
    this.darkOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Fog — more intense at higher levels
    this.fogGfx.clear();
    if (intensity > 0.3) {
      const fogAlpha = (intensity - 0.3) * 0.12;
      for (let i = 0; i < 4; i++) {
        const fx = ((i / 4) * GAME_WIDTH + this.stormTime * 20 * (1 + i * 0.5)) % (GAME_WIDTH + 200) - 100;
        const fy = GAME_HEIGHT * 0.2 + Math.sin(this.stormTime * 0.3 + i * 1.5) * 40;
        this.fogGfx.fillStyle(0x8899aa, fogAlpha);
        this.fogGfx.fillEllipse(fx, fy, 300 + intensity * 200, 40 + intensity * 30);
      }
    }

    // Background color shift — dark blue to dark red
    const targetColor = Phaser.Display.Color.GetColor(
      Math.round(5 + intensity * 30),
      Math.round(5 + intensity * 5),
      Math.round(16 + intensity * 5)
    );
    this.cameras.main.setBackgroundColor(targetColor);

    // Screen pulse with boss HP (fast flash at low HP)
    if (intensity > 0.7 && Math.random() < 0.05) {
      this.cameras.main.flash(100, 30, 0, 0, false);
    }
  }

  // ═══════════════════════════════════════════════
  //  HAZARD UPDATE (position/rotation)
  // ═══════════════════════════════════════════════

  private updateHazards(delta: number) {
    for (const hazard of this.hazards) {
      if (!hazard.active) continue;

      hazard.gfx.x += (hazard.vx / 60) * (delta / 16);
      hazard.gfx.y += (hazard.vy / 60) * (delta / 16);
      hazard.rot += hazard.rotSpeed * (delta / 16);
      hazard.gfx.setRotation(hazard.rot);

      // Remove if off-screen
      if (
        hazard.gfx.y > GAME_HEIGHT + 40 ||
        hazard.gfx.y < -40 ||
        hazard.gfx.x < -60 ||
        hazard.gfx.x > GAME_WIDTH + 60
      ) {
        hazard.active = false;
        hazard.gfx.destroy();
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  SMOKE / FIRE UPDATE
  // ═══════════════════════════════════════════════

  private updateParticles(particles: SmokeParticle[], dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      const progress = p.life / p.maxLife;
      p.sprite.x += p.vx * (dt / 16) * 0.05;
      p.sprite.y += p.vy * (dt / 16) * 0.05;
      p.sprite.setAlpha(Math.max(0, 1 - progress));
      p.sprite.setScale(1 + progress * 2);
      if (p.life >= p.maxLife) {
        p.sprite.destroy();
        particles.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  VICTORY / FAIL
  // ═══════════════════════════════════════════════

  private victory() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.waveTimer) this.waveTimer.remove();

    const healthBonus = Math.round(this.shipHealth * 5);
    const bossBonus = this.bossDefeated ? 1500 : 500;
    const timeBonus = Math.round((this.timeRemaining / this.totalTime) * 500);
    const score = 2000 + healthBonus + bossBonus + timeBonus;
    const stars = GameManager.getStars(score, 4000);

    GameManager.getInstance().completeLevel('boss', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['boss'] || {};
    progress['boss'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_boss'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    // Epic victory sequence
    this.cameras.main.flash(800, 255, 255, 255);
    this.cameras.main.shake(300, 0.005);

    // Brighten background
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2000,
      onUpdate: (tween) => {
        const v = tween.getValue();
        this.cameras.main.setBackgroundColor(
          Phaser.Display.Color.GetColor(
            Math.round(5 + (v ?? 0) * 40),
            Math.round(5 + (v ?? 0) * 50),
            Math.round(16 + (v ?? 0) * 80)
          )
        );
      },
    });

    // "Storm Conquered!" text
    const victoryText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '🌅 Storm Conquered!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '38px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0)
      .setScale(0.01);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Celebration particles
    for (let i = 0; i < 25; i++) {
      this.time.delayedCall(i * 40, () => {
        const p = this.add
          .circle(
            Phaser.Math.Between(100, GAME_WIDTH - 100),
            Phaser.Math.Between(100, GAME_HEIGHT - 100),
            Phaser.Math.Between(3, 8),
            0xffd166,
            0.5
          )
          .setDepth(DEPTH.OVERLAY);
        this.tweens.add({
          targets: p,
          scale: 2,
          alpha: 0,
          duration: 800,
          onComplete: () => p.destroy(),
        });
      });
    }

    this.game.events.emit(
      GAME_EVENTS.HUD_RESULT,
      {
        type: 'complete',
        title: 'Storm Conquered!',
        subtitle: 'You survived the typhoon and completed all stages!',
        score,
        stars,
        levelId: 'boss',
        timeUsed: this.totalTime - this.timeRemaining,
        factsUnlocked: ['fact_boss'],
      } satisfies HUDResultPayload
    );
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.waveTimer) this.waveTimer.remove();

    // Ship destruction effect
    this.cameras.main.shake(500, 0.015);
    this.cameras.main.flash(400, 200, 50, 50);

    // Explosion particles
    for (let i = 0; i < 15; i++) {
      const p = this.add
        .circle(
          this.shipX + Phaser.Math.Between(-20, 20),
          this.shipY + Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(3, 8),
          0xff4400,
          0.8
        )
        .setDepth(DEPTH.PARTICLES + 3);
      this.tweens.add({
        targets: p,
        x: this.shipX + Phaser.Math.Between(-80, 80),
        y: this.shipY + Phaser.Math.Between(-80, 80),
        alpha: 0,
        scale: 0.1,
        duration: 600,
        onComplete: () => p.destroy(),
      });
    }

    const failText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '💥 Ship Lost!\nThe typhoon was too strong...', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '28px',
        color: '#D62828',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY);

    this.game.events.emit(
      GAME_EVENTS.HUD_RESULT,
      {
        type: 'fail',
        title: 'Ship Lost!',
        subtitle: 'The typhoon was too strong',
        score: 0,
        stars: 0,
        levelId: 'boss',
        timeUsed: this.totalTime,
        factsUnlocked: [],
      } satisfies HUDResultPayload
    );
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  // ═══════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════

  update(_time: number, delta: number) {
    if (this.isComplete || !this.gameStarted) return;

    const dt = delta; // ms since last frame

    // Update timers
    this.oceanTime += dt / 1000;
    this.stormTime += dt / 1000;

    // Update game systems
    this.updateHazards(dt);
    this.drawShip();
    this.drawOcean();
    this.drawTyphoonBackground();
    this.updateAtmosphere();
    this.checkCollisions();

    // Clean up inactive hazards
    this.hazards = this.hazards.filter((h) => h.active);

    // Update damage particles
    this.updateParticles(this.smokeParticles, dt);
    this.updateParticles(this.fireParticles, dt);

    // Check boss defeat after current wave
    if (this.bossDefeated && !this.isComplete) {
      // Finish the wave, then victory
      this.victory();
    }
  }

  // ═══════════════════════════════════════════════
  //  SHUTDOWN
  // ═══════════════════════════════════════════════

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    // Clean up particles
    this.smokeParticles.forEach((p) => p.sprite.destroy());
    this.fireParticles.forEach((p) => p.sprite.destroy());
    this.foamParticles.forEach((p) => p.destroy());
    this.lightningBolts.forEach((g) => g.destroy());
    this.smokeParticles = [];
    this.fireParticles = [];
    this.foamParticles = [];
    this.lightningBolts = [];
  }
}
