import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDTimerPayload,
  HUDObjectivePayload,
  HUDResultPayload,
  HUDLevelInfoPayload,
  HUDScorePayload,
  HUDWeatherPayload,
  HUDLevelIntroPayload,
  TyphoonSliderConfig,
  TyphoonSliderUpdatePayload,
} from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

// Used to emit configs to React. Matches shared TyphoonSliderConfig but with
// Phaser-specific color as number (converted to hex string for React).
interface LocalSliderConfig {
  label: string;
  icon: string;
  min: number;
  max: number;
  defaultValue: number;
  color: number; // Phaser color (0xRRGGBB)
  targetMin: number;
  targetMax: number;
}

export class TyphoonScene extends Phaser.Scene {
  private sliderConfigs: LocalSliderConfig[] = [];
  private sliderValues: number[] = [0, 0, 0, 0];
  private isComplete = false;
  private timeRemaining = 90;
  private totalTime = 90;
  private centerX: number = 574;
  private centerY: number = 325;
  private stormGfx!: Phaser.GameObjects.Graphics;
  private categoryText!: Phaser.GameObjects.Text;
  private strengthText!: Phaser.GameObjects.Text;
  private eyeSprite!: Phaser.GameObjects.Arc;
  private cloudLayers: Phaser.GameObjects.Arc[] = [];
  private rainParticles: Phaser.GameObjects.Arc[] = [];
  private matches = 0;
  private gameStarted = false;
  private stormTime = 0;

  // Storm effects
  private stormOverlay!: Phaser.GameObjects.Graphics;
  private lightningGfx!: Phaser.GameObjects.Graphics;
  private lightningBoltPool: Phaser.GameObjects.Graphics[] = [];
  private lastMilestone = 0;
  private cloudGlowGfx!: Phaser.GameObjects.Graphics;
  private oceanSplashes: Phaser.GameObjects.Arc[] = [];
  private glowPulseDirection = 1;
  private glowPulseValue = 0;

  // Slider-driven visual effects
  private heatShimmerGfx!: Phaser.GameObjects.Graphics;
  private vaporParticles: Phaser.GameObjects.Arc[] = [];
  private waterSpoutGfx!: Phaser.GameObjects.Graphics;
  private vaporSpawnTimer = 0;
  private heatWaveTime = 0;
  private spoutAngle = 0;

  constructor() {
    super({ key: SCENES.TYPHOON });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0d0d1a);
    this.isComplete = false;
    this.gameStarted = false;
    this.sliderConfigs = [];
    this.sliderValues = [0, 0, 0, 0];
    this.cloudLayers = [];
    this.rainParticles = [];
    this.matches = 0;
    this.lastMilestone = 0;
    this.lightningBoltPool = [];
    this.timeRemaining = this.totalTime;
    this.glowPulseValue = 0;
    this.glowPulseDirection = 1;

    // Background (with slow zoom + drift animation)
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'typhoon_bg').setDepth(DEPTH.BG);
    const bgScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(bgScale);
    this.tweens.add({
      targets: bg,
      scaleX: bgScale * 1.04,
      scaleY: bgScale * 1.04,
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: bg,
      x: GAME_WIDTH / 2 + Phaser.Math.Between(-6, 6),
      duration: 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Dark overlay so text/UI is readable
    const overlay = this.add.graphics().setDepth(0);
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Storm overlay (darkens further with intensity)
    this.stormOverlay = this.add.graphics().setDepth(0);
    this.stormOverlay.fillStyle(0x000000, 0);
    this.stormOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Lightning flash overlay
    this.lightningGfx = this.add.graphics().setDepth(6);
    this.lightningGfx.fillStyle(0xffffff, 0);
    this.lightningGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Instruction text (bottom with gray background)
    const instrBg = this.add.graphics().setDepth(4);
    instrBg.fillStyle(0x444444, 0.6);
    instrBg.fillRoundedRect(GAME_WIDTH / 2 - 180, GAME_HEIGHT - 70, 360, 40, 8);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Adjust the sliders on the left to create a typhoon!', {
        fontFamily: FONTS.BODY,
        fontSize: '13px',
        color: '#FFFFFF',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Storm visualisation area label
    this.add.text(this.centerX, 64, 'Storm Visualizer', {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#6DB3E6',
    }).setOrigin(0.5);

    // Category / strength text
    this.categoryText = this.add.text(this.centerX, this.centerY - 60, '', {
      fontFamily: FONTS.DISPLAY, fontSize: '14px', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.strengthText = this.add.text(this.centerX, this.centerY + 65, 'Waiting for conditions...', {
      fontFamily: FONTS.BODY, fontSize: '11px', color: '#4a6fa5',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    // Storm visualisation (eye + graphics)
    this.eyeSprite = this.add.circle(this.centerX, this.centerY, 8, 0xffffff, 0.2).setDepth(DEPTH.GAME_OBJECTS);
    this.stormGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS - 1);

    // Cloud glow (pulsing ring around the storm)
    this.cloudGlowGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS - 2);

    // Slider-driven effect graphics
    this.heatShimmerGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS - 1);
    this.waterSpoutGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);
    this.vaporParticles = [];
    this.vaporSpawnTimer = 0;
    this.heatWaveTime = 0;
    this.spoutAngle = 0;

    // Define slider configs and emit to React overlay
    this.sliderConfigs = [
      { label: 'Ocean Heat', icon: '🌊', min: 0, max: 100, defaultValue: 0, color: 0xff6b35, targetMin: 60, targetMax: 90 },
      { label: 'Water Vapor', icon: '💧', min: 0, max: 100, defaultValue: 0, color: 0x6db3e6, targetMin: 55, targetMax: 85 },
      { label: 'Low Pressure', icon: '🌪️', min: 0, max: 100, defaultValue: 0, color: 0x8b0000, targetMin: 60, targetMax: 95 },
      { label: 'Coriolis Spin', icon: '🌀', min: 0, max: 100, defaultValue: 0, color: 0x9b59b6, targetMin: 50, targetMax: 80 },
    ];
    this.sliderValues = this.sliderConfigs.map(() => 0);

    // Emit configs to React overlay
    this.game.events.emit(GAME_EVENTS.HUD_TYPHOON_SLIDER,
      this.sliderConfigs.map((c, i) => ({
        index: i,
        label: c.label,
        icon: c.icon,
        min: c.min,
        max: c.max,
        defaultValue: c.defaultValue,
        color: '#' + c.color.toString(16).padStart(6, '0'),
        targetMin: c.targetMin,
        targetMax: c.targetMax,
      } satisfies TyphoonSliderConfig))
    );

    // Listen for slider updates from React
    this.game.events.on(GAME_EVENTS.HUD_TYPHOON_SLIDER_UPDATE, (payload: TyphoonSliderUpdatePayload) => {
      if (!this.gameStarted || this.isComplete) return;
      this.sliderValues[payload.index] = payload.value;
    });

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);

    // Show intro overlay
    this.showIntroOverlay();
  }

  // ═══════════════════════════════════════════════
  //  INTRO OVERLAY
  // ═══════════════════════════════════════════════

  private showIntroOverlay() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'typhoon',
      badge: '🌀 LEVEL 5',
      title: 'Typhoon Formation',
      subtitle: 'Balance the elements to create a typhoon!',
      mechanics: [
        { icon: '🌊', text: 'Adjust Ocean Heat, Water Vapor, Low Pressure & Coriolis Spin sliders' },
        { icon: '🎯', text: 'Each slider has a target zone (green area) — keep all 4 in the zone!' },
        { icon: '⛈️', text: 'Watch the storm grow as you balance — from depression to Cat 5!' },
        { icon: '⚡', text: 'Higher intensity triggers lightning, rain & screen shake!' },
        { icon: '⏱️', text: 'You have 90 seconds. Reach Cat 1+ with all 4 in zone to win!' }
      ]
    } satisfies HUDLevelIntroPayload);

    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Typhoon Formation',
      description: 'Balance elements to create a typhoon'
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // Timer
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
          remaining: this.timeRemaining, total: this.totalTime,
        } satisfies HUDTimerPayload);

        // Emit weather data from sliders
        const heatVal = this.sliderValues[0] ?? 0;
        const vaporVal = this.sliderValues[1] ?? 0;
        const pressureVal = this.sliderValues[2] ?? 0;
        const spinVal = this.sliderValues[3] ?? 0;
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: Math.round(20 + heatVal * 0.8),
          humidity: Math.round(vaporVal),
          windSpeed: Math.round(10 + pressureVal * 0.6 + spinVal * 0.3),
          stormLevel: heatVal >= 60 && vaporVal >= 55 ? (pressureVal >= 60 && spinVal >= 50 ? 3 : 2) : 1,
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    // Storm update loop
    this.time.addEvent({ delay: 200, callback: () => this.updateStorm(), loop: true });

    // Rain
    this.time.addEvent({ delay: 80, callback: () => this.spawnRain(), loop: true });

    // Ocean splash (random intervals)
    const scheduleSplash = () => {
      if (this.isComplete || !this.gameStarted) return;
      const nextDelay = Phaser.Math.Between(600, 1400);
      this.time.delayedCall(nextDelay, () => {
        this.spawnOceanSplash();
        scheduleSplash();
      });
    };
    scheduleSplash();
  };

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: 'Parameters in target zone',
      progress: this.matches,
      target: 4,
    } satisfies HUDObjectivePayload);
  }


  private updateStorm() {
    if (!this.gameStarted) return;
    this.matches = 0;
    for (let i = 0; i < this.sliderValues.length; i++) {
      const cfg = this.sliderConfigs[i];
      if (!cfg) continue;
      if (this.sliderValues[i] >= cfg.targetMin && this.sliderValues[i] <= cfg.targetMax) this.matches++;
    }
    this.emitObjective();

    const avgValue = this.sliderValues.reduce((a, v) => a + v, 0) / this.sliderValues.length;
    const intensity = avgValue / 100;

    // Clean up old lightning bolts
    if (this.lightningBoltPool.length > 0) {
      this.lightningBoltPool.forEach(g => g.destroy());
      this.lightningBoltPool = [];
    }

    this.cloudLayers.forEach(c => c.destroy());
    this.cloudLayers = [];
    this.stormGfx.clear();
    this.cloudGlowGfx.clear();

    if (intensity < 0.1) {
      this.strengthText.setText('Calm — adjust sliders to begin');
      this.categoryText.setText('');
      this.eyeSprite.setRadius(8);
      return;
    }

    let category = '';
    let catColor = '#FFFFFF';
    if (intensity < 0.25) { category = 'Tropical Depression'; catColor = '#6DB3E6'; }
    else if (intensity < 0.4) { category = 'Tropical Storm'; catColor = '#FFD166'; }
    else if (intensity < 0.55) { category = 'Cat 1: 74-95 mph'; catColor = '#FF8C00'; }
    else if (intensity < 0.7) { category = 'Cat 2: 96-110 mph'; catColor = '#FF6B35'; }
    else if (intensity < 0.85) { category = 'Cat 3: 111-129 mph'; catColor = '#D62828'; }
    else { category = intensity < 1 ? 'Cat 4: 130-156 mph' : 'Cat 5: 157+ mph!'; catColor = '#8B0000'; }

    this.categoryText.setText(category).setColor(catColor);
    this.strengthText.setText(`Intensity: ${Math.round(intensity * 100)}%`);
    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: Math.round(intensity * 3000),
      label: 'Intensity',
    } satisfies HUDScorePayload);

    // Advance storm rotation for animation
    this.stormTime += 0.05;
    this.renderTyphoon(intensity);

    // Cloud glow — pulsing ring around storm
    this.updateCloudGlow(intensity);

    // Slider-driven visual effects (tied to individual slider values)
    const heatVal = this.sliderValues[0] ?? 0;
    const vaporVal = this.sliderValues[1] ?? 0;
    const pressureVal = this.sliderValues[2] ?? 0;
    this.heatWaveTime += 0.04;
    this.updateHeatShimmer(heatVal);
    this.updateVaporParticles(vaporVal, intensity);
    this.spoutAngle += 0.06;
    this.updateWaterSpout(pressureVal, intensity);

    // Storm milestone effects (lightning & shake)
    this.checkStormMilestones(intensity);

    if (this.matches >= 4 && intensity >= 0.55) this.completeLevel(intensity);
  }

  // ═══════════════════════════════════════════════
  //  STORM MILESTONE EFFECTS
  // ═══════════════════════════════════════════════

  private checkStormMilestones(intensity: number) {
    const currentMilestone = Math.floor(intensity * 10);
    if (currentMilestone > this.lastMilestone) {
      this.lastMilestone = currentMilestone;

      // Storm overlay darkens with intensity
      const stormAlpha = Math.min(0.35, intensity * 0.35);
      this.stormOverlay.clear();
      this.stormOverlay.fillStyle(0x000000, stormAlpha);
      this.stormOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      if (currentMilestone >= 4) {
        this.cameras.main.shake(250, 0.003 * (1 + currentMilestone * 0.15));

        if (currentMilestone >= 5) {
          this.flashLightning();
        }

        const pct = currentMilestone * 10;
        const msg = this.add
          .text(
            GAME_WIDTH / 2,
            this.centerY - 100,
            `⚡ ${pct}% Intensity!`,
            {
              fontFamily: FONTS.DISPLAY,
              fontSize: '18px',
              color: '#FFD166',
              stroke: '#000000',
              strokeThickness: 3
            }
          )
          .setOrigin(0.5)
          .setDepth(7)
          .setAlpha(0);
        this.tweens.add({
          targets: msg,
          alpha: { from: 1, to: 0 },
          y: msg.y - 30,
          duration: 1500,
          ease: 'Quad.easeOut',
          onComplete: () => msg.destroy()
        });
      }
    }

    // Continuous storm effects at high intensity
    if (intensity >= 0.4 && currentMilestone % 10 < 8) {
      // Random lightning — chance scales with intensity, starts earlier
      if (Math.random() < intensity * 0.03) {
        this.flashLightning();
      }
      // Frequent screen ripple at very high intensity
      if (intensity > 0.65 && Math.random() < 0.35) {
        this.cameras.main.shake(60, 0.002 * intensity);
      }
      // Mid-intensity rumble
      if (intensity > 0.4 && intensity <= 0.65 && Math.random() < 0.1) {
        this.cameras.main.shake(40, 0.001);
      }
    }
  }

  private flashLightning() {
    // White flash overlay
    this.lightningGfx.clear();
    this.lightningGfx.fillStyle(0xffffff, 0.5);
    this.lightningGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.time.delayedCall(60, () => {
      this.lightningGfx.clear();
      this.lightningGfx.fillStyle(0xffffff, 0);
      this.lightningGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    });

    // Lightning bolt
    const boltGfx = this.add.graphics().setDepth(7);
    this.lightningBoltPool.push(boltGfx);
    const boltX = this.centerX + Phaser.Math.Between(-200, 200);
    this.drawLightningBolt(
      boltX, 0,
      this.centerX + Phaser.Math.Between(-40, 40), this.centerY,
      boltGfx, 0xffffff, 2
    );

    // Branches
    const branches = Phaser.Math.Between(1, 3);
    for (let i = 0; i < branches; i++) {
      const bx = boltX + Phaser.Math.Between(-100, 100);
      const by = Phaser.Math.Between(100, 300);
      const branchGfx = this.add.graphics().setDepth(7);
      this.lightningBoltPool.push(branchGfx);
      this.drawLightningBolt(
        bx, by,
        bx + Phaser.Math.Between(-60, 60), by + Phaser.Math.Between(80, 150),
        branchGfx, 0xaaaaaa, 1
      );
    }

    // Thunder rumble — cascade shakes
    this.cameras.main.shake(120, 0.008);
    this.time.delayedCall(150, () => {
      this.cameras.main.shake(100, 0.005);
    });
    this.time.delayedCall(300, () => {
      this.cameras.main.shake(80, 0.003);
    });
  }

  private drawLightningBolt(
    x1: number, y1: number,
    x2: number, y2: number,
    gfx: Phaser.GameObjects.Graphics,
    color: number, lineWidth: number
  ) {
    const segments = Phaser.Math.Between(5, 9);
    const points: { x: number; y: number }[] = [];
    points.push({ x: x1, y: y1 });

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + Phaser.Math.Between(-25, 25);
      const y = y1 + (y2 - y1) * t + Phaser.Math.Between(-10, 10);
      points.push({ x, y });
    }
    points.push({ x: x2, y: y2 });

    // Glow layer
    gfx.lineStyle(lineWidth * 3, color, 0.2);
    this.drawBoltPath(gfx, points);
    // Mid layer
    gfx.lineStyle(lineWidth * 1.8, color, 0.5);
    this.drawBoltPath(gfx, points);
    // Core
    gfx.lineStyle(lineWidth, color, 1);
    this.drawBoltPath(gfx, points);
  }

  private drawBoltPath(gfx: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]) {
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();
  }

  // ═══════════════════════════════════════════════
  //  RAIN EFFECT (enhanced — wider, faster, more intense)
  // ═══════════════════════════════════════════════

  private spawnRain() {
    if (!this.gameStarted || this.matches < 1) return;

    // More particles allowed as storm intensifies
    const avgValue = this.sliderValues.reduce((a, v) => a + v, 0) / this.sliderValues.length;
    const intensity = avgValue / 100;
    const maxRain = 30 + Math.floor(intensity * 40);

    while (this.rainParticles.length > maxRain) {
      const old = this.rainParticles.shift();
      if (old) old.destroy();
    }

    // Spawn 1-3 per call depending on intensity
    const count = 1 + Math.floor(intensity * 3);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(this.centerX - 120, this.centerX + 120);
      const alpha = 0.15 + intensity * 0.5;
      const size = intensity > 0.5 ? Phaser.Math.Between(1, 3) : 1;
      const rain = this.add.circle(x, this.centerY - 80, size, 0x6db3e6, alpha).setDepth(DEPTH.PARTICLES);

      const swayX = x + Phaser.Math.Between(-8, 8);
      this.tweens.add({
        targets: rain,
        y: this.centerY + 100,
        x: swayX,
        alpha: 0,
        duration: 400 + Math.random() * 300,
        onComplete: () => {
          rain.destroy();
          // Small splash at landing point
          if (intensity > 0.4 && Math.random() < 0.3) {
            const splash = this.add.circle(rain.x, this.centerY + 100, 1, 0xffffff, 0.3).setDepth(DEPTH.PARTICLES);
            this.tweens.add({
              targets: splash,
              alpha: 0,
              scale: 3,
              duration: 200,
              onComplete: () => splash.destroy()
            });
          }
        },
      });
      this.rainParticles.push(rain);
    }
  }

  // ═══════════════════════════════════════════════
  //  OCEAN SPLASH
  // ═══════════════════════════════════════════════

  private spawnOceanSplash() {
    if (!this.gameStarted || this.isComplete) return;

    const avgValue = this.sliderValues.reduce((a, v) => a + v, 0) / this.sliderValues.length;
    const intensity = avgValue / 100;
    if (intensity < 0.15) return; // only when storm is brewing

    // Splash origin: bottom of storm area
    const originX = Phaser.Math.Between(this.centerX - 100, this.centerX + 100);
    const originY = this.centerY + 80;

    // 3-6 droplets per splash
    const dropletCount = 3 + Math.floor(intensity * 4);
    for (let i = 0; i < dropletCount; i++) {
      const angle = Phaser.Math.FloatBetween(-1.2, -0.4); // upward spread
      const speed = Phaser.Math.Between(20, 50) * (0.5 + intensity * 0.5);
      const size = Phaser.Math.Between(1, 3);
      const droplet = this.add.circle(
        originX + Phaser.Math.Between(-5, 5),
        originY,
        size,
        Phaser.Math.Between(0, 1) > 0 ? 0xffffff : 0x6db3e6,
        0.3 + intensity * 0.4
      ).setDepth(DEPTH.PARTICLES);
      this.oceanSplashes.push(droplet);

      this.tweens.add({
        targets: droplet,
        x: originX + Math.cos(angle) * speed,
        y: originY + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          droplet.destroy();
          const idx = this.oceanSplashes.indexOf(droplet);
          if (idx >= 0) this.oceanSplashes.splice(idx, 1);
        }
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  CLOUD GLOW
  // ═══════════════════════════════════════════════

  private updateCloudGlow(intensity: number) {
    this.cloudGlowGfx.clear();
    if (intensity < 0.15) return;

    // Pulse
    this.glowPulseValue += 0.02 * this.glowPulseDirection;
    if (this.glowPulseValue > 1) { this.glowPulseValue = 1; this.glowPulseDirection = -1; }
    else if (this.glowPulseValue < 0) { this.glowPulseValue = 0; this.glowPulseDirection = 1; }

    const pulse = 0.7 + this.glowPulseValue * 0.3;
    const alpha = 0.08 + intensity * 0.25;
    const baseRadius = 30 + intensity * 30;

    // Outer glow ring
    this.cloudGlowGfx.fillStyle(0x6db3e6, alpha * 0.3 * pulse);
    this.cloudGlowGfx.fillCircle(this.centerX, this.centerY, baseRadius * 1.8);

    // Inner glow
    this.cloudGlowGfx.fillStyle(0xffffff, alpha * 0.15 * pulse);
    this.cloudGlowGfx.fillCircle(this.centerX, this.centerY, baseRadius * 0.8);

    // At high intensity — electric glow
    if (intensity > 0.5) {
      this.cloudGlowGfx.fillStyle(0xd62828, alpha * 0.1 * pulse);
      this.cloudGlowGfx.fillCircle(this.centerX, this.centerY, baseRadius * 1.4);
    }
  }

  // ═══════════════════════════════════════════════
  //  TYPHOON VISUAL — parang tunay na bagyo
  // ═══════════════════════════════════════════════

  private renderTyphoon(intensity: number) {
    const gfx = this.stormGfx;
    const cx = this.centerX;
    const cy = this.centerY;
    const rot = this.stormTime;

    // ── 1. Outer haze — very large, very faint background ──
    const maxR = 25 + intensity * 120;
    gfx.fillStyle(0x8899aa, 0.015 + intensity * 0.025);
    gfx.fillCircle(cx, cy, maxR * 1.25);

    // ── 2. Outer cloud deck — stacked translucent layers ──
    const rings = 5 + Math.floor(intensity * 6);
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const r = maxR * (0.15 + t * 0.85);
      const alpha = (0.02 + intensity * 0.1) * (1 - t * 0.7);
      const gray = 200 - Math.floor(t * 100 * intensity);
      const rCol = gray;
      const gCol = Math.floor(gray * (1 - t * 0.2 * intensity));
      const bCol = Math.floor(gray * (1 - t * 0.3 * intensity));
      gfx.fillStyle(Phaser.Display.Color.GetColor(rCol, gCol, bCol), Math.max(0, alpha));
      gfx.fillCircle(cx, cy, r);
    }

    // ── 3. Outer spiral bands (slower rotation, more diffuse) ──
    const outerArms = 2 + Math.floor(intensity * 2);
    const outerTurns = 2.5 + intensity * 1.5;
    for (let arm = 0; arm < outerArms; arm++) {
      const armAngle = (arm / outerArms) * Math.PI * 2 + rot * 0.35;
      for (let step = 0; step < 30; step++) {
        const t = step / 30;
        // Organic wave — spiral sways naturally
        const wave = Math.sin(t * 6 + arm * 2.1) * 0.25;
        const angle = armAngle + t * outerTurns * Math.PI * 2 + wave;
        const radius = 14 + t * (maxR * 0.88 - 14);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const thickness = (1 - t * 0.65) * (5 + intensity * 9);
        const alpha = (0.07 + intensity * 0.18) * (1 - t * 0.5);
        const gray = 170 - Math.floor(t * 70);
        const bTint = Math.floor(30 + t * 20);
        gfx.fillStyle(
          Phaser.Display.Color.GetColor(gray, gray + 10, gray + 10 + bTint),
          Math.max(0, alpha)
        );
        gfx.fillCircle(x, y, Math.max(1, thickness));
      }
    }

    // ── 4. Inner spiral rainbands (faster rotation, bright white) ──
    const innerArms = 3 + Math.floor(intensity * 2);
    const innerTurns = 4 + intensity * 2.5;
    for (let arm = 0; arm < innerArms; arm++) {
      const armAngle = (arm / innerArms) * Math.PI * 2 + rot;
      for (let step = 0; step < 28; step++) {
        const t = step / 28;
        // Tighter wave for inner bands
        const wave = Math.sin(t * 9 + arm * 3.7) * 0.15;
        const angle = armAngle + t * innerTurns * Math.PI * 2 + wave;
        const radius = 7 + t * (maxR * 0.75 - 7);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        // Thick near eyewall, tapers outward
        const thickness = (1 - t * 0.82) * (9 + intensity * 18);
        const alpha = (0.2 + intensity * 0.5) * (1 - t * 0.55);

        // Color: bright white → warm orange/red at high intensity
        let rCol = 255, gCol = 255, bCol = 255;
        if (intensity > 0.25 && t > 0.15) {
          rCol = 255;
          gCol = Math.floor(255 - (intensity - 0.1) * 300 * t);
          bCol = Math.floor(255 - (intensity - 0.1) * 350 * t);
        }
        gfx.fillStyle(
          Phaser.Display.Color.GetColor(
            Math.max(180, rCol), Math.max(130, gCol), Math.max(90, bCol)
          ),
          Math.max(0, alpha)
        );
        gfx.fillCircle(x, y, Math.max(1, thickness));
      }
    }

    // ── 5. Eyewall — makapal na pader ng ulap sa paligid ng eye ──
    const eyewallR = 7 + intensity * 17;
    // Outer eyewall layers (darker → brighter inward)
    for (let i = 6; i >= 0; i--) {
      const r = eyewallR + i * 5;
      const alpha = (0.08 + intensity * 0.35) - i * 0.035;
      const bright = 180 - i * 20 + Math.floor(intensity * 50);
      const rCol = Math.min(255, bright + 60);
      const gCol = Math.min(255, bright + 20);
      const bCol = Math.min(255, bright);
      gfx.fillStyle(
        Phaser.Display.Color.GetColor(rCol, gCol, bCol),
        Math.max(0, alpha)
      );
      gfx.fillCircle(cx, cy, r);
    }
    // Inner bright eyewall edge
    const innerWallR = eyewallR * 0.85;
    gfx.fillStyle(0xffffff, 0.08 + intensity * 0.2);
    gfx.fillCircle(cx, cy, innerWallR);

    // ── 6. Eye (dilim sa gitna, liwanag sa loob) ──
    const eyeR = eyewallR * 0.32;
    // Dark center
    gfx.fillStyle(0x000000, 0.05 + intensity * 0.12);
    gfx.fillCircle(cx, cy, eyeR * 1.1);
    // Inner glow
    gfx.fillStyle(0xffffff, 0.02 + intensity * 0.06);
    gfx.fillCircle(cx, cy, eyeR * 0.6);
    // Tiny bright core
    gfx.fillStyle(0xffffff, 0.05 + intensity * 0.1);
    gfx.fillCircle(cx, cy, eyeR * 0.2);

    // ── 7. High-intensity effects (Cat 3+) ──
    if (intensity > 0.5) {
      // Warm red/orange glow around eyewall
      const warmAlpha = (intensity - 0.5) * 0.15;
      gfx.fillStyle(0xff4422, warmAlpha);
      gfx.fillCircle(cx, cy, eyewallR * 1.35);
      gfx.fillStyle(0xff8822, warmAlpha * 0.6);
      gfx.fillCircle(cx, cy, eyewallR * 1.5);

      // Bright convective bursts on eyewall (umuusok na ulap)
      const burstCount = 3 + Math.floor(intensity * 5);
      for (let s = 0; s < burstCount; s++) {
        const sAngle = s * 1.73 + rot * 2.5;
        const sR = eyewallR * (0.8 + Math.sin(s * 0.7) * 0.3);
        const sx = cx + Math.cos(sAngle) * sR;
        const sy = cy + Math.sin(sAngle) * sR;
        const flicker = 0.4 + Math.sin(rot * 3 + s * 1.1) * 0.3;
        gfx.fillStyle(0xffffff, 0.15 + flicker * 0.2);
        gfx.fillCircle(sx, sy, 2 + (0.5 + flicker * 0.5) * 4);
      }
    }

    // ── 8. Scattered cloud wisps (natangay na ulap) ──
    if (intensity > 0.25) {
      const wispCount = 4 + Math.floor(intensity * 8);
      for (let w = 0; w < wispCount; w++) {
        const wAngle = w * 2.3 + rot * 0.7;
        const wR = eyewallR * 0.6 + ((w + 1) / wispCount) * maxR * 0.85;
        const wx = cx + Math.cos(wAngle) * wR + Math.sin(w * 3.1 + rot) * 5;
        const wy = cy + Math.sin(wAngle) * wR + Math.cos(w * 2.7 + rot) * 4;
        const wSize = 1.5 + (Math.sin(w * 5.3 + intensity * 10) * 0.5 + 0.5) * (3 + intensity * 4);
        const wAlpha = 0.04 + (Math.sin(w * 4.1) * 0.5 + 0.5) * (0.08 + intensity * 0.12);
        gfx.fillStyle(0xffffff, wAlpha);
        gfx.fillCircle(wx, wy, wSize);
      }
    }

    // ── 9. Spiral rainband streaks (mahabang pahid ng ulap) ──
    if (intensity > 0.3) {
      const streakCount = 2 + Math.floor(intensity * 3);
      for (let st = 0; st < streakCount; st++) {
        const stAngle = st * 2.9 + rot * 1.2;
        gfx.lineStyle(
          1.5 + intensity * 2,
          0xffffff,
          0.04 + intensity * 0.08
        );
        gfx.beginPath();
        const startR = eyewallR * 1.2;
        const endR = eyewallR * 1.5 + (Math.sin(st * 13.7) * 0.5 + 0.5) * (maxR * 0.7);
        for (let p = 0; p < 15; p++) {
          const t = p / 15;
          const pAngle = stAngle + t * 3.5 * Math.PI * 2;
          const pR = startR + t * (endR - startR);
          const px = cx + Math.cos(pAngle) * pR + Math.sin(t * 5 + st) * 3;
          const py = cy + Math.sin(pAngle) * pR + Math.cos(t * 5 + st) * 2;
          if (p === 0) gfx.moveTo(px, py);
          else gfx.lineTo(px, py);
        }
        gfx.strokePath();
      }
    }

    // Update eye sprite for victory tween
    this.eyeSprite.setRadius(eyewallR * 0.4);
    this.eyeSprite.setAlpha(0.15 + intensity * 0.35);
  }

  // ═══════════════════════════════════════════════
  //  OCEAN HEAT SHIMMER — heat waves around typhoon
  // ═══════════════════════════════════════════════

  private updateHeatShimmer(heatVal: number) {
    this.heatShimmerGfx.clear();
    if (heatVal < 25 || !this.gameStarted) return;

    const pct = heatVal / 100;
    const alpha = 0.05 + pct * 0.2;
    const shimmerCount = 4 + Math.floor(pct * 10);
    const waveX = this.centerX;
    const waveY = this.centerY + 40;

    for (let i = 0; i < shimmerCount; i++) {
      const t = i / shimmerCount;
      const yOff = t * 50 - 20;
      const wave = Math.sin(this.heatWaveTime * 2 + i * 1.5) * 8;
      const width = 20 + pct * 60 + Math.sin(this.heatWaveTime + i) * 10;
      const lineAlpha = alpha * (1 - Math.abs(t - 0.5) * 0.6);
      this.heatShimmerGfx.lineStyle(1, 0xffaa55, Math.max(0, lineAlpha));
      this.heatShimmerGfx.beginPath();
      this.heatShimmerGfx.moveTo(waveX - width + wave, waveY + yOff);
      this.heatShimmerGfx.lineTo(waveX + width + wave * 0.5, waveY + yOff);
      this.heatShimmerGfx.strokePath();
    }

    // Extra shimmer at very high heat
    if (pct > 0.6) {
      const extraAlpha = (pct - 0.6) * 0.3;
      this.heatShimmerGfx.fillStyle(0xff6600, extraAlpha);
      this.heatShimmerGfx.fillCircle(
        waveX + Math.sin(this.heatWaveTime * 1.5) * 15,
        waveY + Math.cos(this.heatWaveTime * 2) * 10,
        5 + pct * 15
      );
    }
  }

  // ═══════════════════════════════════════════════
  //  WATER VAPOR — rising from ocean to typhoon
  // ═══════════════════════════════════════════════

  private updateVaporParticles(vaporVal: number, intensity: number) {
    // Clean up excess particles
    const maxVapor = 10 + Math.floor((vaporVal / 100) * 30);
    while (this.vaporParticles.length > maxVapor) {
      const old = this.vaporParticles.shift();
      if (old) old.destroy();
    }

    // Spawn new vapor if slider active
    if (vaporVal > 15 && this.gameStarted) {
      this.vaporSpawnTimer -= 200; // called every 200ms
      const spawnInterval = 300 - (vaporVal / 100) * 180; // faster at higher values
      if (this.vaporSpawnTimer <= 0) {
        this.vaporSpawnTimer = spawnInterval;
        const count = 1 + Math.floor((vaporVal / 100) * 3);
        for (let i = 0; i < count; i++) {
          const vx = this.centerX + Phaser.Math.Between(-50, 50);
          const vy = this.centerY + 70 + Phaser.Math.Between(0, 20);
          const size = Phaser.Math.Between(2, 5);
          const alpha = 0.15 + (vaporVal / 100) * 0.3;
          const vapor = this.add.circle(vx, vy, size, 0xffffff, alpha)
            .setDepth(DEPTH.PARTICLES);

          const riseY = this.centerY - 40 + Phaser.Math.Between(-20, 10);
          const sway = Phaser.Math.Between(-30, 30);
          this.tweens.add({
            targets: vapor,
            y: riseY,
            x: vx + sway,
            alpha: 0,
            scale: 1.5 + intensity,
            duration: 1500 + (vaporVal / 100) * 1000,
            ease: 'Sine.easeOut',
            onComplete: () => {
              vapor.destroy();
              const idx = this.vaporParticles.indexOf(vapor);
              if (idx >= 0) this.vaporParticles.splice(idx, 1);
            }
          });
          this.vaporParticles.push(vapor);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  LOW PRESSURE — water spout / tornado funnel
  // ═══════════════════════════════════════════════

  private updateWaterSpout(pressureVal: number, intensity: number) {
    this.waterSpoutGfx.clear();
    if (pressureVal < 35 || !this.gameStarted || intensity < 0.15) return;

    const pct = pressureVal / 100;
    const spoutCount = 1 + Math.floor(pct * 2); // 1–3 spouts
    const spoutAlpha = 0.1 + pct * 0.25;

    for (let s = 0; s < spoutCount; s++) {
      const sOffX = (s - (spoutCount - 1) / 2) * 40 + Math.sin(this.spoutAngle + s * 2) * 10;
      const sX = this.centerX + sOffX;
      const topY = this.centerY - 10;
      const botY = this.centerY + 75;

      // Funnel shape: wider at bottom, narrower at top
      const topW = 3 + pct * 8;
      const botW = 8 + pct * 18;
      const segments = 12;

      // Draw funnel as stacked ellipses
      for (let seg = 0; seg <= segments; seg++) {
        const t = seg / segments;
        const y = topY + t * (botY - topY);
        const w = topW + t * (botW - topW);
        const wobble = Math.sin(this.spoutAngle * 2 + s * 3 + t * 4) * 2;
        const segAlpha = spoutAlpha * (1 - t * 0.3);

        this.waterSpoutGfx.fillStyle(0xdddddd, Math.max(0, segAlpha));
        this.waterSpoutGfx.fillEllipse(sX + wobble, y, Math.max(1, w), 3);
      }

      // Spout tip (small splash at bottom)
      const tipX = sX + Math.sin(this.spoutAngle * 2 + s * 3) * 4;
      this.waterSpoutGfx.fillStyle(0xffffff, spoutAlpha * 0.5);
      this.waterSpoutGfx.fillCircle(tipX, botY, 3 + pct * 5);
    }
  }

  // ═══════════════════════════════════════════════
  //  COMPLETE / FAIL
  // ═══════════════════════════════════════════════

  private completeLevel(intensity: number) {
    if (this.isComplete) return;
    this.isComplete = true;

    const intensityBonus = Math.round(intensity * 500);
    const matchBonus = this.matches * 250;
    const timeBonus = Math.round(this.timeRemaining / this.totalTime * 300);
    const score = 1500 + intensityBonus + matchBonus + timeBonus;
    const stars = GameManager.getStars(score, 3000);

    GameManager.getInstance().completeLevel('typhoon', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['typhoon'] || {};
    progress['typhoon'] = {
      completed: true, bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_typhoon'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    // Camera flash + shake
    this.cameras.main.flash(600, 255, 255, 255);
    this.cameras.main.shake(400, 0.01);

    // Flash particles
    for (let i = 0; i < 20; i++) {
      const flash = this.add.circle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(5, 20), 0xffffff, 0.3,
      ).setDepth(DEPTH.OVERLAY);
      this.tweens.add({
        targets: flash, alpha: 0, scale: 2, duration: 1000, delay: i * 50,
        onComplete: () => flash.destroy(),
      });
    }

    // Storm expands before victory
    this.tweens.add({
      targets: this.eyeSprite,
      radius: 40,
      alpha: 0.7,
      duration: 1500,
      ease: 'Quad.easeOut'
    });

    // Bonus summary
    const bonusSummary = this.add.text(this.centerX, this.centerY + 20, `Intensity Bonus: +${intensityBonus} | Match Bonus: +${matchBonus} | Time Bonus: +${timeBonus}`, {
      fontFamily: FONTS.BODY, fontSize: '9px', color: '#FFD166',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);
    this.tweens.add({ targets: bonusSummary, alpha: 1, delay: 400, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete', title: 'Typhoon Created!', subtitle: 'All conditions met',
      score, stars, levelId: 'typhoon',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_typhoon'],
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const failText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Time\'s Up!', {
      fontFamily: FONTS.DISPLAY, fontSize: '36px', color: '#D62828',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail', title: 'Time\'s Up!', subtitle: 'Conditions not balanced',
      score: 0, stars: 0, levelId: 'typhoon',
      timeUsed: this.totalTime, factsUnlocked: [],
    });
  }

  // ═══════════════════════════════════════════════
  //  UPDATE / SHUTDOWN
  // ═══════════════════════════════════════════════

  update() {
    // No-op — slider input is handled by React overlay
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);

    // Clean up active effects
    this.oceanSplashes.forEach(s => s.destroy());
    this.oceanSplashes = [];
    this.cloudGlowGfx.clear();
    this.lightningBoltPool.forEach(g => g.destroy());
    this.lightningBoltPool = [];
    this.vaporParticles.forEach(p => p.destroy());
    this.vaporParticles = [];
    this.heatShimmerGfx.clear();
    this.waterSpoutGfx.clear();
  }
}
