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

// ── Layout ──
const OCEAN_Y = 580;
const CLOUD_X = GAME_WIDTH / 2;
const CLOUD_Y = 130;
const METER_Y = CLOUD_Y + 70;
const METER_W = 160;
const METER_H = 10;
const VAPOR_SPAWN_Y = OCEAN_Y - 15;
const VAPOR_TARGET_Y = 100;
const ZONE_DETECTION_R = 80;
const COOLDOWN_TIME = 3;

// ── Temperature Layers ──
const ZONE_WARM_TOP = 430;
const ZONE_COLD_TOP = 270;
const SWEET_SPOT_START = 350; // starting center
const SWEET_SPOT_END = 230;   // final center (moves up as cloud grows)
const SWEET_SPOT_RADIUS = 80;
const BOUNDARY_BONUS = 1.5;

// ── Vapor Types ──
type VaporType = 'heavy' | 'light' | 'normal';

interface RisingVapor {
  sprite: Phaser.GameObjects.Text;
  id: number;
  active: boolean;
  vaporType: VaporType;
}

interface CoolZoneData {
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Arc;
  cooldownOverlay: Phaser.GameObjects.Graphics;
  cooldownTimer: number;
  isOnCooldown: boolean;
  detectionRadius: number;
}

export class CondensationScene extends Phaser.Scene {
  private vapors: RisingVapor[] = [];
  private coolZones: CoolZoneData[] = [];
  private cloudProgress = 0;
  private timeRemaining = 75;
  private readonly TOTAL_TIME = 75;
  private isComplete = false;
  private gameStarted = false;
  private nextVaporId = 0;

  private mistLayer!: Phaser.GameObjects.Image;
  private cloudGlow!: Phaser.GameObjects.Image;
  private cloudMeter!: Phaser.GameObjects.Graphics;
  private meterLabel!: Phaser.GameObjects.Text;
  private urgencyOverlay!: Phaser.GameObjects.Rectangle;
  private vaporSpawnTimer!: Phaser.Time.TimerEvent;
  private windStreamTimer!: Phaser.Time.TimerEvent;
  private windGustActive = false;
  private windGustDirection = 0;
  private windGustStrength = 0;
  private windGustTimerEvent!: Phaser.Time.TimerEvent;
  private sweetSpotIndicator!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENES.CONDENSATION });
  }

  // ── Dynamic sweet spot (moves up as cloud grows) ──
  private getSweetSpotCenter(): number {
    const t = this.cloudProgress / 100;
    return Phaser.Math.Linear(SWEET_SPOT_START, SWEET_SPOT_END, t);
  }

  // ═══════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);

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
  //  INTRO
  // ═══════════════════════════════════════════════

  private showIntroOverlay() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'condensation',
      badge: '☁️ LEVEL 2',
      title: 'Build the Clouds',
      subtitle: 'Match vapor type to the right layer!',
      mechanics: [
        { icon: '💧', text: 'HEAVY vapor (blue) — only condenses in WARM layer ↓' },
        { icon: '❄️', text: 'LIGHT vapor (white) — only condenses in COLD layer ↑' },
        { icon: '✨', text: 'NORMAL vapor (clear) — any layer (BONUS in sweet spot)' },
        { icon: '🎯', text: 'Sweet spot moves UP as cloud grows!' },
        { icon: '🎯', text: 'CLICK cool zones to activate a cold burst' },
        { icon: '⏱️', text: '3-second cooldown — time your clicks!' },
        { icon: '💨', text: 'Wind gusts push vapor — plan ahead!' },
        { icon: '☁️', text: 'Reach 100% cloud growth to win!' }
      ]
    } satisfies HUDLevelIntroPayload);

    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;

    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Condensation',
      description: 'Click cool zones → condense vapor!'
    } satisfies HUDLevelInfoPayload);

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.emitObjective();
    this.drawCloudMeter(this.cloudGlow.x);

    this.tweens.add({
      targets: this.meterLabel,
      alpha: 1,
      duration: 500
    });

    this.tweens.add({
      targets: this.mistLayer,
      alpha: { from: 0, to: 0.5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.startCloudDrift();

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 400, () => this.spawnVapor());
    }

    this.vaporSpawnTimer = this.time.addEvent({
      delay: 900,
      callback: () => {
        if (!this.isComplete) this.spawnVapor();
      },
      loop: true
    });

    this.time.addEvent({
      delay: 1000,
      callback: () => this.onTick(),
      loop: true
    });

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

    this.spawnWindStream();
    this.windStreamTimer = this.time.addEvent({
      delay: 2500,
      callback: () => {
        if (!this.isComplete) this.spawnWindStream();
      },
      loop: true
    });

    const firstGustDelay = Phaser.Math.Between(6000, 10000);
    this.time.delayedCall(firstGustDelay, () => {
      if (!this.isComplete) this.startWindGust();
      this.scheduleNextGust();
    });
  };

  // ═══════════════════════════════════════════════
  //  BUILD SCENE
  // ═══════════════════════════════════════════════

  private buildScene() {
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'condensation_sky')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a2e, 0.2)
      .setDepth(0);

    this.urgencyOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setDepth(0);

    // Ocean
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

    // Temperature layer overlay
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'temperature_layer_overlay')
      .setDepth(1.2)
      .setAlpha(0.4)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Sweet spot indicator (pulsing line that moves up)
    this.sweetSpotIndicator = this.add.graphics().setDepth(1.4).setAlpha(0);

    // Mist
    this.mistLayer = this.add
      .image(GAME_WIDTH / 2, OCEAN_Y - 130, 'mist_layer')
      .setDepth(1.5)
      .setAlpha(0)
      .setDisplaySize(GAME_WIDTH, 260);

    // Cloud
    this.cloudGlow = this.add
      .image(CLOUD_X, CLOUD_Y, 'cloud_glow')
      .setDepth(4)
      .setAlpha(0)
      .setScale(0.1);

    // Meter
    this.cloudMeter = this.add.graphics().setDepth(5);
    this.meterLabel = this.add
      .text(CLOUD_X, METER_Y + METER_H + 6, '☁️ Cloud 0%', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '12px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(5)
      .setAlpha(0);

    // Cool zones
    this.createCoolZone(350, 340);
    this.createCoolZone(640, 380);
    this.createCoolZone(930, 320);

    // Hint
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '🎯 Drag zone → position it | Click zone → activate cold burst', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '13px',
        color: '#87CEEB',
        stroke: '#000000',
        strokeThickness: 3
      })
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
  //  SWEET SPOT INDICATOR
  // ═══════════════════════════════════════════════

  private drawSweetSpotIndicator() {
    this.sweetSpotIndicator.clear();
    const sy = this.getSweetSpotCenter();

    // Pulsing horizontal line at sweet spot center
    this.sweetSpotIndicator.lineStyle(2, 0xffd166, 0.4);
    this.sweetSpotIndicator.beginPath();
    this.sweetSpotIndicator.moveTo(GAME_WIDTH / 2 - 60, sy);
    this.sweetSpotIndicator.lineTo(GAME_WIDTH / 2 + 60, sy);
    this.sweetSpotIndicator.strokePath();

    // Small diamond markers at ends
    for (const dir of [-1, 1]) {
      const mx = GAME_WIDTH / 2 + dir * 60;
      this.sweetSpotIndicator.fillStyle(0xffd166, 0.5);
      this.sweetSpotIndicator.fillTriangle(mx - 4, sy, mx + 4, sy, mx, sy - 6);
      this.sweetSpotIndicator.fillTriangle(mx - 4, sy, mx + 4, sy, mx, sy + 6);
    }

    // Pulse alpha
    if (this.sweetSpotIndicator.alpha === 0) {
      this.tweens.add({
        targets: this.sweetSpotIndicator,
        alpha: 1,
        duration: 600,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  CLOUD DRIFT
  // ═══════════════════════════════════════════════

  private startCloudDrift() {
    const driftRange = 80;
    this.tweens.add({
      targets: this.cloudGlow,
      x: CLOUD_X + driftRange,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.meterLabel,
      x: CLOUD_X + driftRange,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ═══════════════════════════════════════════════
  //  COOL AIR ZONES
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

    const glow = this.add.circle(x, y, 35, 0x4fc3f7, 0.08).setDepth(2);
    this.tweens.add({
      targets: glow,
      alpha: 0.2,
      scale: 1.1,
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    const cooldownOverlay = this.add.graphics().setDepth(3);
    this.drawCooldownOverlay(cooldownOverlay, x, y, 0);

    let wasDragged = false;

    sprite.on('dragstart', () => {
      wasDragged = false;
      sprite.setScale(SCALE * 1.12);
      label.setScale(1.12);
      sprite.setDepth(4);
    });

    sprite.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      wasDragged = true;
      const cx = Phaser.Math.Clamp(dragX, 50, GAME_WIDTH - 50);
      const cy = Phaser.Math.Clamp(dragY, 120, OCEAN_Y - 50);
      sprite.setPosition(cx, cy);
      label.setPosition(cx, cy);
      glow.setPosition(cx, cy);
      cooldownOverlay.setPosition(0, 0);
      this.drawCooldownOverlay(cooldownOverlay, cx, cy, 0);
    });

    sprite.on('dragend', () => {
      sprite.setScale(SCALE);
      label.setScale(1);
      sprite.setDepth(3);
    });

    // Activate on click (not drag)
    sprite.on('pointerup', () => {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      this.activateZone(
        { sprite, label, glow, cooldownOverlay, cooldownTimer: 0, isOnCooldown: false, detectionRadius: ZONE_DETECTION_R },
        sprite.x, sprite.y
      );
    });

    this.coolZones.push({
      sprite, label, glow, cooldownOverlay,
      cooldownTimer: 0, isOnCooldown: false,
      detectionRadius: ZONE_DETECTION_R
    });
  }

  // ═══════════════════════════════════════════════
  //  COOLDOWN OVERLAY
  // ═══════════════════════════════════════════════

  private drawCooldownOverlay(gfx: Phaser.GameObjects.Graphics, x: number, y: number, cooldown: number) {
    gfx.clear();
    if (cooldown <= 0) return;

    const radius = 22;
    const pct = cooldown / COOLDOWN_TIME;

    gfx.fillStyle(0x000000, 0.4);
    gfx.fillCircle(x, y, radius);

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Phaser.Math.PI2 * (1 - pct);
    gfx.lineStyle(3, 0x4fc3f7, 0.7);
    gfx.beginPath();
    gfx.arc(x, y, radius - 3, startAngle, endAngle, false);
    gfx.strokePath();
  }

  // ═══════════════════════════════════════════════
  //  ACTIVATE ZONE
  // ═══════════════════════════════════════════════

  private activateZone(zone: CoolZoneData, zx: number, zy: number) {
    if (this.isComplete || !this.gameStarted) return;
    if (zone.isOnCooldown) return;

    // Flash
    zone.sprite.setTint(0xaee8ff);
    this.time.delayedCall(200, () => zone.sprite.clearTint());

    // Burst ring
    const burstRing = this.add.circle(zx, zy, 10, 0x4fc3f7, 0).setDepth(4);
    burstRing.setStrokeStyle(3, 0x81d4fa, 0.6);
    this.tweens.add({
      targets: burstRing,
      radius: zone.detectionRadius,
      alpha: 0,
      duration: 400,
      onComplete: () => burstRing.destroy()
    });

    // Sparkles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Phaser.Math.PI2;
      const spark = this.add.circle(zx, zy, 2, 0x81d4fa, 0.7).setDepth(4);
      this.tweens.add({
        targets: spark,
        x: zx + Math.cos(angle) * Phaser.Math.Between(15, 35),
        y: zy + Math.sin(angle) * Phaser.Math.Between(15, 35),
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => spark.destroy()
      });
    }

    // ── Determine which layer this zone is in ──
    const isWarmLayer = zy >= ZONE_WARM_TOP;
    const isColdLayer = zy <= ZONE_COLD_TOP;
    const isTransitionLayer = !isWarmLayer && !isColdLayer;

    // Check nearby vapor — only condense if type matches zone layer
    let condensed = 0;
    for (let vi = this.vapors.length - 1; vi >= 0; vi--) {
      const vapor = this.vapors[vi];
      if (!vapor.active || !vapor.sprite.active) continue;

      const dist = Phaser.Math.Distance.Between(vapor.sprite.x, vapor.sprite.y, zx, zy);
      if (dist >= zone.detectionRadius) continue;

      // ── Layer-type matching ──
      const vt = vapor.vaporType;
      let canCondense = false;

      if (vt === 'heavy' && isWarmLayer) canCondense = true;
      else if (vt === 'light' && isColdLayer) canCondense = true;
      else if (vt === 'normal' && isTransitionLayer) canCondense = true;
      else if (vt === 'normal' && (isWarmLayer || isColdLayer)) canCondense = true; // normal works anywhere

      if (!canCondense) continue;

      const sweetSpotCenter = this.getSweetSpotCenter();
      const isInSweetSpot = Math.abs(zy - sweetSpotCenter) <= SWEET_SPOT_RADIUS;
      this.condenseVapor(vapor, isInSweetSpot, vapor.sprite.y);
      condensed++;
    }

    if (condensed === 0) {
      // Show why — different messages based on vapor nearby but wrong type
      const hasWrongType = this.vapors.some(v =>
        v.active && v.sprite.active &&
        Phaser.Math.Distance.Between(v.sprite.x, v.sprite.y, zx, zy) < zone.detectionRadius
      );

      const missText = this.add
        .text(zx, zy - 20, hasWrongType ? '❌ Wrong layer!' : '💨 Miss!', {
          fontFamily: FONTS.DISPLAY,
          fontSize: '12px',
          color: hasWrongType ? '#FF8A65' : '#90A4AE',
          stroke: '#000000',
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.tweens.add({
        targets: missText,
        y: zy - 45,
        alpha: 0,
        duration: 600,
        onComplete: () => missText.destroy()
      });
    }

    // ── Start cooldown ──
    zone.isOnCooldown = true;
    zone.cooldownTimer = COOLDOWN_TIME;
    this.drawCooldownOverlay(zone.cooldownOverlay, zx, zy, COOLDOWN_TIME);
    zone.label.setText('⏳');
    zone.label.setColor('#90A4AE');

    const cooldownInterval = this.time.addEvent({
      delay: 1000,
      repeat: COOLDOWN_TIME - 1,
      callback: () => {
        if (zone.isOnCooldown) {
          zone.cooldownTimer--;
          this.drawCooldownOverlay(zone.cooldownOverlay, zx, zy, zone.cooldownTimer);
          if (zone.cooldownTimer <= 0) {
            zone.isOnCooldown = false;
            zone.label.setText('❄');
            zone.label.setColor('#E3F2FD');
            this.drawCooldownOverlay(zone.cooldownOverlay, zx, zy, 0);
            cooldownInterval.destroy();
          }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  WIND GUST
  // ═══════════════════════════════════════════════

  private startWindGust() {
    if (this.isComplete) return;
    this.windGustActive = true;
    this.windGustDirection = Math.random() > 0.5 ? 1 : -1;
    this.windGustStrength = Phaser.Math.Between(140, 220);

    const dirText = this.windGustDirection === 1 ? '→ WIND GUST →' : '← WIND GUST ←';
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
      alpha: 1, scale: 1.1,
      duration: 300,
      yoyo: true,
      hold: 600,
      onComplete: () => {
        this.tweens.add({
          targets: warn,
          alpha: 0, duration: 800,
          onComplete: () => warn.destroy()
        });
      }
    });

    for (const v of this.vapors) {
      if (!v.active || !v.sprite.active) continue;
      this.tweens.add({
        targets: v.sprite,
        x: v.sprite.x + this.windGustDirection * this.windGustStrength,
        duration: 2800,
        ease: 'Sine.easeInOut'
      });
    }

    this.time.delayedCall(4500, () => {
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
  //  VAPOR
  // ═══════════════════════════════════════════════

  private spawnVapor() {
    if (this.isComplete) return;
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const startY = VAPOR_SPAWN_Y + Phaser.Math.Between(-10, 10);
    const finalY = VAPOR_TARGET_Y + Phaser.Math.Between(-20, 20);

    // ── Random vapor type ──
    const roll = Math.random();
    const vaporType: VaporType = roll < 0.3 ? 'heavy' : roll < 0.6 ? 'light' : 'normal';

    const emoji = vaporType === 'heavy' ? '💧' : vaporType === 'light' ? '❄️' : '✨';
    const sprite = this.add
      .text(x, startY, emoji, {
        fontFamily: FONTS.BODY,
        fontSize: '17px'
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0.85);

    const id = this.nextVaporId++;
    const vapor: RisingVapor = { sprite, id, active: true, vaporType };
    this.vapors.push(vapor);

    const targetX = x + Phaser.Math.Between(-100, 100);
    const segs: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    if (startY > ZONE_WARM_TOP) {
      segs.push({
        targets: sprite,
        y: ZONE_WARM_TOP,
        x: Phaser.Math.Linear(x, targetX, 0.4),
        duration: Phaser.Math.Between(800, 1200),
        ease: 'Sine.easeOut'
      });
    }

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

    segs.push({
      targets: sprite,
      y: finalY,
      x: targetX,
      duration: Phaser.Math.Between(2500, 3500),
      ease: 'Sine.easeIn'
    });

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
  //  WIND STREAMS
  // ═══════════════════════════════════════════════

  private spawnWindStream() {
    if (this.isComplete) return;
    const y = Phaser.Math.Between(160, 520);
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -100 : GAME_WIDTH + 100;
    const endX = fromLeft ? GAME_WIDTH + 100 : -100;

    const sprite = this.add
      .image(startX, y, 'wind_stream')
      .setDepth(2)
      .setAlpha(0);

    const scale = Phaser.Math.FloatBetween(0.08, 0.2);
    sprite.setScale(scale);
    if (Math.random() > 0.5) sprite.setFlipX(true);

    const driftY = y + Phaser.Math.Between(-40, 40);
    const duration = Phaser.Math.Between(4000, 8000);

    this.tweens.add({
      targets: sprite,
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.12, 0.3) },
      duration: 600,
      ease: 'Sine.easeIn'
    });
    this.tweens.add({
      targets: sprite,
      x: endX, y: driftY, alpha: 0,
      duration,
      ease: 'Sine.easeInOut',
      delay: 500,
      onComplete: () => sprite.destroy()
    });
  }

  // ═══════════════════════════════════════════════
  //  CONDENSE VAPOR
  // ═══════════════════════════════════════════════

  private condenseVapor(vapor: RisingVapor, inSweetSpot: boolean, vy: number) {
    vapor.active = false;
    const idx = this.vapors.indexOf(vapor);
    if (idx >= 0) this.vapors.splice(idx, 1);

    const vx = vapor.sprite.x;

    this.tweens.add({
      targets: vapor.sprite,
      scale: 1.8, alpha: 0,
      duration: 200,
      onComplete: () => vapor.sprite.destroy()
    });

    const effect = this.add
      .image(vx, vy, 'condensation_effect')
      .setDepth(5)
      .setScale(0.1)
      .setAlpha(0.3);
    this.tweens.add({
      targets: effect,
      scale: 0.8, alpha: 0,
      duration: 400,
      onComplete: () => effect.destroy()
    });

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Phaser.Math.PI2;
      const spark = this.add.circle(vx, vy, 2, 0x06d6a0, 0.8).setDepth(5);
      this.tweens.add({
        targets: spark,
        x: vx + Math.cos(angle) * Phaser.Math.Between(20, 35),
        y: vy + Math.sin(angle) * Phaser.Math.Between(20, 35),
        alpha: 0, scale: 0.2,
        duration: 350,
        onComplete: () => spark.destroy()
      });
    }

    const ring = this.add.circle(vx, vy, 8, 0x4fc3f7, 0).setDepth(5);
    ring.setStrokeStyle(1.5, 0x4fc3f7, 0.5);
    this.tweens.add({
      targets: ring,
      radius: 25, alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy()
    });

    // ── Score ──
    const baseGain = Phaser.Math.Between(4, 6);
    const gain = inSweetSpot ? Math.round(baseGain * BOUNDARY_BONUS) : baseGain;
    const isBonus = gain > baseGain;

    this.cloudProgress = Math.min(100, this.cloudProgress + gain);
    this.updateCloudVisual();
    this.drawCloudMeter(this.cloudGlow.x);
    this.drawSweetSpotIndicator();
    this.emitObjective();

    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: Math.round((this.cloudProgress / 100) * 2000),
      label: 'Condensation'
    } satisfies HUDScorePayload);

    const popText = this.add
      .text(vx, vy - 20, isBonus ? `✨ +${gain}% SWEET SPOT!` : `+${gain}% ☁️`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: isBonus ? '14px' : '15px',
        color: isBonus ? '#FFD166' : '#06D6A0',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: popText,
      y: vy - 55, alpha: 0,
      duration: isBonus ? 1000 : 700,
      onComplete: () => popText.destroy()
    });

    if (isBonus) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Phaser.Math.PI2;
        const star = this.add.circle(vx, vy, 2.5, 0xffd166, 0.9).setDepth(5);
        this.tweens.add({
          targets: star,
          x: vx + Math.cos(angle) * Phaser.Math.Between(30, 50),
          y: vy + Math.sin(angle) * Phaser.Math.Between(30, 50),
          alpha: 0, scale: 0.2,
          duration: 500,
          onComplete: () => star.destroy()
        });
      }
    }

    if (this.cloudProgress >= 100) this.completeLevel();
  }

  // ═══════════════════════════════════════════════
  //  CLOUD VISUAL
  // ═══════════════════════════════════════════════

  private updateCloudVisual() {
    if (this.cloudGlow.alpha === 0 && this.cloudProgress > 0) {
      this.tweens.add({
        targets: this.cloudGlow,
        alpha: 1,
        duration: 500,
        ease: 'Sine.easeOut'
      });
    }
    const targetScale = 0.1 + (this.cloudProgress / 100) * 0.9;
    this.tweens.add({
      targets: this.cloudGlow,
      scale: targetScale,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  // ═══════════════════════════════════════════════
  //  CLOUD METER
  // ═══════════════════════════════════════════════

  private drawCloudMeter(cx: number) {
    this.cloudMeter.clear();
    const x = cx - METER_W / 2;
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
        this.cloudMeter.fillStyle((r << 16) | (g << 8) | b, 0.85);
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
      this.urgencyOverlay.setAlpha(((15 - this.timeRemaining) / 15) * 0.35);
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

    const timeBonus = Math.round((this.timeRemaining / this.TOTAL_TIME) * 500);
    const score = 2000 + timeBonus;
    const stars = GameManager.getStars(score, 2500);

    GameManager.getInstance().completeLevel('condensation', score, stars, this.TOTAL_TIME - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['condensation'] || {};
    progress['condensation'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.TOTAL_TIME - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_condensation']
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(300, 0.008);

    this.tweens.add({
      targets: this.cloudGlow,
      scaleX: 1.15, scaleY: 1.15,
      duration: 300, yoyo: true,
      ease: 'Sine.easeInOut'
    });

    for (let i = 0; i < 25; i++) {
      this.time.delayedCall(i * 40, () => {
        const px = Phaser.Math.Between(80, GAME_WIDTH - 80);
        const py = Phaser.Math.Between(80, 400);
        const spark = this.add.circle(px, py, Phaser.Math.Between(3, 7), 0xffffff, 0.6)
          .setDepth(DEPTH.OVERLAY);
        this.tweens.add({
          targets: spark,
          scale: 1.5, alpha: 0,
          duration: Phaser.Math.Between(600, 1200),
          onComplete: () => spark.destroy()
        });
      });
    }

    const victoryText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Cloud Complete! ☁️', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '36px', color: '#06D6A0',
        stroke: '#000000', strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0);
    this.tweens.add({
      targets: victoryText,
      alpha: 1, y: GAME_HEIGHT / 2 - 50,
      duration: 500
    });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete', title: 'Cloud Complete!',
      subtitle: 'Condensation formed a beautiful cloud',
      score, stars, levelId: 'condensation',
      timeUsed: this.TOTAL_TIME - this.timeRemaining,
      factsUnlocked: ['fact_condensation']
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.vaporSpawnTimer) this.vaporSpawnTimer.remove();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Time's Up!", {
        fontFamily: FONTS.DISPLAY,
        fontSize: '36px', color: '#D62828',
        stroke: '#000000', strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail', title: "Time's Up!",
      subtitle: 'Not enough vapor condensed',
      score: 0, stars: 0, levelId: 'condensation',
      timeUsed: this.TOTAL_TIME, factsUnlocked: []
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