import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDObjectivePayload, HUDResultPayload, HUDLevelInfoPayload, HUDScorePayload, HUDWeatherPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

interface SliderConfig {
  label: string;
  x: number;
  y: number;
  min: number;
  max: number;
  defaultValue: number;
  color: number;
  targetMin: number;
  targetMax: number;
}

interface Slider {
  config: SliderConfig;
  value: number;
  track: Phaser.GameObjects.Graphics;
  handle: Phaser.GameObjects.Container;
  valueText: Phaser.GameObjects.Text;
  dragging: boolean;
  targetZone: Phaser.GameObjects.Rectangle;
}

export class TyphoonScene extends Phaser.Scene {
  private sliders: Slider[] = [];
  private isComplete = false;
  private timeRemaining = 90;
  private totalTime = 90;
  private centerX: number = 780;
  private centerY: number = 360;
  private stormGfx!: Phaser.GameObjects.Graphics;
  private categoryText!: Phaser.GameObjects.Text;
  private strengthText!: Phaser.GameObjects.Text;
  private eyeSprite!: Phaser.GameObjects.Arc;
  private cloudLayers: Phaser.GameObjects.Arc[] = [];
  private rainParticles: Phaser.GameObjects.Arc[] = [];
  private matches = 0;

  constructor() {
    super({ key: SCENES.TYPHOON });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0d0d1a);
    this.isComplete = false;
    this.sliders = [];
    this.cloudLayers = [];
    this.rainParticles = [];
    this.matches = 0;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a3e, 0x1a1a3e);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, 'Typhoon Formation', {
      fontFamily: FONTS.DISPLAY, fontSize: '24px', color: '#FFD166',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 40, 'Balance the elements to create a typhoon', {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#FFFFFF',
    }).setOrigin(0.5);

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Typhoon Formation',
      description: 'Balance elements to create a typhoon',
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // Storm visualization area
    this.add.text(this.centerX, 64, 'Storm Visualizer', {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#6DB3E6',
    }).setOrigin(0.5);

    // Category / strength (game-world displays)
    this.categoryText = this.add.text(this.centerX, this.centerY - 60, '', {
      fontFamily: FONTS.DISPLAY, fontSize: '14px', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.strengthText = this.add.text(this.centerX, this.centerY + 65, 'Waiting for conditions...', {
      fontFamily: FONTS.BODY, fontSize: '11px', color: '#4a6fa5',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    // Storm visualization
    this.eyeSprite = this.add.circle(this.centerX, this.centerY, 8, 0xffffff, 0.2).setDepth(DEPTH.GAME_OBJECTS);
    this.stormGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS - 1);

    // Create sliders
    const sliderConfigs: SliderConfig[] = [
      { label: 'Ocean Heat', x: 50, y: 90, min: 0, max: 100, defaultValue: 0, color: 0xff6b35, targetMin: 60, targetMax: 90 },
      { label: 'Water Vapor', x: 50, y: 190, min: 0, max: 100, defaultValue: 0, color: 0x6db3e6, targetMin: 55, targetMax: 85 },
      { label: 'Low Pressure', x: 50, y: 290, min: 0, max: 100, defaultValue: 0, color: 0x8b0000, targetMin: 60, targetMax: 95 },
      { label: 'Coriolis Spin', x: 50, y: 390, min: 0, max: 100, defaultValue: 0, color: 0x9b59b6, targetMin: 50, targetMax: 80 },
    ];

    sliderConfigs.forEach(cfg => this.createSlider(cfg));

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
        const heatVal = this.sliders[0]?.value ?? 0;
        const vaporVal = this.sliders[1]?.value ?? 0;
        const pressureVal = this.sliders[2]?.value ?? 0;
        const spinVal = this.sliders[3]?.value ?? 0;
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
    this.time.addEvent({ delay: 150, callback: () => this.spawnRain(), loop: true });

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

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

  private createSlider(cfg: SliderConfig) {
    const trackWidth = 220;
    const trackHeight = 16;

    const trackGfx = this.add.graphics();
    trackGfx.fillStyle(0x333355, 0.8);
    trackGfx.fillRoundedRect(cfg.x, cfg.y, trackWidth, trackHeight, 4);
    trackGfx.lineStyle(2, 0xffffff, 0.3);
    trackGfx.strokeRoundedRect(cfg.x, cfg.y, trackWidth, trackHeight, 4);

    const targetStartX = cfg.x + (cfg.targetMin / 100) * trackWidth;
    const targetEndX = cfg.x + (cfg.targetMax / 100) * trackWidth;
    const targetZone = this.add.rectangle(
      (targetStartX + targetEndX) / 2, cfg.y + trackHeight / 2,
      targetEndX - targetStartX, trackHeight,
      0x06d6a0, 0.15,
    ).setDepth(DEPTH.GAME_OBJECTS);

    this.add.text(cfg.x - 5, cfg.y - 14, cfg.label, {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#FFFFFF',
    }).setOrigin(0, 0.5);

    const handleCircle = this.add.circle(0, 0, 10, cfg.color, 1);
    handleCircle.setStrokeStyle(2, 0xffffff, 0.8);
    const handleContainer = this.add.container(cfg.x, cfg.y + trackHeight / 2);
    handleContainer.add(handleCircle);
    handleContainer.setSize(24, 24);
    handleContainer.setInteractive({ useHandCursor: true, draggable: false });
    handleContainer.setDepth(DEPTH.OVERLAY);

    const valueText = this.add.text(cfg.x + trackWidth + 15, cfg.y + trackHeight / 2, '0', {
      fontFamily: FONTS.DISPLAY, fontSize: '14px', color: '#FFFFFF',
    }).setOrigin(0, 0.5);

    const slider: Slider = { config: cfg, value: 0, track: trackGfx, handle: handleContainer, valueText, dragging: false, targetZone };
    this.sliders.push(slider);

    handleContainer.on('pointerdown', () => { slider.dragging = true; });
  }

  private updateStorm() {
    this.matches = 0;
    for (const slider of this.sliders) {
      if (slider.value >= slider.config.targetMin && slider.value <= slider.config.targetMax) this.matches++;
    }
    this.emitObjective();

    const avgValue = this.sliders.reduce((a, s) => a + s.value, 0) / this.sliders.length;
    const intensity = avgValue / 100;

    this.cloudLayers.forEach(c => c.destroy());
    this.cloudLayers = [];
    this.stormGfx.clear();

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

    const layers = 3 + Math.floor(intensity * 5);
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      const radius = 15 + t * (40 + intensity * 80);
      const alpha = 0.15 + (intensity * 0.35) * (1 - t * 0.5);
      const cloudColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(100, 100, 140), new Phaser.Display.Color(60, 60, 80), layers, i,
      );
      const cloud = this.add.circle(
        this.centerX + Phaser.Math.Between(-3, 3), this.centerY + Phaser.Math.Between(-3, 3), radius,
        Phaser.Display.Color.GetColor(cloudColor.r, cloudColor.g, cloudColor.b), alpha,
      ).setDepth(DEPTH.GAME_OBJECTS);
      this.cloudLayers.push(cloud);
    }

    this.stormGfx.lineStyle(2, 0x6db3e6, 0.1 + intensity * 0.3);
    for (let arm = 0; arm < 4; arm++) {
      const armAngle = (arm / 4) * Math.PI * 2;
      this.stormGfx.beginPath();
      for (let i = 0; i < 40; i++) {
        const t = i / 40;
        const angle = armAngle + t * 3 * Math.PI * 2;
        const radius = 5 + t * (30 + intensity * 90);
        if (i === 0) this.stormGfx.moveTo(this.centerX + Math.cos(angle) * radius, this.centerY + Math.sin(angle) * radius);
        else this.stormGfx.lineTo(this.centerX + Math.cos(angle) * radius, this.centerY + Math.sin(angle) * radius);
      }
      this.stormGfx.strokePath();
    }

    const eyeR = 5 + intensity * 10;
    this.eyeSprite.setRadius(eyeR);
    this.eyeSprite.setAlpha(0.15 + intensity * 0.4);

    if (this.matches >= 4 && intensity > 0.6) this.completeLevel(intensity);
  }

  private spawnRain() {
    if (this.matches < 1) return;
    while (this.rainParticles.length > 30) {
      const old = this.rainParticles.shift();
      if (old) old.destroy();
    }
    const x = Phaser.Math.Between(this.centerX - 80, this.centerX + 80);
    const rain = this.add.circle(x, this.centerY - 60, 2, 0x6db3e6, 0.4).setDepth(DEPTH.PARTICLES);
    this.tweens.add({
      targets: rain, y: this.centerY + 80, x: x + Phaser.Math.Between(-5, 5), alpha: 0, duration: 600,
      onComplete: () => rain.destroy(),
    });
    this.rainParticles.push(rain);
  }

  private updateSliderValue(slider: Slider, pointerX: number) {
    const trackStartX = slider.config.x;
    const trackEndX = slider.config.x + 220;
    const pct = Phaser.Math.Clamp((pointerX - trackStartX) / (trackEndX - trackStartX), 0, 1);
    slider.value = Math.round(pct * slider.config.max);
    slider.handle.x = trackStartX + pct * 220;
    slider.valueText.setText(String(slider.value));
    const circle = slider.handle.getAt(0) as Phaser.GameObjects.Arc;
    const inTarget = slider.value >= slider.config.targetMin && slider.value <= slider.config.targetMax;
    if (circle) circle.setFillStyle(inTarget ? 0x06d6a0 : slider.config.color);
  }

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

    this.cameras.main.flash(600, 255, 255, 255);

    // Flash effect
    for (let i = 0; i < 20; i++) {
      const flash = this.add.circle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(5, 20), 0xffffff, 0.3,
      ).setDepth(DEPTH.OVERLAY);
      this.tweens.add({
        targets: flash, alpha: 0, scale: 2, duration: 1000, delay: i * 50,
        onComplete: () => flash.destroy(),
      });
    }

    const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'Typhoon Created!', {
      fontFamily: FONTS.DISPLAY, fontSize: '32px', color: '#06D6A0',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);
    this.tweens.add({ targets: victoryText, alpha: 1, duration: 500 });

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

  update() {
    if (!this.input.activePointer.isDown) {
      this.sliders.forEach(s => { s.dragging = false; });
      return;
    }
    const pointer = this.input.activePointer;
    for (const slider of this.sliders) {
      if (slider.dragging) { this.updateSliderValue(slider, pointer.x); break; }
    }
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
