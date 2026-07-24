import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDTimerPayload,
  HUDObjectivePayload,
  HUDLevelInfoPayload,
  HUDWeatherPayload,
  HUDLevelIntroPayload
} from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

const SUN_X = 160;
const SUN_Y = 200;
const OCEAN_TOP_Y = 510;
const VAPOR_TARGET = 30;
const COMBO_WINDOW = 600;
const CLOUD_HP = 5;
const STEAM_PRESSURE_RATE = 3; // per tick (300ms)

export class EvaporationScene extends Phaser.Scene {
  private sunHeat = 0;
  private vaporCount = 0;
  private timeRemaining = 60;
  private totalTime = 60;
  private isComplete = false;
  private overheatCount = 0;

  // Combo
  private lastClickTime = 0;
  private combo = 0;
  private comboText!: Phaser.GameObjects.Text;

  // ── Cloud cover ──
  private cloudCover: Phaser.GameObjects.Image | null = null;
  private cloudHp = 0;
  private isClouded = false;
  private cloudRaindrops: Phaser.GameObjects.Rectangle[] = [];

  // ── Steam pressure ──
  private steamPressure = 0;
  private steamBar!: Phaser.GameObjects.Graphics;

  // ── Wind ──
  private windDirection = 0; // -1, 0, or 1
  private windIndicator!: Phaser.GameObjects.Text;

  // Visual refs
  private sunImg!: Phaser.GameObjects.Image;
  private sunGlow!: Phaser.GameObjects.Arc;
  private sunRays!: Phaser.GameObjects.Graphics;
  private heatBar!: Phaser.GameObjects.Graphics;
  private urgencyOverlay!: Phaser.GameObjects.Rectangle;
  private cloud1!: Phaser.GameObjects.Image;
  private cloud2!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: SCENES.EVAPORATION });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);

    this.sunHeat = 0;
    this.vaporCount = 0;
    this.overheatCount = 0;
    this.timeRemaining = 60;
    this.totalTime = 60;
    this.isComplete = false;
    this.lastClickTime = 0;
    this.combo = 0;
    this.steamPressure = 0;
    this.windDirection = 0;
    this.isClouded = false;
    this.cloudHp = 0;

    this.buildScene();
    this.showIntroOverlay();
    this.setupSunInteraction();
  }

  // ─────────────────────────────────────────────
  //  Level intro overlay (React side)
  // ─────────────────────────────────────────────

  private showIntroOverlay() {
    // Emit intro data to React retro-card overlay
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'evaporation',
      badge: '⚡ LEVEL 1',
      title: 'Evaporation',
      subtitle: 'Heat the sun, collect vapor, fuel the storm!',
      mechanics: [
        { icon: '☀️', text: 'Click the sun to heat the ocean' },
        { icon: '💧', text: 'Click vapor bubbles to collect them' },
        { icon: '☁️', text: 'Click storm clouds to clear them away' },
        { icon: '🌡️', text: 'Keep the steam pressure from exploding!' },
        { icon: '💨', text: 'Wind pushes bubbles — adapt!' }
      ]
    } satisfies HUDLevelIntroPayload);

    // Wait for dismiss before starting game
    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    // ── HUD info ──
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Evaporation',
      description: 'Click sun → pop vapor bubbles!'
    } satisfies HUDLevelInfoPayload);

    this.emitObjective();
    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);

    // ── Tick loops ──
    this.time.addEvent({ delay: 300, callback: () => this.coolSun(), loop: true });
    this.time.addEvent({ delay: 200, callback: () => this.decayCombo(), loop: true });
    this.time.addEvent({ delay: 300, callback: () => this.tickSteamPressure(), loop: true });
    this.time.addEvent({ delay: 1000, callback: () => this.onTick(), loop: true });

    // Cloud cover spawner
    this.time.addEvent({
      delay: Phaser.Math.Between(8000, 14000),
      callback: () => this.spawnCloudCover(),
      loop: false
    });

    // Wind changer
    this.time.addEvent({ delay: 5000, callback: () => this.changeWind(), loop: true });
  }

  // ─────────────────────────────────────────────
  //  Build scene
  // ─────────────────────────────────────────────

  private buildScene() {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'evap_sky')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);

    this.urgencyOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0
    ).setDepth(0);

    this.sunGlow = this.add.circle(SUN_X, SUN_Y, 60, COLORS.ACCENT_YELLOW, 0).setDepth(0);
    this.sunRays = this.add.graphics().setDepth(0).setAlpha(0);

    this.sunImg = this.add.image(SUN_X, SUN_Y, 'evap_sun').setScale(0.35).setDepth(1);

    this.cloud1 = this.add.image(300, 140, 'evap_clouds').setScale(0.6).setDepth(2);
    this.cloud2 = this.add.image(950, 110, 'evap_clouds').setScale(0.45).setDepth(2);

    this.tweens.add({ targets: this.cloud1, x: 350, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.cloud2, x: 880, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.image(GAME_WIDTH / 2, 420, 'evap_island').setScale(0.8).setDepth(3);
    const ocean = this.add.image(GAME_WIDTH / 2, 650, 'evap_ocean').setDisplaySize(GAME_WIDTH, 280).setDepth(4);
    // Gentle ocean sway
    this.tweens.add({
      targets: ocean, x: GAME_WIDTH / 2 + 12, duration: 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // ── Heat bar ──
    this.heatBar = this.add.graphics().setDepth(5);
    this.drawHeatBar();

    // ── Steam pressure bar ──
    this.steamBar = this.add.graphics().setDepth(5);
    this.drawSteamBar();

    // ── Wind indicator ──
    this.windIndicator = this.add
      .text(GAME_WIDTH - 120, 50, '💨 →', {
        fontFamily: FONTS.BODY,
        fontSize: '16px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setDepth(10)
      .setAlpha(0.5);

    // Combo text
    this.comboText = this.add
      .text(SUN_X + 80, SUN_Y, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '28px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  // ─────────────────────────────────────────────
  //  Sun interaction
  // ─────────────────────────────────────────────

  private setupSunInteraction() {
    const hitZone = this.add
      .circle(SUN_X, SUN_Y, 80, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    hitZone.on('pointerdown', () => this.clickSun());

    this.tweens.add({
      targets: this.sunImg,
      scaleX: 0.37, scaleY: 0.37,
      duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  private clickSun() {
    if (this.isComplete) return;
    if (this.sunHeat >= 100) return;

    // ── Cloud block ──
    if (this.isClouded) return; // can't heat sun when cloud covers it

    // ── Combo ──
    const now = this.time.now;
    if (now - this.lastClickTime < COMBO_WINDOW) {
      this.combo = Math.min(this.combo + 1, 10);
    } else {
      this.combo = 0;
    }
    this.lastClickTime = now;

    if (this.combo >= 2) this.showComboPopup();

    // ── Heat ──
    this.sunHeat = Math.min(100, this.sunHeat + 10);
    this.updateSunVisual();

    // Sun bounce
    this.tweens.add({
      targets: this.sunImg,
      scaleX: this.sunImg.scaleX * 1.1,
      scaleY: this.sunImg.scaleY * 1.1,
      duration: 80, yoyo: true, ease: 'Quad.easeOut'
    });

    // ── Click burst: flash rays on each click ──
    this.burstRays();

    // ── Vapor ──
    if (this.sunHeat >= 60) {
      this.spawnVaporBubbles();
    }

    if (this.sunHeat >= 100) {
      this.overheatSun();
    }
  }

  private coolSun() {
    if (this.isComplete) return;
    if (this.sunHeat <= 0) return;

    // Cool faster when clouded
    const rate = this.isClouded ? 4 : (this.timeRemaining <= 15 ? 2 : 1);
    this.sunHeat = Math.max(0, this.sunHeat - rate);
    this.updateSunVisual();
  }

  private decayCombo() {
    if (this.isComplete || this.combo <= 0) return;
    if (this.time.now - this.lastClickTime > COMBO_WINDOW) {
      this.combo = Math.max(0, this.combo - 1);
      if (this.combo <= 1) this.comboText.setAlpha(0);
    }
  }

  // ─────────────────────────────────────────────
  //  ☁️  Cloud Cover
  // ─────────────────────────────────────────────

  private spawnCloudCover() {
    if (this.isComplete || this.isClouded) return;
    this.isClouded = true;
    this.cloudHp = CLOUD_HP;

    // Storm cloud image over the sun (tinted dark)
    this.cloudCover = this.add.image(SUN_X + 150, SUN_Y, 'evap_clouds')
      .setScale(0.7)
      .setTint(0x444466)
      .setAlpha(0)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    // Slide in from the right
    this.tweens.add({
      targets: this.cloudCover,
      x: SUN_X,
      alpha: 0.9,
      duration: 500,
      ease: 'Quad.easeOut'
    });

    // Click to clear
    this.cloudCover!.on('pointerdown', () => this.hitCloud());

    // Rain drops from the cloud
    for (let i = 0; i < 6; i++) {
      const drop = this.add.rectangle(
        SUN_X + Phaser.Math.Between(-50, 50),
        SUN_Y + Phaser.Math.Between(-20, 100),
        2, Phaser.Math.Between(8, 16),
        COLORS.OCEAN_LIGHT, 0.6
      ).setDepth(3);

      this.tweens.add({
        targets: drop,
        y: drop.y + Phaser.Math.Between(20, 50),
        alpha: 0,
        duration: Phaser.Math.Between(400, 800),
        repeat: -1,
        delay: Phaser.Math.Between(0, 300)
      });

      this.cloudRaindrops.push(drop);
    }

    // Warning text
    const warn = this.add.text(SUN_X, SUN_Y - 120, '☁️ Click storm cloud to clear!', {
      fontFamily: FONTS.BODY,
      fontSize: '14px',
      color: '#FFD166',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({ targets: warn, alpha: 0, duration: 2000, onComplete: () => warn.destroy() });

    // Auto-despawn after 6s if not cleared
    this.time.delayedCall(6000, () => {
      if (this.isClouded) this.clearCloud();
    });

    // Schedule next cloud
    this.time.delayedCall(Phaser.Math.Between(10000, 18000), () => this.spawnCloudCover());
  }

  private hitCloud() {
    if (!this.isClouded || !this.cloudCover) return;

    this.cloudHp--;

    // Shake feedback
    this.tweens.add({
      targets: this.cloudCover,
      x: Phaser.Math.Between(-4, 4),
      y: Phaser.Math.Between(-2, 2),
      duration: 40, yoyo: true, repeat: 2
    });

    if (this.cloudHp <= 0) {
      this.clearCloud();
    }
  }

  private clearCloud() {
    this.isClouded = false;

    if (this.cloudCover) {
      // Slide away to the right + fade
      this.tweens.add({
        targets: this.cloudCover,
        x: this.cloudCover.x + 200,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.cloudCover?.destroy();
          this.cloudCover = null;
        }
      });
    }

    // Raindrops fade out
    this.cloudRaindrops.forEach(d => {
      this.tweens.add({ targets: d, alpha: 0, duration: 300 });
    });
    this.time.delayedCall(300, () => {
      this.cloudRaindrops.forEach(d => d.destroy());
      this.cloudRaindrops = [];
    });

    // Sun peeks out effect
    this.cameras.main.flash(200, 255, 255, 150);
  }

  // ─────────────────────────────────────────────
  //  💨  Wind
  // ─────────────────────────────────────────────

  private changeWind() {
    this.windDirection = Phaser.Math.Between(-1, 1);

    const arrows = ['←', '—', '→'];
    this.windIndicator.setText(`💨 ${arrows[this.windDirection + 1]}`);

    // Flash wind
    this.tweens.add({
      targets: this.windIndicator,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 600
    });
  }

  // ─────────────────────────────────────────────
  //  💧  Vapor bubbles (click to collect)
  // ─────────────────────────────────────────────

  private spawnVaporBubbles() {
    const baseCount = 1 + Math.floor(this.sunHeat / 25);
    const comboBonus = Math.floor(this.combo / 3);
    const count = Math.min(baseCount + comboBonus, 6);

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 120, () => {
        this.createVaporBubble();
      });
    }
  }

  private createVaporBubble() {
    const margin = 100;
    const px = Phaser.Math.Between(margin, GAME_WIDTH - margin);
    const py = OCEAN_TOP_Y + Phaser.Math.Between(-5, 20);
    const radius = Phaser.Math.Between(10, 18);

    // Glow behind bubble
    const glow = this.add
      .circle(px, py, radius + 6, 0x6db3e6, 0.15)
      .setDepth(6);

    // Bubble body
    const bubble = this.add
      .circle(px, py, radius, COLORS.OCEAN_LIGHT, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    // White highlight
    const highlight = this.add
      .circle(px - radius * 0.25, py - radius * 0.25, radius * 0.3, 0xffffff, 0.5)
      .setDepth(7);

    // Collect on click
    bubble.on('pointerdown', () => {
      if (this.isComplete) return;

      // Pop animation
      this.tweens.add({
        targets: [bubble, glow],
        scale: 1.5,
        alpha: 0,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: highlight,
        alpha: 0,
        duration: 100
      });

      bubble.disableInteractive();

      // Score + vapor count
      this.vaporCount++;
      this.emitObjective();
      const score = Math.max(0, 2000 - this.overheatCount * 200);
      this.game.events.emit(GAME_EVENTS.HUD_SCORE, { score, label: 'Vapor' });

      // Pop text
      const popText = this.add.text(px, py - 15, '+1', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '18px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(10);

      this.tweens.add({
        targets: popText,
        y: py - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => { popText.destroy(); }
      });

      // Confetti spark
      for (let s = 0; s < 3; s++) {
        const spark = this.add.circle(px, py, 3, 0x06d6a0, 0.8).setDepth(7);
        this.tweens.add({
          targets: spark,
          x: px + Phaser.Math.Between(-20, 20),
          y: py + Phaser.Math.Between(-20, 20),
          alpha: 0,
          scale: 0.2,
          duration: 300,
          onComplete: () => spark.destroy()
        });
      }

      // Milestone burst
      if (this.vaporCount % 5 === 0 && this.vaporCount > 0) {
        this.milestoneBurst();
      }

      if (this.vaporCount >= VAPOR_TARGET) {
        this.completeLevel();
      }
    });

    // Float up tween
    const windDrift = this.windDirection * Phaser.Math.Between(40, 100);
    this.tweens.add({
      targets: [bubble, glow, highlight],
      y: py - Phaser.Math.Between(250, 400),
      x: px + windDrift + Phaser.Math.Between(-30, 30),
      duration: Phaser.Math.Between(3000, 5000),
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const p = tween.progress;
        bubble.setAlpha(0.55 * (1 - p * 0.5));
        glow.setAlpha(0.15 * (1 - p));
        highlight.setAlpha(0.5 * (1 - p * 0.6));
      },
      onComplete: () => {
        // Bubble escaped — no vapor collected
        bubble.destroy();
        glow.destroy();
        highlight.destroy();
      }
    });
  }

  // ─────────────────────────────────────────────
  //  🌡️  Steam pressure
  // ─────────────────────────────────────────────

  private tickSteamPressure() {
    if (this.isComplete) return;
    if (this.sunHeat >= 80) {
      this.steamPressure = Math.min(100, this.steamPressure + STEAM_PRESSURE_RATE);
      this.drawSteamBar();

      if (this.steamPressure >= 100) {
        this.steamExplosion();
      }
    } else {
      // Slowly vent when cool
      this.steamPressure = Math.max(0, this.steamPressure - 2);
      this.drawSteamBar();
    }
  }

  private drawSteamBar() {
    this.steamBar.clear();

    const barX = GAME_WIDTH / 2 - 100;
    const barY = 490;
    const barW = 200;
    const barH = 8;

    // Only visible when pressure > 0
    if (this.steamPressure <= 0) return;

    const fill = this.steamPressure / 100;

    this.steamBar.fillStyle(0x000000, 0.5);
    this.steamBar.fillRoundedRect(barX, barY, barW, barH, 4);

    const color = this.steamPressure >= 80 ? COLORS.WARNING_RED : COLORS.WARNING_ORANGE;
    this.steamBar.fillStyle(color, 0.8);
    this.steamBar.fillRoundedRect(barX + 1, barY + 1, (barW - 2) * fill, barH - 2, 3);
  }

  private steamExplosion() {
    this.steamPressure = 0;
    this.drawSteamBar();

    // Lose vapor!
    const lost = Math.min(3, this.vaporCount);
    this.vaporCount = Math.max(0, this.vaporCount - lost);
    this.emitObjective();

    // Visual feedback
    this.cameras.main.shake(400, 0.015);

    const boom = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '💥 PRESSURE BURST!', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '24px',
      color: '#FF4444',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.tweens.add({
      targets: boom,
      alpha: 0,
      y: boom.y - 30,
      duration: 1500,
      onComplete: () => boom.destroy()
    });

    // Red flash around sun
    this.sunImg.setTint(0xff4444);
    this.time.delayedCall(300, () => this.sunImg.clearTint());
  }

  // ─────────────────────────────────────────────
  //  Sun visuals
  // ─────────────────────────────────────────────

  private updateSunVisual() {
    const scale = 0.35 + (this.sunHeat / 100) * 0.25;
    this.sunImg.setScale(scale);

    if (this.sunHeat > 0) {
      const glowAlpha = (this.sunHeat / 100) * 0.5;
      const glowRadius = 50 + (this.sunHeat / 100) * 80;
      this.sunGlow.setAlpha(glowAlpha);
      this.sunGlow.setRadius(glowRadius);
    } else {
      this.sunGlow.setAlpha(0);
    }

    if (this.sunHeat >= 40) {
      this.drawRays(((this.sunHeat - 40) / 60) * 0.7);
    } else {
      this.sunRays.clear();
      this.sunRays.setAlpha(0);
    }

    this.drawHeatBar();
  }

  private drawRays(alpha: number) {
    this.sunRays.clear();
    this.sunRays.setAlpha(alpha);
    this.sunRays.setDepth(0);

    const rayCount = 8 + Math.floor((this.sunHeat / 100) * 4);
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Phaser.Math.PI2;
      const outer = 80 + (this.sunHeat / 100) * 100;
      const width = 2 + Math.floor((this.sunHeat / 100) * 4);

      this.sunRays.lineStyle(width, 0xffdd77, alpha);
      this.sunRays.beginPath();
      this.sunRays.moveTo(SUN_X + Math.cos(angle) * 40, SUN_Y + Math.sin(angle) * 40);
      this.sunRays.lineTo(SUN_X + Math.cos(angle) * outer, SUN_Y + Math.sin(angle) * outer);
      this.sunRays.strokePath();
    }
  }

  private burstRays() {
    // Quick expanding ray burst on each sun click
    const burst = this.add.graphics().setDepth(0);
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Phaser.Math.PI2;
      const inner = 35;
      const outer = 90;
      burst.lineStyle(3, 0xffdd77, 0.9);
      burst.beginPath();
      burst.moveTo(SUN_X + Math.cos(angle) * inner, SUN_Y + Math.sin(angle) * inner);
      burst.lineTo(SUN_X + Math.cos(angle) * outer, SUN_Y + Math.sin(angle) * outer);
      burst.strokePath();
    }

    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.4,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  /** Map 0–100 to a hue value (240 = blue, 0 = red) for smooth spectrum. */
  private heatToHue(value: number): number {
    return Math.max(0, Math.min(240, 240 - (value / 100) * 240));
  }

  /** Convert HSL values to a Phaser hex colour number. */
  private hslToColor(h: number, s: number, l: number): number {
    // Phaser's Color.HSLToRGB returns { r, g, b, a } or we can compute manually
    const rgb = Phaser.Display.Color.HSLToColor(h / 360, s / 100, l / 100);
    return rgb.color;
  }

  private drawHeatBar() {
    this.heatBar.clear();

    const barX = GAME_WIDTH / 2 - 100;
    const barY = 470;
    const barW = 200;
    const barH = 12;

    // Background
    this.heatBar.fillStyle(0x000000, 0.5);
    this.heatBar.fillRoundedRect(barX, barY, barW, barH, 6);
    this.heatBar.lineStyle(1, 0xffffff, 0.2);
    this.heatBar.strokeRoundedRect(barX, barY, barW, barH, 6);

    const fill = this.sunHeat / 100;

    if (fill > 0) {
      // Draw the filled portion as thin vertical strips for a smooth gradient
      const innerX = barX + 2;
      const innerY = barY + 2;
      const innerW = barW - 4;
      const innerH = barH - 4;
      const fillW = innerW * fill;
      const stripCount = Math.max(1, Math.floor(fillW));
      const stripW = fillW / stripCount;

      for (let i = 0; i < stripCount; i++) {
        // Position within the fill = left edge of this strip / total fill width
        const pos = i / Math.max(1, stripCount - 1);
        // Map to 0–100 heat scale
        const heatVal = pos * this.sunHeat;
        const hue = this.heatToHue(heatVal);
        const color = this.hslToColor(hue, 100, 55);
        this.heatBar.fillStyle(color, 0.85);
        this.heatBar.fillRect(innerX + i * stripW, innerY, Math.max(1, stripW + 0.5), innerH);
      }

      // Glow overlay on the right edge of the fill
      if (fill > 0.05) {
        const glowHue = this.heatToHue(this.sunHeat);
        const glowColor = this.hslToColor(glowHue, 100, 60);
        this.heatBar.fillStyle(glowColor, 0.25);
        this.heatBar.fillRoundedRect(
          innerX + fillW - 10, innerY - 1,
          14, innerH + 2, 3
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  //  Combo popup
  // ─────────────────────────────────────────────

  private showComboPopup() {
    this.comboText.setText(`🔥 x${this.combo}`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);
    this.comboText.setY(SUN_Y);

    this.tweens.add({
      targets: this.comboText,
      scale: 1,
      y: SUN_Y - 30,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(400, () => {
      if (this.combo <= 1) {
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 200 });
      }
    });
  }

  // ─────────────────────────────────────────────
  //  Milestone burst
  // ─────────────────────────────────────────────

  private milestoneBurst() {
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 50, () => {
        const px = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const py = OCEAN_TOP_Y;
        const spark = this.add.circle(px, py, Phaser.Math.Between(3, 6), 0x06d6a0, 0.8).setDepth(6);
        this.tweens.add({
          targets: spark,
          y: py - Phaser.Math.Between(80, 200),
          x: px + Phaser.Math.Between(-30, 30),
          alpha: 0, scale: 0.3,
          duration: Phaser.Math.Between(600, 1200),
          onComplete: () => spark.destroy()
        });
      });
    }
  }

  // ─────────────────────────────────────────────
  //  Overheat
  // ─────────────────────────────────────────────

  private overheatSun() {
    this.overheatCount++;
    this.cameras.main.shake(300, 0.015);

    this.sunImg.setTint(0xff4444);
    this.time.delayedCall(400, () => this.sunImg.clearTint());

    this.sunHeat = 50;
    this.steamPressure = 0;
    this.updateSunVisual();
    this.drawSteamBar();
  }

  // ─────────────────────────────────────────────
  //  Timer & urgency
  // ─────────────────────────────────────────────

  private onTick() {
    if (this.isComplete) return;
    this.timeRemaining--;

    this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
      remaining: this.timeRemaining,
      total: this.totalTime
    } satisfies HUDTimerPayload);

    const avgTemp = Math.round(25 + this.sunHeat * 0.5);
    const humidity = Math.min(100, Math.round((this.vaporCount / VAPOR_TARGET) * 100));
    this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
      temperature: avgTemp,
      humidity,
      windSpeed: 5 + Math.round(this.sunHeat / 10)
    } satisfies HUDWeatherPayload);

    // ── Urgency ──
    if (this.timeRemaining <= 15 && this.timeRemaining > 0) {
      const urgencyAlpha = ((15 - this.timeRemaining) / 15) * 0.35;
      this.urgencyOverlay.setAlpha(urgencyAlpha);
      this.tweens.add({ targets: [this.cloud1, this.cloud2], alpha: 0.6, duration: 500 });

      if (this.timeRemaining <= 10) {
        this.cameras.main.shake(100, 0.003);
      }
    }

    if (this.timeRemaining <= 0) {
      this.failLevel();
    }
  }

  // ─────────────────────────────────────────────
  //  Results
  // ─────────────────────────────────────────────

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const comboBonus = Math.floor(this.combo * 50);
    const score = Math.max(0, 2000 - this.overheatCount * 200 + Math.round((this.timeRemaining / 60) * 300) + comboBonus);
    const stars = GameManager.getStars(score, 2500);

    GameManager.getInstance().completeLevel('evaporation', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['evaporation'] || {};
    progress['evaporation'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_evaporation']
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(300, 0.01);

    const victoryText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Level Complete!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '36px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);

    this.tweens.add({ targets: victoryText, alpha: 1, y: GAME_HEIGHT / 2 - 50, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Sun Powered!',
      subtitle: 'Vapor rising to the skies',
      score, stars,
      levelId: 'evaporation',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_evaporation']
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Time's Up!", {
      fontFamily: FONTS.DISPLAY,
      fontSize: '36px',
      color: '#D62828',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail',
      title: "Time's Up!",
      subtitle: 'Not enough vapor collected',
      score: 0, stars: 0,
      levelId: 'evaporation',
      timeUsed: this.totalTime,
      factsUnlocked: []
    });
  }

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: 'Collect water vapor 💧',
      progress: this.vaporCount,
      target: VAPOR_TARGET
    } satisfies HUDObjectivePayload);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
