import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDObjectivePayload, HUDResultPayload, HUDLevelInfoPayload, HUDHealthPayload, HUDScorePayload, HUDWeatherPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

interface Hazard {
  sprite: Phaser.GameObjects.Arc;
  type: 'lightning' | 'wave' | 'wind' | 'debris' | 'rain';
  vx: number;
  vy: number;
  active: boolean;
}

interface WaveConfig {
  name: string;
  duration: number;
  hazards: ('lightning' | 'wave' | 'wind' | 'debris' | 'rain')[];
  spawnRate: number;
  intensity: number;
}

export class BossScene extends Phaser.Scene {
  private shipHealth = 100;
  private bossHealth = 100;
  private maxHealth = 100;
  private timeRemaining = 120;
  private totalTime = 120;
  private isComplete = false;
  private currentWave = 0;
  private hazards: Hazard[] = [];
  private shipX = GAME_WIDTH / 2;
  private shipY = GAME_HEIGHT - 80;
  private shipGfx!: Phaser.GameObjects.Graphics;
  private oceanGfx!: Phaser.GameObjects.Graphics;
  private waveTimer!: Phaser.Time.TimerEvent;
  private bossDefeated = false;
  private infoText!: Phaser.GameObjects.Text;

  private waves: WaveConfig[] = [
    { name: 'Gathering Storm', duration: 30, hazards: ['rain', 'wind'], spawnRate: 800, intensity: 0.3 },
    { name: 'Rough Seas', duration: 35, hazards: ['wave', 'rain', 'wind'], spawnRate: 550, intensity: 0.6 },
    { name: 'Eye of the Typhoon', duration: 40, hazards: ['lightning', 'wave', 'wind', 'debris'], spawnRate: 350, intensity: 1.0 },
  ];

  constructor() {
    super({ key: SCENES.BOSS });
  }

  create() {
    this.cameras.main.fadeIn(600);
    this.cameras.main.setBackgroundColor(0x050510);
    this.isComplete = false;
    this.hazards = [];
    this.shipHealth = 100;
    this.bossHealth = 100;
    this.maxHealth = 100;
    this.currentWave = 0;
    this.bossDefeated = false;
    this.timeRemaining = 120;
    this.totalTime = 120;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x0a0a20, 0x1a0a0a, 0x0a0515);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.oceanGfx = this.add.graphics().setDepth(DEPTH.BG);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, '⚡ Boss Challenge ⚡', {
      fontFamily: FONTS.DISPLAY, fontSize: '22px', color: '#D62828',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Boss Challenge',
      description: 'Survive the typhoon!',
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // Emit initial health
    this.emitHealth();

    // Info text (game-world overlay for wave announcements)
    this.infoText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: FONTS.DISPLAY, fontSize: '28px', color: '#FFFFFF',
      stroke: '#000000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);

    // Ship
    this.shipGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // Mouse input
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.shipX = Phaser.Math.Clamp(pointer.x, 40, GAME_WIDTH - 40);
      this.shipY = Phaser.Math.Clamp(pointer.y, GAME_HEIGHT * 0.5, GAME_HEIGHT - 40);
    });

    // Start first wave
    this.showWaveIntro(0);

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
        const stormProgress = 1 - this.bossHealth / this.maxHealth;
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: 22 + Math.round(this.currentWave * 3),
          humidity: 75 + Math.round(stormProgress * 20),
          windSpeed: Math.round(30 + this.currentWave * 25 + stormProgress * 40),
          stormLevel: Math.min(5, this.currentWave + 2),
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 10) { /* timer urgent handled by React */ }
        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    this.add.text(60, GAME_HEIGHT - 20, '← move ship with mouse', {
      fontFamily: FONTS.BODY, fontSize: '11px', color: '#4a6fa5',
    }).setOrigin(0, 1);

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: this.currentWave < this.waves.length
        ? `Survive: ${this.waves[this.currentWave].name}`
        : 'All waves cleared!',
      progress: this.currentWave + 1,
      target: this.waves.length,
    } satisfies HUDObjectivePayload);
  }

  private emitHealth() {
    this.game.events.emit(GAME_EVENTS.HUD_HEALTH, {
      current: this.shipHealth, max: this.maxHealth, label: 'Ship',
    } satisfies HUDHealthPayload);
    this.game.events.emit(GAME_EVENTS.HUD_HEALTH, {
      current: this.bossHealth, max: this.maxHealth, label: 'Storm',
    } satisfies HUDHealthPayload);
  }

  private showWaveIntro(waveIndex: number) {
    if (waveIndex >= this.waves.length) { this.victory(); return; }

    const wave = this.waves[waveIndex];
    this.currentWave = waveIndex;
    this.emitObjective();

    this.infoText.setText(`${wave.name}\nSurvive ${wave.duration}s`);
    this.infoText.setAlpha(1).setColor('#FFD166');
    this.tweens.add({ targets: this.infoText, alpha: 0, delay: 2000, duration: 500 });

    this.time.delayedCall(2500, () => this.startWave(waveIndex));
  }

  private startWave(waveIndex: number) {
    const wave = this.waves[waveIndex];
    this.emitObjective();

    this.waveTimer = this.time.addEvent({
      delay: wave.spawnRate,
      callback: () => this.spawnHazard(wave),
      loop: true,
    });

    this.time.delayedCall(wave.duration * 1000, () => {
      this.waveTimer.remove();
      this.hazards.forEach(h => { if (h.active) { h.sprite.destroy(); h.active = false; } });
      this.hazards = [];
      this.showWaveIntro(waveIndex + 1);
    });
  }

  private spawnHazard(wave: WaveConfig) {
    if (this.isComplete) return;
    const type = Phaser.Utils.Array.GetRandom(wave.hazards);
    let x: number, y: number, vx: number, vy: number;

    switch (type) {
      case 'lightning': x = Phaser.Math.Between(50, GAME_WIDTH - 50); y = 0; vx = 0; vy = Phaser.Math.Between(200, 400); break;
      case 'wave': x = Math.random() > 0.5 ? -10 : GAME_WIDTH + 10; y = GAME_HEIGHT - Phaser.Math.Between(60, 130); vx = (x < 0 ? 1 : -1) * Phaser.Math.Between(80, 180); vy = Phaser.Math.Between(-20, 20); break;
      case 'wind': x = -10; y = Phaser.Math.Between(100, GAME_HEIGHT - 100); vx = Phaser.Math.Between(150, 300); vy = Phaser.Math.Between(-30, 30); break;
      case 'debris': x = Phaser.Math.Between(0, GAME_WIDTH); y = Phaser.Math.Between(-20, -5); vx = Phaser.Math.Between(-80, 80); vy = Phaser.Math.Between(100, 250); break;
      default: x = Phaser.Math.Between(0, GAME_WIDTH); y = Phaser.Math.Between(-10, -5); vx = Phaser.Math.Between(-20, 20); vy = Phaser.Math.Between(200, 400); break;
    }

    const size = type === 'lightning' ? 8 : type === 'wave' ? 14 : type === 'wind' ? 5 : type === 'debris' ? 6 : 3;
    const colors: Record<string, number> = { lightning: 0xffdd00, wave: 0x0066cc, wind: 0x88ccff, debris: 0x8B4513, rain: 0x6699ff };
    const alpha = type === 'lightning' ? 1 : type === 'rain' ? 0.4 : 0.7;

    const sprite = this.add.circle(x, y, size, colors[type], alpha).setDepth(DEPTH.GAME_OBJECTS);
    if (type === 'lightning') this.cameras.main.flash(80, 200, 200, 255, false);

    const hazard: Hazard = { sprite, type, vx, vy, active: true };
    this.hazards.push(hazard);
    this.time.delayedCall(4000, () => { hazard.active = false; hazard.sprite.destroy(); });
  }

  private drawShip() {
    this.shipGfx.clear();
    this.shipGfx.fillStyle(0x4a4a6a, 1);
    this.shipGfx.fillTriangle(this.shipX, this.shipY - 20, this.shipX - 20, this.shipY + 10, this.shipX + 20, this.shipY + 10);
    this.shipGfx.lineStyle(3, 0x8B7355, 1);
    this.shipGfx.beginPath();
    this.shipGfx.moveTo(this.shipX, this.shipY - 10);
    this.shipGfx.lineTo(this.shipX, this.shipY - 35);
    this.shipGfx.strokePath();
    this.shipGfx.fillStyle(0xddd4c0, 0.8);
    this.shipGfx.fillTriangle(this.shipX + 1, this.shipY - 33, this.shipX + 1, this.shipY - 12, this.shipX + 18, this.shipY - 22);
  }

  private checkCollisions() {
    if (this.isComplete) return;
    for (const hazard of this.hazards) {
      if (!hazard.active) continue;
      const dist = Phaser.Math.Distance.Between(this.shipX, this.shipY, hazard.sprite.x, hazard.sprite.y);
      const hitRadius = hazard.type === 'wave' ? 22 : hazard.type === 'lightning' ? 15 : 18;
      if (dist < hitRadius) {
        hazard.active = false;
        hazard.sprite.destroy();

        const dmgMap: Record<string, number> = { lightning: 12, wave: 8, debris: 6, wind: 4, rain: 2 };
        let damage = dmgMap[hazard.type] || 2;
        damage *= this.waves[this.currentWave]?.intensity || 0.3;

        this.shipHealth = Math.max(0, this.shipHealth - damage);
        this.emitHealth();
        this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
          score: Math.round((1 - this.shipHealth / this.maxHealth) * 2000),
          label: 'Survival',
        } satisfies HUDScorePayload);
        this.cameras.main.shake(100, 0.005 * damage);

        for (let i = 0; i < 4; i++) {
          const p = this.add.circle(this.shipX, this.shipY, 3, 0xff4444, 0.8).setDepth(DEPTH.PARTICLES);
          this.tweens.add({ targets: p, x: this.shipX + Phaser.Math.Between(-30, 30), y: this.shipY + Phaser.Math.Between(-30, 30), alpha: 0, duration: 500, onComplete: () => p.destroy() });
        }

        if (this.shipHealth <= 0) { this.failLevel(); return; }

        if (!this.bossDefeated) {
          this.bossHealth -= damage * 0.8;
          this.bossHealth = Math.max(0, this.bossHealth);
          this.emitHealth();
          if (this.bossHealth <= 0) { this.bossDefeated = true; this.victory(); }
        }
      }
    }
  }

  private victory() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.waveTimer) this.waveTimer.remove();

    const healthBonus = Math.round(this.shipHealth * 5);
    const bossBonus = this.bossDefeated ? 1500 : 500;
    const timeBonus = Math.round(this.timeRemaining / this.totalTime * 500);
    const score = 2000 + healthBonus + bossBonus + timeBonus;
    const stars = GameManager.getStars(score, 4000);

    GameManager.getInstance().completeLevel('boss', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['boss'] || {};
    progress['boss'] = {
      completed: true, bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_boss'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(800, 255, 255, 255);

    this.tweens.addCounter({
      from: 0, to: 1, duration: 2000,
      onUpdate: (tween) => {
        const v = tween.getValue();
        this.cameras.main.setBackgroundColor(
          Phaser.Display.Color.GetColor(Math.round(5 + (v ?? 0) * 30), Math.round(5 + (v ?? 0) * 40), Math.round(16 + (v ?? 0) * 60)),
        );
      },
    });

    const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Storm Conquered!', {
      fontFamily: FONTS.DISPLAY, fontSize: '36px', color: '#06D6A0',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);
    this.tweens.add({ targets: victoryText, alpha: 1, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete', title: 'Storm Conquered!',
      subtitle: 'You survived the typhoon!',
      score, stars, levelId: 'boss',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_boss'],
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    if (this.waveTimer) this.waveTimer.remove();

    const failText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Ship Lost!\nBetter luck next time.', {
      fontFamily: FONTS.DISPLAY, fontSize: '28px', color: '#D62828',
      stroke: '#000000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY);

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail', title: 'Ship Lost!', subtitle: 'The typhoon was too strong',
      score: 0, stars: 0, levelId: 'boss',
      timeUsed: this.totalTime, factsUnlocked: [],
    });
  }

  update(_time: number, _delta: number) {
    if (this.isComplete) return;
    for (const hazard of this.hazards) {
      if (!hazard.active) continue;
      hazard.sprite.x += (hazard.vx / 60) * (_delta / 16);
      hazard.sprite.y += (hazard.vy / 60) * (_delta / 16);
      if (hazard.sprite.y > GAME_HEIGHT + 30 || hazard.sprite.y < -30 ||
          hazard.sprite.x < -30 || hazard.sprite.x > GAME_WIDTH + 30) {
        hazard.active = false;
        hazard.sprite.destroy();
      }
    }
    this.drawShip();
    this.drawOcean();
    this.checkCollisions();
    this.hazards = this.hazards.filter(h => h.active);
  }

  private drawOcean() {
    this.oceanGfx.clear();
    const time = Date.now() / 1000;
    const waveHeight = 8 + (this.currentWave + 1) * 3;
    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.08 + layer * 0.05;
      const offset = layer * 0.5;
      this.oceanGfx.lineStyle(2, 0x1a4a7a, alpha);
      this.oceanGfx.beginPath();
      this.oceanGfx.moveTo(0, GAME_HEIGHT - 50 + layer * 15);
      for (let x = 0; x <= GAME_WIDTH; x += 5) {
        const y = GAME_HEIGHT - 50 + layer * 15 +
          Math.sin(x * 0.02 + time * 2 + offset) * waveHeight * 0.3 +
          Math.sin(x * 0.05 + time * 1.5 + offset) * waveHeight * 0.2;
        this.oceanGfx.lineTo(x, y);
      }
      this.oceanGfx.strokePath();
    }
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
