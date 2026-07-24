import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDTimerPayload,
  HUDObjectivePayload,
  HUDLevelInfoPayload,
  HUDWeatherPayload,
  HUDLevelIntroPayload,
  HUDScorePayload
} from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

// ── Layout (compact) ──
const OCEAN_Y = 580; // centre of ocean strip (moved up)
const CLOUD_X = GAME_WIDTH / 2;
const CLOUD_Y = 130;
const METER_X = CLOUD_X;
const METER_Y = CLOUD_Y + 70;
const METER_W = 160;
const METER_H = 10;
const VAPOR_SPAWN_Y = OCEAN_Y - 15;
const VAPOR_TARGET_Y = 100;
const ZONE_DETECTION_R = 48;
const CONDENSATION_INTERVAL = 150; // ms between proximity checks

// ── Temperature Layers ──
const ZONE_WARM_TOP = 430; // warm layer up to this Y
const ZONE_COLD_TOP = 270; // cold layer from here up
const ZONE_SWEET_SPOT_CENTER = 350; // middle of transition zone
const SWEET_SPOT_RADIUS = 80; // range for bonus condensation
const BOUNDARY_BONUS = 1.5; // 50% extra progress in sweet spot
const WARM_SPEED_MULT = 1.4; // vapor rises faster in warm zone
const COLD_SPEED_MULT = 0.6; // vapor slows in cold zone

interface RisingVapor {
  sprite: Phaser.GameObjects.Image;
  id: number;
  active: boolean;
}

interface CoolZoneData {
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Arc;
  heatBar: Phaser.GameObjects.Graphics;
  heatLevel: number; // 0–100
  isOverheated: boolean;
  detectionRadius: number;
}

export class CondensationScene extends Phaser.Scene {
  // ── State ──
  private vapors: RisingVapor[] = [];
  private coolZones: CoolZoneData[] = [];
  private cloudProgress = 0;
  private timeRemaining = 75;
  private readonly TOTAL_TIME = 75;
  private isComplete = false;
  private gameStarted = false;
  private nextVaporId = 0;

  // ── Game objects ──
  private mistLayer!: Phaser.GameObjects.Image;
  private cloudGlow!: Phaser.GameObjects.Image;
  private cloudMeter!: Phaser.GameObjects.Graphics;
  private meterLabel!: Phaser.GameObjects.Text;
  private urgencyOverlay!: Phaser.GameObjects.Rectangle;
  private vaporSpawnTimer!: Phaser.Time.TimerEvent;
  private condensationCheckTimer!: Phaser.Time.TimerEvent;
  private windStreamTimer!: Phaser.Time.TimerEvent;
  private windGustActive = false;
  private windGustDirection = 0;
  private windGustStrength = 0;
  private windGustTimerEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: SCENES.CONDENSATION });
  }

  // ═══════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);

    // Reset state
    this.isComplete = false;
    this.gameStarted = false;
    this.vapors = [];
    this.coolZones = [];
    this.cloudProgress = 0;
    this.timeRemaining = this.TOTAL_TIME;
    this.nextVaporId = 0;

    this.buildScene();
    this.showIntroOverlay();
  }

  // ═══════════════════════════════════════════════
  //  INTRO OVERLAY
  // ═══════════════════════════════════════════════

  private showIntroOverlay() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'condensation',
      badge: '☁️ LEVEL 2',
      title: 'Build the Clouds',
      subtitle: 'Cool the rising vapor to form clouds!',
      mechanics: [
        { icon: '🌡️', text: 'Warm layer (bottom) — vapor rises fast' },
        { icon: '❄️', text: 'Cold layer (top) — vapor slows down' },
        { icon: '✨', text: 'Sweet spot (middle) — BONUS cloud growth!' },
        { icon: '❄️', text: 'Drag Cool Air Zones into the vapor path' },
        { icon: '💨', text: '⚠️ Wind gusts push vapor — react fast!' },
        { icon: '🔥', text: 'Zones overheat with use — rotate them!' },
        { icon: '☁️', text: 'Reach 100% cloud growth to win!' }
      ]
    } satisfies HUDLevelIntroPayload);

    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;

    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Condensation',
      description: 'Place cool air → condense vapor!'
    } satisfies HUDLevelInfoPayload);

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.emitObjective();
    this.drawCloudMeter();

    // Fade in meter label immediately
    this.tweens.add({
      targets: this.meterLabel,
      alpha: 1,
      duration: 500
    });

    // Fade in mist layer (gentle pulse)
    this.tweens.add({
      targets: this.mistLayer,
      alpha: { from: 0, to: 0.5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Spawn initial vapors
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 400, () => this.spawnVapor());
    }

    // Continuous vapor spawn
    this.vaporSpawnTimer = this.time.addEvent({
      delay: 900,
      callback: () => {
        if (!this.isComplete) this.spawnVapor();
      },
      loop: true
    });

    // Condensation proximity check (also handles heat dissipation)
    this.condensationCheckTimer = this.time.addEvent({
      delay: CONDENSATION_INTERVAL,
      callback: () => {
        this.checkCondensation();
        this.updateZoneHeat();
      },
      loop: true
    });

    // Timer tick
    this.time.addEvent({
      delay: 1000,
      callback: () => this.onTick(),
      loop: true
    });

    // Extra vapor bursts
    this.time.addEvent({
      delay: 5000,
      callback: () => {
        if (!this.isComplete) {
          this.spawnVapor();
          this.spawnVapor();
        }
      },
      loop: true
    });

    // Wind streams
    this.spawnWindStream();
    this.windStreamTimer = this.time.addEvent({
      delay: 2500,
      callback: () => {
        if (!this.isComplete) this.spawnWindStream();
      },
      loop: true
    });

    // Wind gust events (every 12–18s with jitter)
    const firstGustDelay = Phaser.Math.Between(6000, 10000);
    this.time.delayedCall(firstGustDelay, () => {
      if (!this.isComplete) this.startWindGust();
      this.scheduleNextGust();
    });
  };

  // ═══════════════════════════════════════════════
  //  BUILD SCENE  (depths per user spec)
  // ═══════════════════════════════════════════════

  private buildScene() {
    // Depth 0: Sky
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'condensation_sky')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    // Dark overlay for atmosphere (behind ocean)
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x0a0a2e,
        0.2
      )
      .setDepth(0);

    this.urgencyOverlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0
      )
      .setDepth(0);

    // Depth 1: Ocean strip (with gentle wave sway)
    const ocean = this.add
      .image(GAME_WIDTH / 2, OCEAN_Y, 'ocean_strip')
      .setDepth(1);
    this.tweens.add({
      targets: ocean,
      x: GAME_WIDTH / 2 + 10,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Depth 1.2: Temperature layer overlay (semi-transparent)
    const tempLayers = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'temperature_layer_overlay')
      .setDepth(1.2)
      .setAlpha(0.25)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Zone labels removed — temperature_layer_overlay.png already shows the layers visually

    // Depth 1.5: Mist layer (between ocean and vapor, fades in after game starts)
    this.mistLayer = this.add
      .image(GAME_WIDTH / 2, OCEAN_Y - 130, 'mist_layer')
      .setDepth(1.5)
      .setAlpha(0)
      .setDisplaySize(GAME_WIDTH, 260);

    // Depth 4: Growing cloud (starts small, alpha 0)
    this.cloudGlow = this.add
      .image(CLOUD_X, CLOUD_Y, 'cloud_glow')
      .setDepth(4)
      .setAlpha(0)
      .setScale(0.1);

    // Depth 5: Cloud meter
    this.cloudMeter = this.add.graphics().setDepth(5);
    this.meterLabel = this.add
      .text(METER_X, METER_Y + METER_H + 6, '☁️ Cloud 0%', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '12px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(5)
      .setAlpha(0);

    // Depth 3: Cool Air Zones (3 draggable, compact spacing)
    this.createCoolZone(350, 340);
    this.createCoolZone(640, 380);
    this.createCoolZone(930, 320);

    // Hint text
    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 30,
        '❄️ Drag cool air zones into the vapor path',
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '14px',
          color: '#87CEEB',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setAlpha(0);

    this.tweens.add({
      targets: hint,
      alpha: 0.7,
      duration: 600,
      delay: 1200
    });

    // Title
    this.add
      .text(GAME_WIDTH / 2, 18, '☁️ Build the Clouds', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '18px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setAlpha(0.6);
  }

  // ═══════════════════════════════════════════════
  //  COOL AIR ZONES  (Depth 3)
  // ═══════════════════════════════════════════════

  private createCoolZone(x: number, y: number) {
    const SCALE = 0.15;
    const sprite = this.add
      .image(x, y, 'cool_zone')
      .setDepth(3)
      .setScale(SCALE)
      .setInteractive({ useHandCursor: true, draggable: true });

    const label = this.add
      .text(x, y, '❄', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '14px',
        color: '#E3F2FD',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Glow ring behind
    const glow = this.add.circle(x, y, 35, 0x4fc3f7, 0.08).setDepth(2);
    this.tweens.add({
      targets: glow,
      alpha: 0.2,
      scale: 1.1,
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    // Heat bar above zone
    const heatBar = this.add.graphics().setDepth(3);
    this.drawZoneHeatBar(heatBar, x, y, 0);

    // Drag events
    sprite.on(
      'drag',
      (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        const cx = Phaser.Math.Clamp(dragX, 50, GAME_WIDTH - 50);
        const cy = Phaser.Math.Clamp(dragY, 120, OCEAN_Y - 50);
        sprite.setPosition(cx, cy);
        label.setPosition(cx, cy);
        glow.setPosition(cx, cy);
        heatBar.setPosition(0, 0);
        this.drawZoneHeatBar(heatBar, cx, cy, 0);
      }
    );

    sprite.on('dragstart', () => {
      sprite.setScale(SCALE * 1.12);
      label.setScale(1.12);
      sprite.setDepth(4);
    });

    sprite.on('dragend', () => {
      sprite.setScale(SCALE);
      label.setScale(1);
      sprite.setDepth(3);
    });

    this.coolZones.push({
      sprite,
      label,
      glow,
      heatBar,
      heatLevel: 0,
      isOverheated: false,
      detectionRadius: ZONE_DETECTION_R
    });
  }

  // ═══════════════════════════════════════════════
  //  ZONE HEAT BAR
  // ═══════════════════════════════════════════════

  private drawZoneHeatBar(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    heat: number
  ) {
    gfx.clear();
    const barW = 36;
    const barH = 4;
    const bx = x - barW / 2;
    const by = y - 38;

    // Background
    gfx.fillStyle(0x000000, 0.5);
    gfx.fillRoundedRect(bx, by, barW, barH, 2);

    // Fill (blue → yellow → red based on heat)
    const fill = Math.min(heat, 100) / 100;
    if (fill > 0) {
      let color: number;
      if (heat < 50) {
        // Blue → white
        const t = heat / 50;
        const r = Math.round(80 + t * 175);
        const g = Math.round(180 + t * 75);
        const b = Math.round(255 - t * 55);
        color = (r << 16) | (g << 8) | b;
      } else {
        // White → yellow → orange → red
        const t = (heat - 50) / 50;
        const r = 255;
        const g = Math.round(255 - t * 200);
        const b = Math.round(200 - t * 200);
        color = (r << 16) | (Math.max(0, g) << 8) | Math.max(0, b);
      }
      gfx.fillStyle(color, 0.85);
      gfx.fillRoundedRect(bx + 1, by + 1, (barW - 2) * fill, barH - 2, 1.5);
    }
  }

  // ═══════════════════════════════════════════════
  //  OVERHEAT SYSTEM
  // ═══════════════════════════════════════════════

  private updateZoneHeat() {
    if (!this.gameStarted || this.isComplete) return;
    for (const zone of this.coolZones) {
      if (zone.isOverheated) continue;
      // Natural cooldown: -1 per 150ms
      zone.heatLevel = Math.max(0, zone.heatLevel - 1);
      this.drawZoneHeatBar(
        zone.heatBar,
        zone.sprite.x,
        zone.sprite.y,
        zone.heatLevel
      );
      this.applyZoneHeatVisual(zone);
    }
  }

  private applyZoneHeatVisual(zone: CoolZoneData) {
    const h = zone.heatLevel;
    let tint: number;
    let labelColor: string;

    if (h < 30) {
      tint = 0xffffff; // pure cool blue-white
      labelColor = '#E3F2FD';
    } else if (h < 60) {
      tint = 0xffeedd; // warming
      labelColor = '#FFF9C4';
    } else if (h < 85) {
      tint = 0xffcc88; // getting hot
      labelColor = '#FFD54F';
    } else {
      tint = 0xff6633; // near overheat!
      labelColor = '#FF8A65';
    }

    zone.sprite.setTint(tint);
    zone.label.setColor(labelColor);
  }

  private overheatZone(zone: CoolZoneData) {
    zone.isOverheated = true;
    zone.heatLevel = 100;
    zone.sprite.setTint(0xff3300);
    zone.label.setColor('#FF1744');
    zone.label.setText('🔥');

    // Steam particles
    for (let i = 0; i < 4; i++) {
      const steam = this.add
        .circle(
          zone.sprite.x + Phaser.Math.Between(-15, 15),
          zone.sprite.y - 10,
          5,
          0xffffff,
          0.3
        )
        .setDepth(5);
      this.tweens.add({
        targets: steam,
        y: steam.y - Phaser.Math.Between(25, 45),
        x: steam.x + Phaser.Math.Between(-15, 15),
        alpha: 0,
        scale: 2,
        duration: Phaser.Math.Between(600, 1000),
        delay: i * 150,
        onComplete: () => steam.destroy()
      });
    }

    // Recovery after 3s
    this.time.delayedCall(3000, () => {
      zone.isOverheated = false;
      zone.heatLevel = 0;
      zone.label.setText('❄');
      zone.sprite.clearTint();
      zone.label.setColor('#E3F2FD');
      this.drawZoneHeatBar(zone.heatBar, zone.sprite.x, zone.sprite.y, 0);
    });
  }

  // ═══════════════════════════════════════════════
  //  WIND GUST SYSTEM
  // ═══════════════════════════════════════════════

  private startWindGust() {
    if (this.isComplete) return;
    this.windGustActive = true;
    this.windGustDirection = Math.random() > 0.5 ? 1 : -1; // 1 = right, -1 = left
    this.windGustStrength = Phaser.Math.Between(60, 120);

    const dirText =
      this.windGustDirection === 1 ? '→ WIND GUST →' : '← WIND GUST ←';

    // Warning text
    const warn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, dirText, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '26px',
        color: '#B0E0FF',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setAlpha(0);

    this.tweens.add({
      targets: warn,
      alpha: 1,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      hold: 600,
      onComplete: () => {
        this.tweens.add({
          targets: warn,
          alpha: 0,
          duration: 800,
          onComplete: () => warn.destroy()
        });
      }
    });

    // Push existing vapors
    for (const v of this.vapors) {
      if (!v.active || !v.sprite.active) continue;
      this.tweens.add({
        targets: v.sprite,
        x: v.sprite.x + this.windGustDirection * this.windGustStrength,
        duration: 2000,
        ease: 'Sine.easeInOut'
      });
    }

    // End gust after 3s
    this.time.delayedCall(3500, () => {
      this.windGustActive = false;
      this.windGustDirection = 0;
      this.windGustStrength = 0;
    });
  }

  private scheduleNextGust() {
    if (this.isComplete) return;
    const delay = Phaser.Math.Between(12000, 18000);
    this.windGustTimerEvent = this.time.delayedCall(delay, () => {
      if (!this.isComplete) this.startWindGust();
      this.scheduleNextGust();
    });
  }

  // ═══════════════════════════════════════════════
  //  VAPOR PARTICLES  (Depth 2)
  // ═══════════════════════════════════════════════

  private spawnVapor() {
    if (this.isComplete) return;
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const startY = VAPOR_SPAWN_Y + Phaser.Math.Between(-10, 10);
    const finalY = VAPOR_TARGET_Y + Phaser.Math.Between(-20, 20);

    const sprite = this.add
      .image(x, startY, 'vapor_particle')
      .setDepth(2)
      .setScale(Phaser.Math.FloatBetween(0.04, 0.04))
      .setAlpha(0.55);

    const id = this.nextVaporId++;
    const vapor: RisingVapor = { sprite, id, active: true };
    this.vapors.push(vapor);

    // ── Thermal zone speed control ──
    // Warm zone (bottom): fast rise  —  hot air rises quickly
    // Cold zone (top):    slow rise  —  cooling slows the vapor
    // Sweet spot (middle): normal speed, bonus condensation
    const targetX = x + Phaser.Math.Between(-100, 100);

    // Build a timeline based on thermal zone crossings
    const segs: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    // Segment 1: Warm zone (fast)
    if (startY > ZONE_WARM_TOP) {
      segs.push({
        targets: sprite,
        y: ZONE_WARM_TOP,
        x: Phaser.Math.Linear(x, targetX, 0.4),
        duration: Phaser.Math.Between(800, 1200),
        ease: 'Sine.easeOut'
      });
    }

    // Segment 2: Transition / sweet-spot zone (normal speed)
    const midY = Math.max(
      startY > ZONE_WARM_TOP ? ZONE_WARM_TOP : startY,
      ZONE_COLD_TOP + 40
    );
    segs.push({
      targets: sprite,
      y: midY,
      x: Phaser.Math.Linear(x, targetX, 0.7),
      duration: Phaser.Math.Between(1600, 2200),
      ease: 'Sine.easeInOut'
    });

    // Segment 3: Cold zone (slow)
    segs.push({
      targets: sprite,
      y: finalY,
      x: targetX,
      duration: Phaser.Math.Between(2500, 3500),
      ease: 'Sine.easeIn'
    });

    // Run segments sequentially using onComplete chaining (no Phaser timeline)
    const runSegments = (index: number) => {
      if (index >= segs.length) {
        sprite.destroy();
        vapor.active = false;
        const idx = this.vapors.indexOf(vapor);
        if (idx >= 0) this.vapors.splice(idx, 1);
        return;
      }
      this.tweens.add({
        ...segs[index],
        onComplete: () => runSegments(index + 1)
      });
    };
    runSegments(0);
  }

  // ═══════════════════════════════════════════════
  //  WIND STREAMS  (Depth 2, behind vapor)
  // ═══════════════════════════════════════════════

  private spawnWindStream() {
    if (this.isComplete) return;

    // Random Y across the playable area (above ocean, below cloud area)
    const y = Phaser.Math.Between(160, 520);
    // Random direction: left→right or right→left
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -100 : GAME_WIDTH + 100;
    const endX = fromLeft ? GAME_WIDTH + 100 : -100;

    const sprite = this.add
      .image(startX, y, 'wind_stream')
      .setDepth(2)
      .setAlpha(0);

    // Randomize appearance
    const scale = Phaser.Math.FloatBetween(0.08, 0.2);
    const flipX = Math.random() > 0.5;
    sprite.setScale(scale);
    if (flipX) sprite.setFlipX(true);

    // Slight vertical drift
    const driftY = y + Phaser.Math.Between(-40, 40);
    const duration = Phaser.Math.Between(4000, 8000);

    // Fade in, drift across, fade out
    this.tweens.add({
      targets: sprite,
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.12, 0.3) },
      duration: 600,
      ease: 'Sine.easeIn'
    });

    this.tweens.add({
      targets: sprite,
      x: endX,
      y: driftY,
      alpha: 0,
      duration,
      ease: 'Sine.easeInOut',
      delay: 500,
      onComplete: () => sprite.destroy()
    });
  }

  private checkCondensation() {
    if (this.isComplete || !this.gameStarted) return;

    for (let vi = this.vapors.length - 1; vi >= 0; vi--) {
      const vapor = this.vapors[vi];
      if (!vapor.active || !vapor.sprite.active) continue;

      for (const zone of this.coolZones) {
        if (!zone.sprite.active || zone.isOverheated) continue;

        const dist = Phaser.Math.Distance.Between(
          vapor.sprite.x,
          vapor.sprite.y,
          zone.sprite.x,
          zone.sprite.y
        );

        if (dist < zone.detectionRadius) {
          this.condenseVapor(vapor, zone);
          break;
        }
      }
    }
  }

  private condenseVapor(vapor: RisingVapor, zone: CoolZoneData) {
    vapor.active = false;
    const idx = this.vapors.indexOf(vapor);
    if (idx >= 0) this.vapors.splice(idx, 1);

    const vx = vapor.sprite.x;
    const vy = vapor.sprite.y;

    // Vapor condense-out animation
    this.tweens.add({
      targets: vapor.sprite,
      scale: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: () => vapor.sprite.destroy()
    });

    // Depth 5: Condensation effect sprite (smaller)
    const effect = this.add
      .image(vx, vy, 'condensation_effect')
      .setDepth(5)
      .setScale(0.1)
      .setAlpha(0.3);

    this.tweens.add({
      targets: effect,
      scale: 0.8,
      alpha: 0,
      duration: 400,
      onComplete: () => effect.destroy()
    });

    // Depth 5: Sparkle burst (smaller radius)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Phaser.Math.PI2;
      const spark = this.add.circle(vx, vy, 2, 0x06d6a0, 0.8).setDepth(5);
      this.tweens.add({
        targets: spark,
        x: vx + Math.cos(angle) * Phaser.Math.Between(20, 35),
        y: vy + Math.sin(angle) * Phaser.Math.Between(20, 35),
        alpha: 0,
        scale: 0.2,
        duration: 350,
        onComplete: () => spark.destroy()
      });
    }

    // Depth 5: Expanding ring (tighter)
    const ring = this.add.circle(vx, vy, 8, 0x4fc3f7, 0).setDepth(5);
    ring.setStrokeStyle(1.5, 0x4fc3f7, 0.5);
    this.tweens.add({
      targets: ring,
      radius: 25,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy()
    });

    // ── Zone heat ──
    if (!zone.isOverheated) {
      zone.heatLevel = Math.min(100, zone.heatLevel + 15);
      this.drawZoneHeatBar(
        zone.heatBar,
        zone.sprite.x,
        zone.sprite.y,
        zone.heatLevel
      );
      this.applyZoneHeatVisual(zone);
      if (zone.heatLevel >= 100) this.overheatZone(zone);
    }

    // ── Sweet-spot boundary bonus ──
    // Condensing in the transition zone (warm↔cold boundary) gives bonus progress!
    const inSweetSpot =
      vy >= ZONE_COLD_TOP &&
      vy <= ZONE_WARM_TOP &&
      Math.abs(vy - ZONE_SWEET_SPOT_CENTER) < SWEET_SPOT_RADIUS;

    // ── Cloud progress (with potential bonus) ──
    const baseGain = Phaser.Math.Between(4, 6);
    const gain = inSweetSpot ? Math.round(baseGain * BOUNDARY_BONUS) : baseGain;
    const isBonus = gain > baseGain;

    this.cloudProgress = Math.min(100, this.cloudProgress + gain);
    this.updateCloudVisual();
    this.drawCloudMeter();
    this.emitObjective();

    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: Math.round((this.cloudProgress / 100) * 2000),
      label: 'Condensation'
    } satisfies HUDScorePayload);

    // +X% pop text (with bonus indicator)
    const popText = this.add
      .text(
        vx,
        vy - 20,
        isBonus ? `✨ +${gain}% SWEET SPOT!` : `+${gain}% ☁️`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: isBonus ? '14px' : '15px',
          color: isBonus ? '#FFD166' : '#06D6A0',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(5);

    this.tweens.add({
      targets: popText,
      y: vy - 55,
      alpha: 0,
      duration: isBonus ? 1000 : 700,
      onComplete: () => popText.destroy()
    });

    // Extra sparkle burst for sweet-spot condensation
    if (isBonus) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Phaser.Math.PI2;
        const star = this.add.circle(vx, vy, 2.5, 0xffd166, 0.9).setDepth(5);
        this.tweens.add({
          targets: star,
          x: vx + Math.cos(angle) * Phaser.Math.Between(30, 50),
          y: vy + Math.sin(angle) * Phaser.Math.Between(30, 50),
          alpha: 0,
          scale: 0.2,
          duration: 500,
          onComplete: () => star.destroy()
        });
      }
    }

    if (this.cloudProgress >= 100) this.completeLevel();
  }

  // ═══════════════════════════════════════════════
  //  CLOUD VISUAL  (Depth 4)
  // ═══════════════════════════════════════════════

  private updateCloudVisual() {
    // First time appearing: fade in the cloud
    if (this.cloudGlow.alpha === 0 && this.cloudProgress > 0) {
      this.tweens.add({
        targets: this.cloudGlow,
        alpha: 1,
        duration: 500,
        ease: 'Sine.easeOut'
      });
    }

    // Smooth continuous growth: 0.1 at 0% → 1.0 at 100%
    const targetScale = 0.1 + (this.cloudProgress / 100) * 0.9;

    // Animate to the new scale (no stage jumps)
    this.tweens.add({
      targets: this.cloudGlow,
      scale: targetScale,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  // ═══════════════════════════════════════════════
  //  CLOUD METER  (Depth 5)
  // ═══════════════════════════════════════════════

  private drawCloudMeter() {
    this.cloudMeter.clear();

    const x = METER_X - METER_W / 2;
    const y = METER_Y;

    this.cloudMeter.fillStyle(0x000000, 0.5);
    this.cloudMeter.fillRoundedRect(x, y, METER_W, METER_H, 7);
    this.cloudMeter.lineStyle(1, 0xffffff, 0.2);
    this.cloudMeter.strokeRoundedRect(x, y, METER_W, METER_H, 7);

    const fill = this.cloudProgress / 100;
    if (fill > 0) {
      const innerW = METER_W - 4;
      const innerH = METER_H - 4;
      const fillW = innerW * fill;

      for (let i = 0; i < Math.max(1, fillW / 2); i++) {
        const ratio = i / Math.max(1, fillW / 2 - 1);
        const r = Math.round(80 + ratio * 175);
        const g = Math.round(160 + ratio * 95);
        const b = Math.round(220 + ratio * 35);
        const color = (r << 16) | (g << 8) | b;
        this.cloudMeter.fillStyle(color, 0.85);
        this.cloudMeter.fillRect(x + 2 + i * 2, y + 2, 2, innerH);
      }
    }

    this.meterLabel.setText(`☁️ Cloud ${Math.round(this.cloudProgress)}%`);
  }

  // ═══════════════════════════════════════════════
  //  TIMER & WEATHER
  // ═══════════════════════════════════════════════

  private onTick() {
    if (this.isComplete) return;
    this.timeRemaining--;

    this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
      remaining: this.timeRemaining,
      total: this.TOTAL_TIME
    } satisfies HUDTimerPayload);

    const humidity = Math.round((this.cloudProgress / 100) * 90);
    this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
      temperature: Math.round(22 - this.cloudProgress / 10),
      humidity,
      windSpeed: 5 + Math.round(this.cloudProgress / 20)
    } satisfies HUDWeatherPayload);

    if (this.timeRemaining <= 15 && this.timeRemaining > 0) {
      const alpha = ((15 - this.timeRemaining) / 15) * 0.35;
      this.urgencyOverlay.setAlpha(alpha);
      if (this.timeRemaining <= 10) this.cameras.main.shake(100, 0.003);
    }

    if (this.timeRemaining <= 0) this.failLevel();
  }

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: 'Grow the cloud ☁️',
      progress: Math.min(this.cloudProgress, 100),
      target: 100
    } satisfies HUDObjectivePayload);
  }

  // ═══════════════════════════════════════════════
  //  RESULTS
  // ═══════════════════════════════════════════════

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.vaporSpawnTimer) this.vaporSpawnTimer.remove();
    if (this.condensationCheckTimer) this.condensationCheckTimer.remove();

    const timeBonus = Math.round((this.timeRemaining / this.TOTAL_TIME) * 500);
    const score = 2000 + timeBonus;
    const stars = GameManager.getStars(score, 2500);

    GameManager.getInstance().completeLevel(
      'condensation',
      score,
      stars,
      this.TOTAL_TIME - this.timeRemaining
    );
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['condensation'] || {};
    progress['condensation'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(
        existing.bestTime ?? 999,
        this.TOTAL_TIME - this.timeRemaining
      ),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_condensation']
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(300, 0.008);

    // Cloud pulse
    this.tweens.add({
      targets: this.cloudGlow,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Sky sparkles
    for (let i = 0; i < 25; i++) {
      this.time.delayedCall(i * 40, () => {
        const px = Phaser.Math.Between(80, GAME_WIDTH - 80);
        const py = Phaser.Math.Between(80, 400);
        const spark = this.add
          .circle(px, py, Phaser.Math.Between(3, 7), 0xffffff, 0.6)
          .setDepth(DEPTH.OVERLAY);
        this.tweens.add({
          targets: spark,
          scale: 1.5,
          alpha: 0,
          duration: Phaser.Math.Between(600, 1200),
          onComplete: () => spark.destroy()
        });
      });
    }

    // Wind stream effect on complete
    for (let w = 0; w < 3; w++) {
      this.time.delayedCall(w * 100, () => {
        const wsx = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const wsy = Phaser.Math.Between(80, 500);
        const wstream = this.add
          .image(wsx, wsy, 'wind_stream')
          .setDepth(DEPTH.OVERLAY)
          .setAlpha(0.7)
          .setScale(0.8);
        this.tweens.add({
          targets: wstream,
          x: wsx + Phaser.Math.Between(-200, 200),
          alpha: 0,
          duration: 1000,
          onComplete: () => wstream.destroy()
        });
      });
    }

    const victoryText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Cloud Complete! ☁️', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '36px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      y: GAME_HEIGHT / 2 - 50,
      duration: 500
    });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Cloud Complete!',
      subtitle: 'Condensation formed a beautiful cloud',
      score,
      stars,
      levelId: 'condensation',
      timeUsed: this.TOTAL_TIME - this.timeRemaining,
      factsUnlocked: ['fact_condensation']
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.vaporSpawnTimer) this.vaporSpawnTimer.remove();
    if (this.condensationCheckTimer) this.condensationCheckTimer.remove();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Time's Up!", {
        fontFamily: FONTS.DISPLAY,
        fontSize: '36px',
        color: '#D62828',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail',
      title: "Time's Up!",
      subtitle: 'Not enough vapor condensed',
      score: 0,
      stars: 0,
      levelId: 'condensation',
      timeUsed: this.TOTAL_TIME,
      factsUnlocked: []
    });
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
    if (this.windStreamTimer) this.windStreamTimer.destroy();
    if (this.windGustTimerEvent) this.windGustTimerEvent.destroy();
  }
}
