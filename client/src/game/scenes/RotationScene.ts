import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDObjectivePayload, HUDResultPayload, HUDLevelInfoPayload, HUDScorePayload, HUDWeatherPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

export class RotationScene extends Phaser.Scene {
  private timeRemaining = 60;
  private totalTime = 60;
  private rotationProgress = 0;
  private isComplete = false;
  private vortexGfx!: Phaser.GameObjects.Graphics;
  private centerX = GAME_WIDTH / 2;
  private centerY = GAME_HEIGHT / 2;
  private pointerPositions: Phaser.Math.Vector2[] = [];
  private lastAngle = 0;
  private totalRotation = 0;
  private isDragging = false;
  private targetRotation = 1440;
  private hemisphere = 'northern';
  private hemisphereText!: Phaser.GameObjects.Text;
  private vortexRadius = 20;
  private vortexParticles: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: SCENES.ROTATION });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0a0a1a);
    this.isComplete = false;
    this.rotationProgress = 0;
    this.timeRemaining = 60;
    this.totalTime = 60;
    this.pointerPositions = [];
    this.totalRotation = 0;
    this.isDragging = false;
    this.vortexParticles = [];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3e, 0x1a1a3e);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(GAME_WIDTH / 2, 20, 'Rotation & Coriolis Effect', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '24px',
      color: '#FFD166',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 48, 'Spin in circles to build the Coriolis force', {
      fontFamily: FONTS.BODY,
      fontSize: '13px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Hemisphere indicator (game-world info)
    this.hemisphereText = this.add.text(GAME_WIDTH / 2, 70, '🌍 Northern Hemisphere (CW)', {
      fontFamily: FONTS.BODY,
      fontSize: '14px',
      color: '#6DB3E6',
    }).setOrigin(0.5);

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Rotation',
      description: 'Spin to build Coriolis force',
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // Guidance circle
    const guideGfx = this.add.graphics();
    guideGfx.lineStyle(2, 0x4a6fa5, 0.3);
    guideGfx.strokeCircle(this.centerX, this.centerY, 100);
    guideGfx.lineStyle(1, 0x4a6fa5, 0.15);
    guideGfx.strokeCircle(this.centerX, this.centerY, 70);
    guideGfx.strokeCircle(this.centerX, this.centerY, 130);

    this.add.text(this.centerX, this.centerY + 115, 'spin here', {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#4a6fa5',
    }).setOrigin(0.5);

    // Vortex graphics
    this.vortexGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // Timer
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
          remaining: this.timeRemaining, total: this.totalTime,
        } satisfies HUDTimerPayload);

        // Emit weather data
        const windSpeed = Math.round(10 + this.rotationProgress * 70);
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: 27,
          humidity: 65 + Math.round(this.rotationProgress * 20),
          windSpeed,
          stormLevel: this.rotationProgress > 0.8 ? 3 : this.rotationProgress > 0.5 ? 2 : 1,
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', () => this.onPointerUp());

    // Toggle hemisphere button (game-world interaction)
    const toggleBtn = this.add.text(GAME_WIDTH - 20, 75, 'Toggle', {
      fontFamily: FONTS.BODY, fontSize: '12px', color: '#6DB3E6',
      backgroundColor: '#1a1a3e', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    toggleBtn.on('pointerdown', () => {
      this.hemisphere = this.hemisphere === 'northern' ? 'southern' : 'northern';
      this.hemisphereText.setText(
        this.hemisphere === 'northern' ? '🌍 Northern Hemisphere (CW)' : '🌍 Southern Hemisphere (CCW)',
      );
      this.totalRotation = 0;
      this.updateUI();
    });

    // Auto spin-down
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isComplete || this.isDragging) return;
        if (this.totalRotation > 0) {
          this.totalRotation = Math.max(0, this.totalRotation - 5);
          this.updateUI();
        }
      },
      loop: true,
    });

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'clockwise' : 'counter-clockwise'}`,
      progress: Math.round(this.totalRotation),
      target: this.targetRotation,
    } satisfies HUDObjectivePayload);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.centerX, this.centerY);
    if (dist < 140 && dist > 30) {
      this.isDragging = true;
      this.pointerPositions = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
      this.lastAngle = Phaser.Math.Angle.Between(this.centerX, this.centerY, pointer.x, pointer.y);
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging) return;
    this.pointerPositions.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
    if (this.pointerPositions.length > 10) this.pointerPositions.shift();

    const currentAngle = Phaser.Math.Angle.Between(this.centerX, this.centerY, pointer.x, pointer.y);
    let delta = currentAngle - this.lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    if (this.hemisphere === 'northern') {
      this.totalRotation += delta > 0 ? Phaser.Math.RadToDeg(delta) : Phaser.Math.RadToDeg(delta) * 0.3;
    } else {
      this.totalRotation += delta < 0 ? Phaser.Math.RadToDeg(-delta) : Phaser.Math.RadToDeg(delta) * 0.3;
    }
    this.totalRotation = Math.max(0, this.totalRotation);
    this.lastAngle = currentAngle;

    this.updateUI();
    this.updateVortex();
    this.spawnVortexParticle(pointer.x, pointer.y);

    this.rotationProgress = Math.min(1, this.totalRotation / this.targetRotation);

    if (this.totalRotation >= this.targetRotation) this.completeLevel();
  }

  private onPointerUp() {
    this.isDragging = false;
    this.pointerPositions = [];
  }

  private spawnVortexParticle(x: number, y: number) {
    const particle = this.add.circle(x, y, 3, 0x6db3e6, 0.6).setDepth(DEPTH.PARTICLES);
    const targetAngle = Phaser.Math.Angle.Between(x, y, this.centerX, this.centerY);
    const targetDist = Phaser.Math.Between(5, 30);
    this.tweens.add({
      targets: particle,
      x: this.centerX + Math.cos(targetAngle) * targetDist,
      y: this.centerY + Math.sin(targetAngle) * targetDist,
      alpha: 0, scale: 0.2, duration: 800,
      onComplete: () => particle.destroy(),
    });
    this.vortexParticles.push(particle);
    if (this.vortexParticles.length > 50) {
      const old = this.vortexParticles.shift();
      if (old) old.destroy();
    }
  }

  private updateVortex() {
    this.vortexGfx.clear();
    const progress = this.rotationProgress;
    if (progress <= 0) return;

    const turns = 1 + progress * 4;
    const maxRadius = 20 + progress * 100;
    const steps = 60;

    this.vortexGfx.lineStyle(2, 0x6db3e6, 0.2 + progress * 0.5);
    this.vortexGfx.beginPath();
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const angle = t * turns * Math.PI * 2;
      const radius = t * maxRadius;
      if (i === 0) this.vortexGfx.moveTo(this.centerX + Math.cos(angle) * radius, this.centerY + Math.sin(angle) * radius);
      else this.vortexGfx.lineTo(this.centerX + Math.cos(angle) * radius, this.centerY + Math.sin(angle) * radius);
    }
    this.vortexGfx.strokePath();

    if (progress > 0.5) {
      const eyeSize = 10 + (1 - progress) * 10;
      this.vortexGfx.fillStyle(0x1a1a3e, 0.8);
      this.vortexGfx.fillCircle(this.centerX, this.centerY, eyeSize);
      this.vortexGfx.lineStyle(2, 0xffd166, 0.6);
      this.vortexGfx.strokeCircle(this.centerX, this.centerY, eyeSize + 3);
    }
  }

  private updateUI() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'clockwise' : 'counter-clockwise'}`,
      progress: Math.round(this.totalRotation),
      target: this.targetRotation,
    } satisfies HUDObjectivePayload);
    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: Math.round(this.totalRotation / this.targetRotation * 2500),
      label: 'Spin',
    } satisfies HUDScorePayload);
  }

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const timeBonus = Math.round(this.timeRemaining / this.totalTime * 400);
    const score = 2500 + timeBonus;
    const stars = GameManager.getStars(score, 3300);

    GameManager.getInstance().completeLevel('rotation', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['rotation'] || {};
    progress['rotation'] = {
      completed: true, bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_rotation'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);

    // Dramatic vortex finish (game-world effect)
    this.tweens.addCounter({
      from: 0, to: 1, duration: 1500,
      onUpdate: (tween) => {
        const v = tween.getValue() ?? 0;
        this.vortexGfx.clear();
        this.vortexGfx.lineStyle(3, 0x6db3e6, v * 0.8);
        for (let i = 0; i < 100; i++) {
          const t = i / 100;
          const angle = t * (1 + v * 6) * Math.PI * 2;
          const radius = t * (20 + v * 120);
          const x = this.centerX + Math.cos(angle) * radius;
          const y = this.centerY + Math.sin(angle) * radius;
          if (i === 0) this.vortexGfx.beginPath();
          this.vortexGfx.moveTo(x, y);
          this.vortexGfx.lineTo(x + Math.cos(angle + 0.1) * 2, y + Math.sin(angle + 0.1) * 2);
        }
        this.vortexGfx.strokePath();
      },
    });

    const victoryText = this.add.text(GAME_WIDTH / 2, 180, 'Coriolis Effect Active!', {
      fontFamily: FONTS.DISPLAY, fontSize: '30px', color: '#06D6A0',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);
    this.tweens.add({ targets: victoryText, alpha: 1, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete', title: 'Coriolis Effect Active!',
      subtitle: 'Cyclonic rotation established',
      score, stars, levelId: 'rotation',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_rotation'],
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const failText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Not Enough Spin!', {
      fontFamily: FONTS.DISPLAY, fontSize: '36px', color: '#D62828',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail', title: 'Not Enough Spin!', subtitle: 'Keep spinning to build rotation',
      score: 0, stars: 0, levelId: 'rotation',
      timeUsed: this.totalTime, factsUnlocked: [],
    });
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
