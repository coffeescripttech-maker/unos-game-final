import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDObjectivePayload, HUDResultPayload, HUDLevelInfoPayload, HUDScorePayload, HUDWeatherPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

interface DriftingVapor {
  sprite: Phaser.GameObjects.Arc;
  connected: boolean;
  id: number;
}

export class CondensationScene extends Phaser.Scene {
  private vapors: DriftingVapor[] = [];
  private connections!: Phaser.GameObjects.Graphics;
  private timeRemaining = 75;
  private totalTime = 75;
  private cloudCoverage = 0;
  private cloudTarget = 70;
  private isComplete = false;
  private nextVaporId = 0;
  private dragStart: DriftingVapor | null = null;
  private tempLine!: Phaser.GameObjects.Graphics;
  private vaporSpawnTimer!: Phaser.Time.TimerEvent;
  private clouds: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: SCENES.CONDENSATION });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);
    this.isComplete = false;
    this.vapors = [];
    this.clouds = [];
    this.cloudCoverage = 0;
    this.timeRemaining = 75;
    this.totalTime = 75;
    this.dragStart = null;

    // Sky gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a3e, 0x1a1a3e, COLORS.OCEAN_DEEP, COLORS.OCEAN_DEEP);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(GAME_WIDTH / 2, 20, 'Condensation', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '28px',
      color: '#FFD166',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 50, 'Connect vapor particles to form clouds', {
      fontFamily: FONTS.BODY,
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Emit init level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Condensation',
      description: 'Connect vapor particles to form clouds',
    } satisfies HUDLevelInfoPayload);

    this.emitObjective();

    // Drawing graphics layers
    this.connections = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);
    this.tempLine = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // Spawn initial vapors
    for (let i = 0; i < 12; i++) {
      this.spawnVapor();
    }

    // Continuous vapor spawning
    this.vaporSpawnTimer = this.time.addEvent({
      delay: 1500,
      callback: () => { if (!this.isComplete) this.spawnVapor(); },
      loop: true,
    });

    // Timer tick
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
          remaining: this.timeRemaining,
          total: this.totalTime,
        } satisfies HUDTimerPayload);

        // Emit weather data
        const humidity = Math.round((this.cloudCoverage / 100) * 90);
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: 26,
          humidity,
          windSpeed: 8 + Math.round(this.vapors.length / 4),
          stormLevel: this.cloudCoverage > 60 ? 2 : 1,
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    // Input handling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
    this.input.on('pointerup', () => this.handlePointerUp());

    // Listen for HUD continue from React
    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: 'Build cloud coverage',
      progress: Math.min(this.cloudCoverage, this.cloudTarget),
      target: this.cloudTarget,
    } satisfies HUDObjectivePayload);
  }

  private spawnVapor() {
    const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
    const y = GAME_HEIGHT + 20;
    const sprite = this.add.circle(x, y, 6, 0xffffff, 0.6).setDepth(DEPTH.GAME_OBJECTS);

    const vapor: DriftingVapor = { sprite, connected: false, id: this.nextVaporId++ };
    this.vapors.push(vapor);

    this.tweens.add({
      targets: sprite,
      y: Phaser.Math.Between(-20, 50),
      x: x + Phaser.Math.Between(-80, 80),
      alpha: 0.3,
      duration: Phaser.Math.Between(5000, 8000),
      onComplete: () => {
        const idx = this.vapors.indexOf(vapor);
        if (idx >= 0) this.vapors.splice(idx, 1);
        sprite.destroy();
      },
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    let closest: DriftingVapor | null = null;
    let closestDist = 50;

    for (const v of this.vapors) {
      if (v.connected) continue;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, v.sprite.x, v.sprite.y);
      if (dist < closestDist) { closestDist = dist; closest = v; }
    }

    if (closest) {
      this.dragStart = closest;
      closest.sprite.setScale(1.5);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragStart) return;
    this.tempLine.clear();
    this.tempLine.lineStyle(3, 0xffffff, 0.5);
    this.tempLine.beginPath();
    this.tempLine.moveTo(this.dragStart.sprite.x, this.dragStart.sprite.y);
    this.tempLine.lineTo(pointer.x, pointer.y);
    this.tempLine.strokePath();
  }

  private handlePointerUp() {
    if (!this.dragStart) return;
    this.tempLine.clear();
    this.dragStart.sprite.setScale(1);

    let target: DriftingVapor | null = null;
    let closestDist = 60;

    for (const v of this.vapors) {
      if (v === this.dragStart || v.connected) continue;
      const dist = Phaser.Math.Distance.Between(
        this.dragStart.sprite.x, this.dragStart.sprite.y, v.sprite.x, v.sprite.y,
      );
      if (dist < closestDist) { closestDist = dist; target = v; }
    }

    if (target) this.connectVapors(this.dragStart, target);
    this.dragStart = null;
  }

  private connectVapors(a: DriftingVapor, b: DriftingVapor) {
    a.connected = true;
    b.connected = true;

    this.connections.lineStyle(3, 0x87ceeb, 0.6);
    this.connections.beginPath();
    this.connections.moveTo(a.sprite.x, a.sprite.y);
    this.connections.lineTo(b.sprite.x, b.sprite.y);
    this.connections.strokePath();

    const mx = (a.sprite.x + b.sprite.x) / 2;
    const my = (a.sprite.y + b.sprite.y) / 2;

    const cloud = this.add.circle(mx, my, 20, 0x8c8f9e, 0.8).setDepth(DEPTH.GAME_OBJECTS);
    this.clouds.push(cloud);

    let foundExisting = false;
    for (const c of this.clouds) {
      if (c === cloud) continue;
      const dist = Phaser.Math.Distance.Between(mx, my, c.x, c.y);
      if (dist < 50) {
        c.setRadius(c.radius + 8);
        if (c.radius > 35) c.setFillStyle(COLORS.STORM_DARK, 0.9);
        foundExisting = true;
        break;
      }
    }

    if (!foundExisting) {
      // Sparkle effect
      for (let i = 0; i < 5; i++) {
        const sparkle = this.add.circle(mx, my, 3, 0xffffff, 0.8).setDepth(DEPTH.PARTICLES);
        this.tweens.add({
          targets: sparkle,
          x: mx + Phaser.Math.Between(-30, 30),
          y: my + Phaser.Math.Between(-30, 30),
          alpha: 0,
          duration: 500,
          onComplete: () => sparkle.destroy(),
        });
      }

      this.cloudCoverage = Math.min(100, this.cloudCoverage + 5);
      this.emitObjective();

      // Emit score update
      this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
        score: Math.round(this.cloudCoverage / this.cloudTarget * 2000),
        label: 'Coverage',
      } satisfies HUDScorePayload);

      if (this.cloudCoverage >= this.cloudTarget) this.completeLevel();
    }

    this.time.delayedCall(500, () => {
      a.sprite.destroy();
      b.sprite.destroy();
      const idxA = this.vapors.indexOf(a);
      if (idxA >= 0) this.vapors.splice(idxA, 1);
      const idxB = this.vapors.indexOf(b);
      if (idxB >= 0) this.vapors.splice(idxB, 1);
    });
  }

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    this.vaporSpawnTimer.remove();

    const timeBonus = Math.round(this.timeRemaining / this.totalTime * 400);
    const score = 2000 + timeBonus;
    const stars = GameManager.getStars(score, 2800);

    // Save progress
    GameManager.getInstance().completeLevel('condensation', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['condensation'] || {};
    progress['condensation'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_condensation'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);

    const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Clouds Formed!', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '36px',
      color: '#06D6A0',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);

    this.tweens.add({ targets: victoryText, alpha: 1, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Clouds Formed!',
      subtitle: 'Vapor condensed into clouds',
      score,
      stars,
      levelId: 'condensation',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_condensation'],
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    this.vaporSpawnTimer.remove();

    const failText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Time\'s Up!', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '36px',
      color: '#D62828',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail',
      title: 'Time\'s Up!',
      subtitle: 'Not enough clouds formed',
      score: 0,
      stars: 0,
      levelId: 'condensation',
      timeUsed: this.totalTime,
      factsUnlocked: [],
    });
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
