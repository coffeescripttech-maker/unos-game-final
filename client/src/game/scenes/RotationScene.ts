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
  HUDLevelIntroPayload
} from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

interface CollectibleOrb {
  sprite: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  angle: number;
  radius: number;
  collected: boolean;
  value: number;
}

interface DeflectionParticle {
  sprite: Phaser.GameObjects.Arc;
  trail: Phaser.GameObjects.Arc[];
  targetX: number;
  targetY: number;
  speed: number;
  collected: boolean;
}

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
  private targetRotation = 3600;
  private hemisphere = 'northern';
  private hemisphereText!: Phaser.GameObjects.Text;
  private vortexParticles: Phaser.GameObjects.Arc[] = [];
  private gameStarted = false;

  // ── Wind Gust (headwind) ──
  private windGustTimer!: Phaser.Time.TimerEvent;
  private headwindActive = false;
  private headwindText!: Phaser.GameObjects.Text;
  private windGustGfx!: Phaser.GameObjects.Graphics;
  private headwindPenalty = 0;

  // ── Rain Effect ──
  private rainTimer!: Phaser.Time.TimerEvent;
  private rainStreakPool: Phaser.GameObjects.Rectangle[] = [];

  // ── Lightning & Storm ──
  private stormOverlay!: Phaser.GameObjects.Graphics;
  private lastMilestone = 0;
  private lightningGfx!: Phaser.GameObjects.Graphics;
  private ringGfx!: Phaser.GameObjects.Graphics;

  // ── Coriolis Deflection ──
  private deflectionParticles: DeflectionParticle[] = [];
  private deflectionSpawnTimer!: Phaser.Time.TimerEvent;
  private deflectionScore = 0;

  // ── Collectible Orbs ──
  private collectibleOrbs: CollectibleOrb[] = [];
  private orbSpawnTimer!: Phaser.Time.TimerEvent;
  private orbBonusScore = 0;

  // ── Timers (stopped until game starts) ──
  private countdownTimer!: Phaser.Time.TimerEvent;
  private spinDecayTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: SCENES.ROTATION });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0a0a1a);
    this.isComplete = false;
    this.gameStarted = false;
    this.rotationProgress = 0;
    this.timeRemaining = 60;
    this.totalTime = 60;
    this.pointerPositions = [];
    this.totalRotation = 0;
    this.isDragging = false;
    this.vortexParticles = [];
    this.lastMilestone = 0;
    this.deflectionParticles = [];
    this.collectibleOrbs = [];
    this.deflectionScore = 0;
    this.orbBonusScore = 0;
    this.headwindPenalty = 0;

    // ── Background (with slow zoom + drift animation) ──
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'rotation_bg').setDepth(0);
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
    // Subtle drift so it feels alive
    this.tweens.add({
      targets: bg,
      x: GAME_WIDTH / 2 + Phaser.Math.Between(-6, 6),
      duration: 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    const overlay = this.add.graphics().setDepth(0);
    overlay.fillStyle(0x000000, 0.4);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Storm overlay ──
    this.stormOverlay = this.add.graphics().setDepth(0);
    this.stormOverlay.fillStyle(0x000000, 0);
    this.stormOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Lightning flash overlay ──
    this.lightningGfx = this.add.graphics().setDepth(6);
    this.lightningGfx.fillStyle(0xffffff, 0);
    this.lightningGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Instruction text ──
    const instrBg = this.add.graphics().setDepth(4);
    instrBg.fillStyle(0x444444, 0.6);
    instrBg.fillRoundedRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT - 70, 320, 40, 8);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '🌀 Spin in circles to build Coriolis force', {
        fontFamily: FONTS.BODY,
        fontSize: '13px',
        color: '#FFFFFF',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Headwind warning text ──
    this.headwindText = this.add
      .text(GAME_WIDTH / 2, 280, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '22px',
        color: '#FF6B6B',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setAlpha(0);

    this.windGustGfx = this.add.graphics().setDepth(2);

    // ── Hemisphere indicator ──
    this.hemisphereText = this.add
      .text(GAME_WIDTH / 2, 70, '🌍 Northern Hemisphere (CW)', {
        fontFamily: FONTS.BODY,
        fontSize: '14px',
        color: '#6DB3E6'
      })
      .setOrigin(0.5);

    // ── Guidance circles (dynamic — will light up with progress) ──
    this.ringGfx = this.add.graphics().setDepth(1);
    this.drawRings(0);

    this.add
      .text(this.centerX, this.centerY + 115, 'spin here', {
        fontFamily: FONTS.BODY,
        fontSize: '12px',
        color: '#4a6fa5'
      })
      .setOrigin(0.5);

    // ── Vortex graphics ──
    this.vortexGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // ── Toggle hemisphere button ──
    const toggleBtn = this.add
      .text(GAME_WIDTH - 20, 75, 'Toggle', {
        fontFamily: FONTS.BODY,
        fontSize: '12px',
        color: '#6DB3E6',
        backgroundColor: '#1a1a3e',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    toggleBtn.on('pointerdown', () => {
      this.hemisphere =
        this.hemisphere === 'northern' ? 'southern' : 'northern';
      this.hemisphereText.setText(
        this.hemisphere === 'northern'
          ? '🌍 Northern Hemisphere (CW)'
          : '🌍 Southern Hemisphere (CCW)'
      );
      this.totalRotation = 0;
      this.updateUI();
    });

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);

    // ── Show intro overlay ──
    this.showIntroOverlay();
  }

  // ═══════════════════════════════════════════════
  //  INTRO OVERLAY
  // ═══════════════════════════════════════════════

  private showIntroOverlay() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'rotation',
      badge: '🌀 LEVEL 4',
      title: 'Coriolis Effect',
      subtitle: 'Spin to create the Coriolis Force!',
      mechanics: [
        { icon: '🔄', text: 'Spin your finger CW (Northern) or CCW (Southern) around the circle' },
        { icon: '💨', text: '💨 HEADWINDS appear! Spin harder or you\'ll lose progress!' },
        { icon: '💫', text: 'Collect golden orbs for bonus points — they appear around the spin zone' },
        { icon: '⚡', text: 'At 50%+ storm builds — screen shakes & lightning flashes!' },
        { icon: '🎯', text: 'At 75%+ catch Coriolis particles — they deflect Right or Left!' },
        { icon: '⏱️', text: 'You have 60 seconds. Reach 10 full spins (3600°) to win!' }
      ]
    } satisfies HUDLevelIntroPayload);

    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Rotation',
      description: 'Spin to build Coriolis force'
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // ── Input (only enabled after intro) ──
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.onPointerDown(pointer)
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) =>
      this.onPointerMove(pointer)
    );
    this.input.on('pointerup', () => this.onPointerUp());

    // ── Countdown timer ──
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
          remaining: this.timeRemaining,
          total: this.totalTime
        } satisfies HUDTimerPayload);

        const windSpeed = Math.round(10 + this.rotationProgress * 70);
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: 27,
          humidity: 65 + Math.round(this.rotationProgress * 20),
          windSpeed,
          stormLevel:
            this.rotationProgress > 0.8
              ? 3
              : this.rotationProgress > 0.5
                ? 2
                : 1
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true
    });

    // ── Auto spin-down (faster decay + headwind penalty) ──
    this.spinDecayTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isComplete || this.isDragging || !this.gameStarted) return;
        // Decay scales with progress — harder to maintain at higher %
        const progressDecay = this.rotationProgress * 8;
        let decay = 4 + progressDecay;
        if (this.headwindActive) decay += 10;
        if (this.totalRotation > 0) {
          this.totalRotation = Math.max(0, this.totalRotation - decay);
          this.updateUI();
        }
      },
      loop: true
    });

    // ── Wind Gust spawn (every 3–5s, bigger penalty) ──
    this.windGustTimer = this.time.addEvent({
      delay: Phaser.Math.Between(2500, 4000),
      callback: () => this.spawnWindGust(),
      loop: true
    });

    // ── Collectible Orb spawn (every 2.5s) ──
    this.orbSpawnTimer = this.time.addEvent({
      delay: 2500,
      callback: () => this.spawnCollectibleOrb(),
      loop: true
    });

    // ── Coriolis Deflection spawn ──
    this.deflectionSpawnTimer = this.time.addEvent({
      delay: 5000,
      callback: () => {
        if (this.rotationProgress >= 0.75 && !this.isComplete) {
          this.spawnDeflectionParticle();
        }
      },
      loop: true
    });

    // ── Rain effect spawn (only active when storm is active) ──
    this.rainTimer = this.time.addEvent({
      delay: 80,
      callback: () => this.spawnRainStreak(),
      loop: true
    });
  };

  // ═══════════════════════════════════════════════
  //  FEATURE 1: Wind Gust (Headwind)
  // ═══════════════════════════════════════════════

  private spawnWindGust() {
    if (this.isComplete || !this.gameStarted) return;
    this.headwindActive = true;

    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -80 : GAME_WIDTH + 80;
    const endX = fromLeft ? GAME_WIDTH + 80 : -80;
    const gustY = Phaser.Math.Between(200, 500);

    // Animated wind gust arrow
    this.windGustGfx.clear();
    this.windGustGfx.lineStyle(3, 0xff6b6b, 0.9);
    this.windGustGfx.beginPath();
    this.windGustGfx.moveTo(startX, gustY);
    this.windGustGfx.lineTo(endX, gustY);
    this.windGustGfx.strokePath();
    this.windGustGfx.fillStyle(0xff6b6b, 0.9);
    this.windGustGfx.fillTriangle(
      endX, gustY,
      endX - (fromLeft ? -20 : 20), gustY - 8,
      endX - (fromLeft ? -20 : 20), gustY + 8
    );

    // Show warning text
    this.headwindText.setText('💨 HEADWIND!');
    this.tweens.add({
      targets: this.headwindText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Fade gust after a moment
    this.tweens.addCounter({
      from: 0,
      to: 10,
      duration: 2000,
      onUpdate: tween => {
        const v = tween.getValue() ?? 0;
        if (v < 3) return;
        this.windGustGfx.clear();
      },
      onComplete: () => {
        this.windGustGfx.clear();
        this.headwindActive = false;
        this.tweens.add({
          targets: this.headwindText,
          alpha: 0,
          duration: 400,
          onComplete: () => this.headwindText.setText('')
        });
      }
    });

    // Bigger penalty
    const penalty = Phaser.Math.Between(50, 120);
    this.headwindPenalty += penalty;
    const pop = this.add
      .text(this.centerX, this.centerY - 60, `-${penalty}° 💨`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '20px',
        color: '#FF6B6B',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y - 40,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });

    this.totalRotation = Math.max(0, this.totalRotation - penalty);
    this.updateUI();
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 2: Lightning & Storm Payoff
  // ═══════════════════════════════════════════════

  private checkStormMilestones() {
    const currentMilestone = Math.floor(this.rotationProgress * 10);
    if (currentMilestone > this.lastMilestone) {
      this.lastMilestone = currentMilestone;

      const stormAlpha = Math.min(0.4, this.rotationProgress * 0.4);
      this.stormOverlay.clear();
      this.stormOverlay.fillStyle(0x000000, stormAlpha);
      this.stormOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      if (currentMilestone >= 5) {
        this.cameras.main.shake(250, 0.003 * (1 + currentMilestone * 0.15));

        if (currentMilestone >= 6) {
          this.flashLightning();
        }

        const pct = currentMilestone * 10;
        const msg = this.add
          .text(
            GAME_WIDTH / 2,
            this.centerY - 100,
            `⚡ ${pct}% Storm Intensity!`,
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
  }

  private flashLightning() {
    // ── Main bolt ──
    const boltGfx = this.add.graphics().setDepth(7);
    const boltX = this.centerX + Phaser.Math.Between(-200, 200);
    this.drawLightningBolt(
      boltX, 0,
      this.centerX + Phaser.Math.Between(-40, 40), this.centerY,
      boltGfx, 0xffffff, 3
    );

    // ── Branch bolts ──
    const branches = Phaser.Math.Between(1, 3);
    for (let i = 0; i < branches; i++) {
      const branchGfx = this.add.graphics().setDepth(7);
      const splitY = Phaser.Math.Between(100, 250);
      const bx = boltX + Phaser.Math.Between(-30, 30);
      const bx2 = bx + (Math.random() > 0.5 ? Phaser.Math.Between(30, 100) : Phaser.Math.Between(-100, -30));
      this.drawLightningBolt(bx, splitY, bx2, splitY + Phaser.Math.Between(80, 180), branchGfx, 0xccccff, 1.5);
      // Fade branch
      this.tweens.add({ targets: branchGfx, alpha: 0, delay: 0.1, duration: 300, onComplete: () => branchGfx.destroy() });
    }

    // ── Screen white flash ──
    this.lightningGfx.clear();
    this.lightningGfx.fillStyle(0xffffff, 0.5);
    this.lightningGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: this.lightningGfx,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.lightningGfx.clear();
        this.lightningGfx.setAlpha(1);
      }
    });

    // ── Thunder rumble — quick shakes that decay ──
    this.cameras.main.shake(120, 0.008);
    this.time.delayedCall(150, () => {
      if (!this.isComplete) this.cameras.main.shake(100, 0.005);
    });
    this.time.delayedCall(300, () => {
      if (!this.isComplete) this.cameras.main.shake(80, 0.003);
    });

    // ── Fade and destroy main bolt ──
    this.tweens.add({
      targets: boltGfx,
      alpha: 0,
      delay: 0.15,
      duration: 400,
      onComplete: () => boltGfx.destroy()
    });
  }

  /** Draw a jagged zigzag lightning bolt between two points with glow */
  private drawLightningBolt(
    x1: number, y1: number,
    x2: number, y2: number,
    gfx: Phaser.GameObjects.Graphics,
    color: number,
    lineWidth: number
  ) {
    const segments = Phaser.Math.Between(5, 9);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const maxJitter = Math.max(20, Math.min(50, Math.abs(dx + dy) * 0.08));

    // Generate points first so glow and main bolt share the same path
    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      points.push({
        x: x1 + dx * t + Phaser.Math.Between(-maxJitter, maxJitter),
        y: y1 + dy * t + Phaser.Math.Between(-maxJitter * 0.3, maxJitter * 0.3)
      });
    }
    points.push({ x: x2, y: y2 });

    // Outer glow
    gfx.lineStyle(lineWidth * 3, color, 0.2);
    gfx.beginPath();
    points.forEach((p, i) => i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y));
    gfx.strokePath();

    // Mid glow
    gfx.lineStyle(lineWidth * 1.8, 0xeeeeff, 0.5);
    gfx.beginPath();
    points.forEach((p, i) => i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y));
    gfx.strokePath();

    // Core bolt (brightest)
    gfx.lineStyle(lineWidth, color, 1);
    gfx.beginPath();
    points.forEach((p, i) => i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y));
    gfx.strokePath();
  }

  /**
   * Continuous spin effects: lightning, thunder, screen effects
   * while the player is actively spinning at high progress.
   */
  private processSpinEffects(degreeDelta: number) {
    if (this.isComplete || !this.gameStarted) return;
    const intensity = Math.min(1, degreeDelta / 12); // 0–1 based on spin speed

    // ── Storm overlay — pulses with spin intensity at 30%+ ──
    if (this.rotationProgress > 0.3) {
      const baseDark = this.rotationProgress * 0.25;
      const pulse = intensity * 0.08;
      this.stormOverlay.clear();
      this.stormOverlay.fillStyle(0x000000, baseDark + pulse);
      this.stormOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // ── Random lightning at 50%+ (more likely the faster you spin) ──
    if (this.rotationProgress >= 0.5 && intensity > 0.2) {
      const lightningChance = intensity * (this.rotationProgress >= 0.8 ? 0.04 : 0.015);
      if (Math.random() < lightningChance) {
        this.flashLightning();
      }
    }

    // ── Screen shake scales with spin speed ──
    if (this.rotationProgress >= 0.4 && this.cameras.main) {
      const shakeMag = 0.001 * intensity * (1 + this.rotationProgress);
      if (shakeMag > 0.001) {
        this.cameras.main.shake(80, shakeMag);
      }
    }

    // ── Bright vortex flash streaks at 60%+ during fast spin ──
    if (this.rotationProgress >= 0.6 && intensity > 0.4 && Math.random() < 0.03) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.Between(40, 90);
      const streak = this.add
        .circle(
          this.centerX + Math.cos(a) * r,
          this.centerY + Math.sin(a) * r,
          Phaser.Math.Between(2, 5),
          0xffffff,
          0.5
        )
        .setDepth(2)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: streak,
        alpha: 0,
        scale: 2,
        duration: 200,
        onComplete: () => streak.destroy()
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 3: Coriolis Deflection
  // ═══════════════════════════════════════════════

  private spawnDeflectionParticle() {
    if (this.isComplete) return;

    const spawnAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const spawnRadius = Phaser.Math.Between(30, 80);
    const sx = this.centerX + Math.cos(spawnAngle) * spawnRadius;
    const sy = this.centerY + Math.sin(spawnAngle) * spawnRadius;

    const deflectionDir = this.hemisphere === 'northern' ? 1 : -1;
    const targetAngle = spawnAngle + deflectionDir * Phaser.Math.FloatBetween(0.3, 0.8);
    const targetDist = Phaser.Math.Between(120, 200);
    const tx = this.centerX + Math.cos(targetAngle) * targetDist;
    const ty = this.centerY + Math.sin(targetAngle) * targetDist;

    const sprite = this.add
      .circle(sx, sy, 6, 0xffd166, 0.9)
      .setDepth(4)
      .setScale(0.01);

    this.tweens.add({
      targets: sprite,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });

    const glow = this.add
      .circle(sx, sy, 12, 0xffd166, 0.15)
      .setDepth(3)
      .setScale(0.01);
    this.tweens.add({
      targets: glow,
      scale: 1.2,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => glow.destroy()
    });

    const dirLabel = this.hemisphere === 'northern' ? '→ Right' : '← Left';
    const label = this.add
      .text(tx, ty - 18, dirLabel, {
        fontFamily: FONTS.BODY,
        fontSize: '10px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, delay: 300, duration: 300 });

    const particle: DeflectionParticle = {
      sprite,
      trail: [sprite],
      targetX: tx,
      targetY: ty,
      speed: Phaser.Math.FloatBetween(60, 120),
      collected: false
    };
    this.deflectionParticles.push(particle);

    const dist = Phaser.Math.Distance.Between(sx, sy, tx, ty);
    const duration = (dist / particle.speed) * 1000;
    this.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!particle.collected) {
          this.showDeflectionInfo(tx, ty, false);
          particle.collected = true;
        }
        this.time.delayedCall(500, () => {
          sprite.destroy();
          label.destroy();
        });
      }
    });

    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 150, () => {
        if (particle.collected || !sprite.active) return;
        const t = this.add
          .circle(sprite.x, sprite.y, 3, 0xffd166, 0.3)
          .setDepth(3);
        this.tweens.add({
          targets: t,
          alpha: 0,
          scale: 0.1,
          duration: 400,
          onComplete: () => t.destroy()
        });
      });
    }
  }

  private showDeflectionInfo(x: number, y: number, collected: boolean) {
    const msg = collected
      ? `✅ Caught! ${this.hemisphere === 'northern' ? 'Right' : 'Left'} deflection`
      : `💨 Deflected ${this.hemisphere === 'northern' ? '→ Right' : '← Left'}`;
    const color = collected ? '#06D6A0' : '#FFD166';
    const pop = this.add
      .text(x, y - 10, msg, {
        fontFamily: FONTS.BODY,
        fontSize: '11px',
        color,
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y - 25,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });
  }

  private checkDeflectionCollision(px: number, py: number) {
    if (this.rotationProgress < 0.75) return;
    this.deflectionParticles.forEach(p => {
      if (p.collected || !p.sprite.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, p.sprite.x, p.sprite.y);
      if (dist < 60) {
        p.collected = true;
        this.deflectionScore += 150;

        this.tweens.add({
          targets: p.sprite,
          scale: 2,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => p.sprite.destroy()
        });

        const pop = this.add
          .text(p.sprite.x, p.sprite.y - 15, '+150 Coriolis!', {
            fontFamily: FONTS.DISPLAY,
            fontSize: '14px',
            color: '#06D6A0',
            stroke: '#000000',
            strokeThickness: 3
          })
          .setOrigin(0.5)
          .setDepth(7)
          .setAlpha(0);
        this.tweens.add({
          targets: pop,
          alpha: { from: 1, to: 0 },
          y: pop.y - 30,
          duration: 1000,
          ease: 'Quad.easeOut',
          onComplete: () => pop.destroy()
        });

        this.showDeflectionInfo(p.sprite.x, p.sprite.y, true);
        this.updateUI();
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 4: Collectible Orbs
  // ═══════════════════════════════════════════════

  private spawnCollectibleOrb() {
    if (this.isComplete || !this.gameStarted || this.collectibleOrbs.length >= 5) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(50, 110);
    const x = this.centerX + Math.cos(angle) * radius;
    const y = this.centerY + Math.sin(angle) * radius;
    const value = Phaser.Math.Between(50, 120);

    const glow = this.add
      .circle(x, y, 16, 0xffd166, 0.15)
      .setDepth(3);

    const sprite = this.add
      .circle(x, y, 8, 0xffd166, 0.9)
      .setDepth(4)
      .setScale(0.01);

    this.tweens.add({
      targets: sprite,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: glow,
      scale: { from: 1, to: 1.4 },
      alpha: { from: 0.15, to: 0.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: sprite,
      scale: { from: 1, to: 0.85 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const orb: CollectibleOrb = {
      sprite,
      glow,
      angle,
      radius,
      collected: false,
      value
    };
    this.collectibleOrbs.push(orb);

    this.time.delayedCall(5000, () => {
      if (orb.collected) return;
      orb.collected = true;
      this.tweens.add({
        targets: [sprite, glow],
        alpha: 0,
        scale: 0.1,
        duration: 400,
        onComplete: () => {
          sprite.destroy();
          glow.destroy();
        }
      });
      this.collectibleOrbs = this.collectibleOrbs.filter(o => o !== orb);
    });
  }

  private checkOrbCollision(px: number, py: number) {
    this.collectibleOrbs.forEach(orb => {
      if (orb.collected) return;
      const dist = Phaser.Math.Distance.Between(
        px, py,
        orb.sprite.x, orb.sprite.y
      );
      if (dist < 40) {
        orb.collected = true;
        this.orbBonusScore += orb.value;

        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6;
          const p = this.add
            .circle(orb.sprite.x, orb.sprite.y, 4, 0xffd166, 0.7)
            .setDepth(4);
          this.tweens.add({
            targets: p,
            x: orb.sprite.x + Math.cos(a) * 40,
            y: orb.sprite.y + Math.sin(a) * 40,
            alpha: 0,
            scale: 0.1,
            duration: 400,
            onComplete: () => p.destroy()
          });
        }

        const pop = this.add
          .text(orb.sprite.x, orb.sprite.y - 15, `+${orb.value} 💫`, {
            fontFamily: FONTS.DISPLAY,
            fontSize: '16px',
            color: '#FFD166',
            stroke: '#000000',
            strokeThickness: 3
          })
          .setOrigin(0.5)
          .setDepth(7)
          .setAlpha(0);
        this.tweens.add({
          targets: pop,
          alpha: { from: 1, to: 0 },
          y: pop.y - 30,
          duration: 1000,
          ease: 'Quad.easeOut',
          onComplete: () => pop.destroy()
        });

        orb.sprite.destroy();
        orb.glow.destroy();

        this.updateUI();
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  NEW: Rain Effect, Spin Trail, Vortex Heartbeat
  // ═══════════════════════════════════════════════

  /**
   * Rain streaks that fall more intensely as storm progresses.
   * Only active when rotationProgress >= 0.5.
   */
  private spawnRainStreak() {
    if (this.isComplete || this.rotationProgress < 0.5) return;
    const intensity = (this.rotationProgress - 0.5) * 2; // 0 → 1
    if (Math.random() > intensity * 0.6) return;

    const x = Phaser.Math.Between(0, GAME_WIDTH);
    const len = Phaser.Math.Between(12, 35);
    const alpha = Phaser.Math.FloatBetween(0.08, 0.2) * intensity;
    const speed = Phaser.Math.Between(300, 700);

    const streak = this.add.rectangle(x, -len, 1.5, len, 0x88bbee, alpha)
      .setDepth(1);
    this.rainStreakPool.push(streak);

    this.tweens.add({
      targets: streak,
      y: GAME_HEIGHT + len,
      duration: speed,
      onComplete: () => {
        streak.destroy();
        this.rainStreakPool = this.rainStreakPool.filter(s => s !== streak);
      }
    });

    // Limit pool
    if (this.rainStreakPool.length > 60) {
      const oldest = this.rainStreakPool.shift();
      if (oldest) oldest.destroy();
    }
  }

  /**
   * Comet trail that follows the finger while spinning.
   */
  private spawnSpinTrail(x: number, y: number, speed: number) {
    if (speed < 0.02) speed = 0.02;
    const size = Phaser.Math.Between(2, 5);
    const progress = this.rotationProgress;
    const brightness = 0.3 + progress * 0.5;
    const color = speed > 0.3 ? 0x88ddff : 0x6db3e6;

    const trail = this.add
      .circle(x, y, size, color, brightness)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Sparkle core
    const core = this.add
      .circle(x, y, size * 0.4, 0xffffff, 0.8)
      .setDepth(3);

    this.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.1 + speed * 0.5,
      duration: Phaser.Math.Between(200, 400),
      onComplete: () => trail.destroy()
    });
    this.tweens.add({
      targets: core,
      alpha: 0,
      scale: 0.3,
      duration: Phaser.Math.Between(100, 150),
      onComplete: () => core.destroy()
    });
  }

  /**
   * Draw progress rings that light up as the storm intensifies.
   * Ring 1 (inner, r=70) lights at 25%, ring 2 (mid, r=100) at 50%, ring 3 (outer, r=130) at 75%.
   */
  private drawRings(progress: number) {
    this.ringGfx.clear();
    const rings = [
      { radius: 70, unlockAt: 0.25 },
      { radius: 100, unlockAt: 0.50 },
      { radius: 130, unlockAt: 0.75 }
    ];
    rings.forEach(r => {
      const lit = progress >= r.unlockAt;
      const color = lit ? 0x6db3e6 : 0x4a6fa5;
      const alpha = lit ? 0.7 : 0.2;
      const width = lit ? 2.5 : 1;
      // Glow when lit
      if (lit) {
        this.ringGfx.lineStyle(width + 3, 0x88ddff, 0.15);
        this.ringGfx.strokeCircle(this.centerX, this.centerY, r.radius);
      }
      this.ringGfx.lineStyle(width, color, alpha);
      this.ringGfx.strokeCircle(this.centerX, this.centerY, r.radius);
    });
  }

  /**
   * Spawn red spark particles when spinning the wrong direction.
   */
  private spawnWrongDirectionSparks(x: number, y: number) {
    if (this.isComplete) return;
    const count = Phaser.Math.Between(2, 4);
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(15, 35);
      const size = Phaser.Math.Between(2, 4);
      const spark = this.add
        .circle(x, y, size, 0xff4444, 0.8)
        .setDepth(5);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(250, 400),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'clockwise' : 'counter-clockwise'}`,
      progress: Math.round(this.totalRotation),
      target: this.targetRotation
    } satisfies HUDObjectivePayload);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.gameStarted) return;
    const dist = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.centerX,
      this.centerY
    );
    if (dist < 140 && dist > 30) {
      this.isDragging = true;
      this.pointerPositions = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
      this.lastAngle = Phaser.Math.Angle.Between(
        this.centerX,
        this.centerY,
        pointer.x,
        pointer.y
      );
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging || !this.gameStarted) return;

    // Check orb & deflection collisions
    this.checkOrbCollision(pointer.x, pointer.y);
    if (this.rotationProgress >= 0.75) {
      this.checkDeflectionCollision(pointer.x, pointer.y);
    }

    this.pointerPositions.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
    if (this.pointerPositions.length > 10) this.pointerPositions.shift();

    const currentAngle = Phaser.Math.Angle.Between(
      this.centerX,
      this.centerY,
      pointer.x,
      pointer.y
    );
    let delta = currentAngle - this.lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    // Wrong direction = LOSES progress + red sparks
    const isWrongDir =
      (this.hemisphere === 'northern' && delta < 0) ||
      (this.hemisphere === 'southern' && delta > 0);
    if (isWrongDir && Math.abs(delta) > 0.1) {
      this.spawnWrongDirectionSparks(pointer.x, pointer.y);
    }

    const gainMultiplier = this.headwindActive ? 0.5 : 1;
    if (this.hemisphere === 'northern') {
      if (delta > 0) {
        this.totalRotation += Phaser.Math.RadToDeg(delta) * gainMultiplier;
      } else {
        this.totalRotation += Phaser.Math.RadToDeg(delta) * 0.5;
      }
    } else {
      if (delta < 0) {
        this.totalRotation += Phaser.Math.RadToDeg(-delta) * gainMultiplier;
      } else {
        this.totalRotation -= Phaser.Math.RadToDeg(delta) * 0.5;
      }
    }
    this.totalRotation = Math.max(0, this.totalRotation);
    this.lastAngle = currentAngle;

    this.updateUI();
    this.updateVortex();
    this.spawnVortexParticle(pointer.x, pointer.y);
    this.spawnSpinTrail(pointer.x, pointer.y, Math.abs(delta) > 0.05 ? Math.abs(delta) : 0);

    this.rotationProgress = Math.min(
      1,
      this.totalRotation / this.targetRotation
    );

    this.drawRings(this.rotationProgress);
    this.checkStormMilestones();

    // Continuous spin effects: thunder, lightning, shake while dragging
    this.processSpinEffects(Math.abs(delta));

    if (this.totalRotation >= this.targetRotation) this.completeLevel();
  }

  private onPointerUp() {
    if (!this.gameStarted) return;
    this.isDragging = false;
    this.pointerPositions = [];
  }

  private spawnVortexParticle(x: number, y: number) {
    const particle = this.add
      .circle(x, y, 3, 0x6db3e6, 0.6)
      .setDepth(DEPTH.PARTICLES);
    const targetAngle = Phaser.Math.Angle.Between(
      x,
      y,
      this.centerX,
      this.centerY
    );
    const targetDist = Phaser.Math.Between(5, 30);
    this.tweens.add({
      targets: particle,
      x: this.centerX + Math.cos(targetAngle) * targetDist,
      y: this.centerY + Math.sin(targetAngle) * targetDist,
      alpha: 0,
      scale: 0.2,
      duration: 800,
      onComplete: () => particle.destroy()
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
      if (i === 0)
        this.vortexGfx.moveTo(
          this.centerX + Math.cos(angle) * radius,
          this.centerY + Math.sin(angle) * radius
        );
      else
        this.vortexGfx.lineTo(
          this.centerX + Math.cos(angle) * radius,
          this.centerY + Math.sin(angle) * radius
        );
    }
    this.vortexGfx.strokePath();

    if (progress > 0.5) {
      // Heartbeat pulse: eye expands and contracts like a beating heart
      const heartbeat = Math.sin(this.time.now * 0.006) * 0.12 + 1;
      const eyeSize = (10 + (1 - progress) * 10) * heartbeat;
      // Inner dark core
      this.vortexGfx.fillStyle(0x0d1b2a, 0.9);
      this.vortexGfx.fillCircle(this.centerX, this.centerY, eyeSize);
      // Golden glow ring with pulse
      const glowPulse = Math.sin(this.time.now * 0.004 + 1) * 0.15 + 0.6;
      this.vortexGfx.lineStyle(2, 0xffd166, glowPulse);
      this.vortexGfx.strokeCircle(this.centerX, this.centerY, eyeSize + 4);
      // Outer electric ring at high progress
      if (progress > 0.75) {
        const elecPulse = Math.sin(this.time.now * 0.008) * 0.3 + 0.3;
        this.vortexGfx.lineStyle(1, 0x88ddff, elecPulse);
        this.vortexGfx.strokeCircle(this.centerX, this.centerY, eyeSize + 10);
      }
    }
  }

  private updateUI() {
    const totalBonus = this.orbBonusScore + this.deflectionScore;
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'clockwise' : 'counter-clockwise'}`,
      progress: Math.round(this.totalRotation),
      target: this.targetRotation
    } satisfies HUDObjectivePayload);
    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score: Math.round((this.totalRotation / this.targetRotation) * 2500) + totalBonus,
      label: 'Spin'
    } satisfies HUDScorePayload);
  }

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    const timeBonus = Math.round((this.timeRemaining / this.totalTime) * 400);
    const score = 2500 + timeBonus + this.orbBonusScore + this.deflectionScore;
    const stars = GameManager.getStars(score, 3600);

    GameManager.getInstance().completeLevel(
      'rotation',
      score,
      stars,
      this.totalTime - this.timeRemaining
    );
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['rotation'] || {};
    progress['rotation'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(
        existing.bestTime ?? 999,
        this.totalTime - this.timeRemaining
      ),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_rotation']
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(500, 0.005);

    // Dramatic vortex finish
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1500,
      onUpdate: tween => {
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
          this.vortexGfx.lineTo(
            x + Math.cos(angle + 0.1) * 2,
            y + Math.sin(angle + 0.1) * 2
          );
        }
        this.vortexGfx.strokePath();
      }
    });

    const bonusSummary = this.orbBonusScore + this.deflectionScore > 0
      ? `\n💰 Bonus: +${this.orbBonusScore + this.deflectionScore} pts`
      : '';
    const victoryText = this.add
      .text(GAME_WIDTH / 2, 180, `Coriolis Effect Active!${bonusSummary}`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '30px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0);
    this.tweens.add({
      targets: victoryText, alpha: 1, duration: 500
    });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Coriolis Effect Active!',
      subtitle: 'Cyclonic rotation established',
      score,
      stars,
      levelId: 'rotation',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_rotation']
    });
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Not Enough Spin!', {
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
      title: 'Not Enough Spin!',
      subtitle: 'Keep spinning to build rotation',
      score: 0,
      stars: 0,
      levelId: 'rotation',
      timeUsed: this.totalTime,
      factsUnlocked: []
    });
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
    if (this.countdownTimer) this.countdownTimer.remove();
    if (this.spinDecayTimer) this.spinDecayTimer.remove();
    if (this.windGustTimer) this.windGustTimer.remove();
    if (this.orbSpawnTimer) this.orbSpawnTimer.remove();
    if (this.deflectionSpawnTimer) this.deflectionSpawnTimer.remove();
    if (this.rainTimer) this.rainTimer.remove();
    this.rainStreakPool.forEach(s => s.destroy());
    this.rainStreakPool = [];
  }
}
