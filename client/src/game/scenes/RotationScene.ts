import Phaser from 'phaser';
import { telemetry } from '../../services/telemetry';
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
  private timeRemaining = 30;
  private totalTime = 30;
  private rotationProgress = 0;
  private isComplete = false;
  private vortexGfx!: Phaser.GameObjects.Graphics;
  private centerX = GAME_WIDTH / 2;
  private centerY = GAME_HEIGHT / 2;
  private pointerPositions: Phaser.Math.Vector2[] = [];
  private lastAngle = 0;
  private totalRotation = 0;
  private isDragging = false;
  private targetRotation = 7200;
  private hemisphere = 'northern';
  private hemiMapGfx!: Phaser.GameObjects.Graphics;
  private hemiArrowGfx!: Phaser.GameObjects.Graphics;
  private hemiNameText!: Phaser.GameObjects.Text;
  private hemiDirText!: Phaser.GameObjects.Text;
  private hemiStormText!: Phaser.GameObjects.Text;
  private hemiArrowAngle = 0;
  // Hemisphere map widget geometry (bottom-left corner)
  private readonly HEMI_CX = 115;
  private readonly HEMI_CY = 605;
  private readonly HEMI_R = 52;
  private readonly HEMI_RING = 68;
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

  // ── SPIN POWER & COMBO ──
  private spinPower = 0;
  private lastMoveTime = 0;
  private combo = 0;
  private comboAccum = 0;
  private lastComboTime = 0;
  private powerMeterGfx!: Phaser.GameObjects.Graphics;
  private powerLabel!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private lastWhooshTime = 0;
  private airMassBonus = 0;
  private quizBonus = 0;

  // ── Rounds (1-3, escalating difficulty) ──
  private currentRound = 1;
  private roundBonus = 0;
  private roundDecayMult = 0.6;
  private roundBanner!: Phaser.GameObjects.Text;

  // ── Storm stages, combo ratings & inflow ──
  private stageText!: Phaser.GameObjects.Text;
  private bottomInfoPanel!: Phaser.GameObjects.Graphics;
  private comboRatingTier = 0;
  private comboBonus = 0;
  private inflowTimer!: Phaser.Time.TimerEvent;
  private inflowSprites: Phaser.GameObjects.Arc[] = [];

  // ── Deflect the Air Mass (33% / 66%) ──
  private airMassStage = 0;
  private airMassActive = false;
  private airMassResolved = false;
  private airMassCharge = 0;
  private airMassDeadline = 0;
  private airMassFromRight = true;
  private airMassTimer!: Phaser.Time.TimerEvent;
  private airMassSprites: Phaser.GameObjects.GameObject[] = [];
  private airMassText!: Phaser.GameObjects.Text;
  private airMassChargeGfx!: Phaser.GameObjects.Graphics;

  // ── Hemisphere Quiz ──
  private quizActive = false;
  private quizResolved = false;
  private quizGesture: 'cw' | 'ccw' = 'cw';
  private quizAccum = 0;
  private quizDeadline = 0;
  private quizCount = 0;
  private quizSpawnTtl = 12;
  private quizTickTimer!: Phaser.Time.TimerEvent;
  private quizTimer?: Phaser.Time.TimerEvent;
  private quizText!: Phaser.GameObjects.Text;
  private quizSubText!: Phaser.GameObjects.Text;

  // ── Timers (stopped until game starts) ──
  private countdownTimer!: Phaser.Time.TimerEvent;
  private spinDecayTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: SCENES.ROTATION });
  }

  create() {
    telemetry.log('level_start', { level: 'rotation' });
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0a0a1a);
    this.isComplete = false;
    this.gameStarted = false;
    this.rotationProgress = 0;
    this.timeRemaining = 30;
    this.totalTime = 30;
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
    this.spinPower = 0;
    this.lastMoveTime = 0;
    this.combo = 0;
    this.comboAccum = 0;
    this.lastComboTime = 0;
    this.airMassStage = 0;
    this.airMassActive = false;
    this.airMassResolved = false;
    this.airMassCharge = 0;
    this.airMassBonus = 0;
    this.quizActive = false;
    this.quizResolved = false;
    this.quizAccum = 0;
    this.quizCount = 0;
    this.quizSpawnTtl = 12;
    this.quizBonus = 0;
    this.currentRound = 1;
    this.roundBonus = 0;
    this.roundDecayMult = 0.6;
    this.comboRatingTier = 0;
    this.comboBonus = 0;
    this.hemisphere = 'northern';

    // ── Background (with slow zoom + drift animation) ──
    const bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'rotation_bg')
      .setDepth(0);
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

    // ── Bottom info panel (behind relocated labels) ──
    this.bottomInfoPanel = this.add.graphics().setDepth(4);
    const panelW = 320;
    const panelH = 110;
    const panelX = GAME_WIDTH / 2 - panelW / 2;
    const panelY = GAME_HEIGHT - 160;
    this.bottomInfoPanel.fillStyle(0x0d1b2a, 0.72);
    this.bottomInfoPanel.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
    this.bottomInfoPanel.lineStyle(2, 0x4a6fa5, 0.45);
    this.bottomInfoPanel.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);

    // ── Hemisphere MAP widget (bottom-left) — replaces the old text-only indicator ──
    this.hemiArrowGfx = this.add.graphics().setDepth(5);
    this.hemiMapGfx = this.add.graphics().setDepth(6);
    this.add
      .text(this.HEMI_CX, this.HEMI_CY - this.HEMI_R + 14, 'N', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '11px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.add
      .text(this.HEMI_CX, this.HEMI_CY + this.HEMI_R - 14, 'S', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '11px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.hemiStormText = this.add
      .text(this.HEMI_CX, this.HEMI_CY - 26, '🌀', { fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(7);
    this.hemiNameText = this.add
      .text(205, this.HEMI_CY - 26, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0, 0.5)
      .setDepth(6);
    this.hemiDirText = this.add
      .text(205, this.HEMI_CY + 14, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '22px',
        color: '#7fd4ff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0, 0.5)
      .setDepth(6);
    this.updateHemisphereText();

    // ── SPIN POWER meter (moved to bottom center) ──
    this.powerMeterGfx = this.add.graphics().setDepth(6);
    this.powerLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 150, 'SPIN ×1', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '13px',
        color: '#9fb8d8',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.comboText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 175, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '15px',
        color: '#FF6B6B',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.roundBanner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 210, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '32px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0);
    this.drawPowerMeter();

    // ── Guidance circles (dynamic — will light up with progress) ──
    this.ringGfx = this.add.graphics().setDepth(1);
    this.drawRings(0);

    // ── Vortex graphics ──
    this.vortexGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // ── Storm stage label (bottom-right) ──
    this.stageText = this.add
      .text(GAME_WIDTH - 24, GAME_HEIGHT - 95, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '15px',
        color: '#6DB3E6',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(1, 0.5)
      .setDepth(6);
    this.updateStormStage();

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
        {
          icon: '🔄',
          text: 'NORTHERN = spin COUNTER-CLOCKWISE ↺ (drag LEFT) · SOUTHERN = spin CLOCKWISE ↻ (drag RIGHT)'
        },
        {
          icon: '🗺️',
          text: 'HEMISPHERE MAP (bottom-left): blue North = ↺ CCW · amber South = ↻ CW'
        },
        {
          icon: '🌪️',
          text: 'Storm grows: Depression → Tropical Storm → Strong Storm → Cyclone'
        },
        {
          icon: '⚡',
          text: 'SPIN POWER: spin fast & steady for up to 2× progress!'
        },
        {
          icon: '🔥',
          text: 'Combo ratings: GOOD → GREAT → PERFECT → SUPER SPIN!'
        },
        {
          icon: '🟤',
          text: 'AIR MASS events — spin to charge & deflect them away!'
        },
        {
          icon: '💨',
          text: 'Wind disturbances — correct the airflow to keep building!'
        },
        {
          icon: '⏱️',
          text: '30 seconds. Reach 20 rotations (7200°) to form the cyclone!'
        }
      ]
    } satisfies HUDLevelIntroPayload);

    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Rotation',
      description:
        'Spin the correct direction (CCW North / CW South). Chase the right airflow, deflect air masses, ride out wind disturbances, and build a full-blown cyclone in 30 seconds!'
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

        // ⏱️ Urgent warnings at 20s / 15s / 10s / 5s
        if (
          this.timeRemaining === 20 ||
          this.timeRemaining === 15 ||
          this.timeRemaining === 10 ||
          this.timeRemaining === 5
        ) {
          this.showTimeWarning(this.timeRemaining);
        }

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true
    });

    // ── Auto spin-down (faster decay + headwind penalty) ──
    this.spinDecayTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isComplete || !this.gameStarted) return;
        // SPIN POWER drains — fast when idle, slow while spinning
        if (!this.isDragging) {
          this.spinPower = Math.max(0, this.spinPower - 0.05);
          // Combo resets when you stop spinning
          if (this.combo > 0 && this.time.now - this.lastComboTime > 2000) {
            this.combo = 0;
            this.comboAccum = 0;
            this.comboRatingTier = 0;
            this.updateComboText();
          }
        } else {
          this.spinPower = Math.max(0, this.spinPower - 0.012);
        }
        this.drawPowerMeter();
        if (this.isDragging) return;

        // Decay scales with progress AND round — harder to maintain each round
        const progressDecay = this.rotationProgress * 8;
        let decay = (4 + progressDecay) * this.roundDecayMult;
        if (this.headwindActive) decay += 10;
        if (this.totalRotation > 0) {
          this.totalRotation = Math.max(0, this.totalRotation - decay);
          this.updateUI();
        }
      },
      loop: true
    });

    // ── Wind Gust spawn (round-based frequency — faster as rounds advance) ──
    this.rescheduleHeadwinds();

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

    // ── Hemisphere Quiz scheduler ──
    this.quizSpawnTtl = 12;
    this.quizTickTimer = this.time.addEvent({
      delay: 1000,
      callback: () => this.quizTick(),
      loop: true
    });

    // ── Rain effect spawn (only active when storm is active) ──
    this.rainTimer = this.time.addEvent({
      delay: 80,
      callback: () => this.spawnRainStreak(),
      loop: true
    });

    // ── Air inflow particles spiral into the low-pressure center ──
    this.inflowTimer = this.time.addEvent({
      delay: 130,
      callback: () => this.spawnInflowParticle(),
      loop: true
    });
  };

  // ═══════════════════════════════════════════════
  //  FEATURE 1: Wind Gust (Headwind)
  // ═══════════════════════════════════════════════

  private spawnWindGust() {
    if (this.isComplete || !this.gameStarted) return;
    this.headwindActive = true;
    this.playHeadwindWhoosh();

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
      endX,
      gustY,
      endX - (fromLeft ? -20 : 20),
      gustY - 8,
      endX - (fromLeft ? -20 : 20),
      gustY + 8
    );

    // Show warning text — random disturbance variety
    const gustLabels = ['💨 HEADWIND!', '🌬️ WIND SHEAR!', '💨 GUST!'];
    this.headwindText.setText(
      gustLabels[Math.floor(Math.random() * gustLabels.length)]
    );
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
      this.playMilestoneBoom();

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
    this.playThunder();
    // ── Main bolt ──
    const boltGfx = this.add.graphics().setDepth(7);
    const boltX = this.centerX + Phaser.Math.Between(-200, 200);
    this.drawLightningBolt(
      boltX,
      0,
      this.centerX + Phaser.Math.Between(-40, 40),
      this.centerY,
      boltGfx,
      0xffffff,
      3
    );

    // ── Branch bolts ──
    const branches = Phaser.Math.Between(1, 3);
    for (let i = 0; i < branches; i++) {
      const branchGfx = this.add.graphics().setDepth(7);
      const splitY = Phaser.Math.Between(100, 250);
      const bx = boltX + Phaser.Math.Between(-30, 30);
      const bx2 =
        bx +
        (Math.random() > 0.5
          ? Phaser.Math.Between(30, 100)
          : Phaser.Math.Between(-100, -30));
      this.drawLightningBolt(
        bx,
        splitY,
        bx2,
        splitY + Phaser.Math.Between(80, 180),
        branchGfx,
        0xccccff,
        1.5
      );
      // Fade branch
      this.tweens.add({
        targets: branchGfx,
        alpha: 0,
        delay: 0.1,
        duration: 300,
        onComplete: () => branchGfx.destroy()
      });
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
    x1: number,
    y1: number,
    x2: number,
    y2: number,
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
    points.forEach((p, i) =>
      i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y)
    );
    gfx.strokePath();

    // Mid glow
    gfx.lineStyle(lineWidth * 1.8, 0xeeeeff, 0.5);
    gfx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y)
    );
    gfx.strokePath();

    // Core bolt (brightest)
    gfx.lineStyle(lineWidth, color, 1);
    gfx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y)
    );
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
      const lightningChance =
        intensity * (this.rotationProgress >= 0.8 ? 0.04 : 0.015);
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
    if (
      this.rotationProgress >= 0.6 &&
      intensity > 0.4 &&
      Math.random() < 0.03
    ) {
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
    const targetAngle =
      spawnAngle + deflectionDir * Phaser.Math.FloatBetween(0.3, 0.8);
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
        this.playCatchChime();

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
    if (
      this.isComplete ||
      !this.gameStarted ||
      this.collectibleOrbs.length >= 5
    )
      return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(50, 110);
    const x = this.centerX + Math.cos(angle) * radius;
    const y = this.centerY + Math.sin(angle) * radius;
    const value = Phaser.Math.Between(50, 120);

    const glow = this.add.circle(x, y, 16, 0xffd166, 0.15).setDepth(3);

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
        px,
        py,
        orb.sprite.x,
        orb.sprite.y
      );
      if (dist < 40) {
        orb.collected = true;
        this.orbBonusScore += orb.value;
        this.playCollectChime();

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

    const streak = this.add
      .rectangle(x, -len, 1.5, len, 0x88bbee, alpha)
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

  // ── Air inflow: spirals inward into the low-pressure center ──
  private spawnInflowParticle() {
    if (this.isComplete || !this.gameStarted) return;
    const startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const startRadius = Phaser.Math.Between(400, 620);
    const duration = Phaser.Math.Between(1800, 3000);
    const curlTurns = Phaser.Math.FloatBetween(1.2, 2.2);
    // Real physics: air spirals CCW in the Northern, CW in the Southern
    const dirSign = this.hemisphere === 'northern' ? -1 : 1;
    const start = this.time.now;
    const color = Phaser.Math.Between(0, 2) === 0 ? 0x88ddff : 0xaee6ff;

    const p = this.add
      .circle(
        this.centerX + Math.cos(startAngle) * startRadius,
        this.centerY + Math.sin(startAngle) * startRadius,
        2.5,
        color,
        0.6
      )
      .setDepth(DEPTH.PARTICLES);
    this.inflowSprites.push(p);

    this.tweens.add({
      targets: p,
      alpha: 0,
      duration,
      onUpdate: () => {
        if (!p.active) return;
        const t = Phaser.Math.Clamp((this.time.now - start) / duration, 0, 1);
        const radius = startRadius * Math.pow(1 - t, 0.75);
        const angle = startAngle + t * curlTurns * Math.PI * 2 * dirSign;
        p.x = this.centerX + Math.cos(angle) * radius;
        p.y = this.centerY + Math.sin(angle) * radius;
      },
      onComplete: () => p.destroy()
    });

    this.time.delayedCall(duration + 50, () => {
      const idx = this.inflowSprites.indexOf(p);
      if (idx >= 0) this.inflowSprites.splice(idx, 1);
    });

    if (this.inflowSprites.length > 90) {
      const old = this.inflowSprites.shift();
      if (old && old.active) old.destroy();
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
    const core = this.add.circle(x, y, size * 0.4, 0xffffff, 0.8).setDepth(3);

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
      { radius: 100, unlockAt: 0.5 },
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
      const spark = this.add.circle(x, y, size, 0xff4444, 0.8).setDepth(5);
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
  //  FEATURE 5: SPIN POWER Meter & Combo
  // ═══════════════════════════════════════════════

  private drawPowerMeter() {
    if (!this.powerMeterGfx) return;
    this.powerMeterGfx.clear();
    const x = GAME_WIDTH / 2 - 120;
    const y = GAME_HEIGHT - 130;
    const w = 240;
    const h = 10;

    // Track
    this.powerMeterGfx.fillStyle(0x000000, 0.5);
    this.powerMeterGfx.fillRoundedRect(x, y, w, h, 5);
    this.powerMeterGfx.lineStyle(1, 0x4a6fa5, 0.6);
    this.powerMeterGfx.strokeRoundedRect(x, y, w, h, 5);

    // Fill
    const fillW = Math.max(0, (w - 4) * this.spinPower);
    const fillColor =
      this.spinPower > 0.66
        ? 0xffd166
        : this.spinPower > 0.33
          ? 0x88ddff
          : 0x6db3e6;
    if (fillW > 0) {
      this.powerMeterGfx.fillStyle(fillColor, 0.9);
      this.powerMeterGfx.fillRoundedRect(x + 2, y + 2, fillW, h - 4, 3);
      // Glow at full power
      if (this.spinPower >= 0.99) {
        this.powerMeterGfx.fillStyle(0xffd166, 0.25);
        this.powerMeterGfx.fillRoundedRect(x, y, w, h, 5);
      }
    }

    if (this.powerLabel) {
      const mult = (1 + this.spinPower).toFixed(1);
      this.powerLabel.setText(`SPIN ×${mult} · ROUND ${this.currentRound}/3`);
      this.powerLabel.setColor(
        this.spinPower > 0.66
          ? '#FFD166'
          : this.spinPower > 0.33
            ? '#88ddff'
            : '#9fb8d8'
      );
    }
  }

  private updateComboText() {
    if (!this.comboText) return;
    if (this.combo >= 2) {
      const label =
        this.combo >= 5
          ? `🔥 ${this.combo} x COMBO!`
          : `🔥 Combo x${this.combo}`;
      this.comboText.setText(label);
      this.comboText.setAlpha(1);
      this.comboText.setScale(1 + Math.min(0.3, this.combo * 0.03));
      this.comboText.setColor(this.combo >= 8 ? '#FF6B6B' : '#FFD166');
    } else {
      this.comboText.setText('');
      this.comboText.setAlpha(0);
    }
  }

  // ── Combo ratings: GOOD → GREAT → PERFECT → SUPER SPIN ──
  private getComboRating(): number {
    if (this.combo >= 8) return 4;
    if (this.combo >= 6) return 3;
    if (this.combo >= 4) return 2;
    if (this.combo >= 2) return 1;
    return 0;
  }

  private evalComboRating() {
    const rating = this.getComboRating();
    if (rating > this.comboRatingTier) {
      this.comboRatingTier = rating;
      this.popComboRating(rating);
    }
  }

  private popComboRating(rating: number) {
    const RATINGS = [
      { name: 'GOOD', color: '#8bd450', bonus: 10, fontSize: 26 },
      { name: 'GREAT', color: '#ffd166', bonus: 20, fontSize: 30 },
      { name: 'PERFECT', color: '#ff9f43', bonus: 30, fontSize: 34 },
      { name: 'SUPER SPIN!', color: '#ff6b6b', bonus: 50, fontSize: 38 }
    ];
    const r = RATINGS[rating - 1];
    if (!r) return;
    this.comboBonus += r.bonus;
    this.playRatingSound(rating);
    const pop = this.add
      .text(this.centerX, this.centerY + 40, `${r.name} +${r.bonus}`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: `${r.fontSize}px`,
        color: r.color,
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(12);
    this.tweens.add({
      targets: pop,
      y: pop.y - 70,
      alpha: 0,
      scale: pop.scale * 1.4,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => pop.destroy()
    });
  }

  // ── Hemisphere MAP widget (flips with each round) ──
  private updateHemisphereText() {
    if (!this.hemiDirText || !this.hemiMapGfx) return;
    const northern = this.hemisphere === 'northern';
    const color = northern ? '#7fd4ff' : '#ffd166';

    this.hemiNameText.setText(
      northern ? 'NORTHERN HEMISPHERE' : 'SOUTHERN HEMISPHERE'
    );
    this.hemiNameText.setColor(color);
    // Spell out the full direction + a finger hint so CW vs CCW is unambiguous:
    // Northern = counter-clockwise (drag LEFT) · Southern = clockwise (drag RIGHT)
    this.hemiDirText.setText(
      northern
        ? '↺ COUNTER-CLOCKWISE  (drag LEFT)'
        : '↻ CLOCKWISE  (drag RIGHT)'
    );
    this.hemiDirText.setColor(color);
    this.hemiStormText.setPosition(
      this.HEMI_CX,
      this.HEMI_CY + (northern ? -26 : 26)
    );

    this.drawHemisphereMap();
    this.drawHemiArrows();

    // Pop so the flip is impossible to miss
    this.tweens.add({
      targets: [this.hemiDirText, this.hemiNameText],
      scale: { from: 1, to: 1.22 },
      yoyo: true,
      duration: 150,
      ease: 'Quad.easeOut'
    });
  }

  /** Draw the mini world map: active hemisphere highlighted, the other dimmed. */
  private drawHemisphereMap() {
    const g = this.hemiMapGfx;
    if (!g) return;
    const northern = this.hemisphere === 'northern';
    const cx = this.HEMI_CX,
      cy = this.HEMI_CY,
      r = this.HEMI_R;
    g.clear();

    // Ocean base + abstract landmasses
    g.fillStyle(0x0d2b4e, 0.92);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0x3f7a4a, 0.9);
    g.fillEllipse(cx - 16, cy - 25, 34, 20);
    g.fillEllipse(cx + 17, cy - 14, 20, 13);
    g.fillEllipse(cx + 12, cy + 23, 28, 17);
    g.fillEllipse(cx - 17, cy + 27, 15, 11);

    // Top half is π→2π (y-down screen coords); bottom half is 0→π
    const active = northern ? [Math.PI, Math.PI * 2] : [0, Math.PI];
    const inactive = northern ? [0, Math.PI] : [Math.PI, Math.PI * 2];

    g.fillStyle(northern ? 0x7fd4ff : 0xffd166, 0.32);
    g.slice(cx, cy, r, active[0], active[1], false);
    g.fillPath();
    g.fillStyle(0x000000, 0.38);
    g.slice(cx, cy, r, inactive[0], inactive[1], false);
    g.fillPath();

    // Equator + colored rim
    g.lineStyle(2, 0xffffff, 0.75);
    g.lineBetween(cx - r, cy, cx + r, cy);
    g.lineStyle(3, northern ? 0x7fd4ff : 0xffd166, 0.95);
    g.strokeCircle(cx, cy, r);
  }

  /** Arrow ring around the map — spins in the required direction (CCW or CW). */
  private drawHemiArrows() {
    const g = this.hemiArrowGfx;
    if (!g) return;
    const northern = this.hemisphere === 'northern';
    const cx = this.HEMI_CX,
      cy = this.HEMI_CY,
      R = this.HEMI_RING;
    const color = northern ? 0x7fd4ff : 0xffd166;
    const dirSign = northern ? -1 : 1; // -1 = angle decreases = CCW on screen
    g.clear();

    for (let i = 0; i < 3; i++) {
      const base = this.hemiArrowAngle + i * 120;
      const end = base + 46 * dirSign;
      g.lineStyle(4, color, 0.9);
      g.beginPath();
      g.arc(
        cx,
        cy,
        R,
        Phaser.Math.DegToRad(Math.min(base, end)),
        Phaser.Math.DegToRad(Math.max(base, end)),
        false
      );
      g.strokePath();

      // Arrowhead at the leading end, pointing along the spin direction
      const tipA = Phaser.Math.DegToRad(end);
      const tipX = cx + Math.cos(tipA) * R;
      const tipY = cy + Math.sin(tipA) * R;
      const tx = -Math.sin(tipA) * dirSign;
      const ty = Math.cos(tipA) * dirSign;
      const bx = tipX - tx * 5,
        by = tipY - ty * 5;
      const px = -ty,
        py = tx;
      g.fillStyle(color, 0.95);
      g.fillTriangle(
        tipX + tx * 11,
        tipY + ty * 11,
        bx + px * 7,
        by + py * 7,
        bx - px * 7,
        by - py * 7
      );
    }
  }

  /** Animate the arrow ring so the spin direction is always moving on screen. */
  update(_time: number, delta: number) {
    if (!this.hemiArrowGfx) return;
    const dirSign = this.hemisphere === 'northern' ? -1 : 1;
    this.hemiArrowAngle = (this.hemiArrowAngle + dirSign * delta * 0.09) % 360;
    this.drawHemiArrows();
  }

  // ── Storm stage label (Depression → Cyclone) tracks progress ──
  private updateStormStage() {
    if (!this.stageText) return;
    const p = this.rotationProgress;
    let label: string;
    let color: string;
    if (p >= 0.75) {
      label = '🌪️ Cyclone';
      color = '#FF6B6B';
    } else if (p >= 0.5) {
      label = '🌩️ Strong Storm';
      color = '#FFD166';
    } else if (p >= 0.25) {
      label = '🌦️ Tropical Storm';
      color = '#88ddff';
    } else {
      label = '🌫️ Depression';
      color = '#6DB3E6';
    }
    this.stageText.setText(label);
    this.stageText.setColor(color);
  }

  // ── ⏱️ Final-10-seconds urgency popup ──
  private showTimeWarning(seconds: number) {
    const warn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, `⏰ ${seconds}s left!`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '34px',
        color: '#FF6B6B',
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(13)
      .setAlpha(0);
    this.tweens.add({
      targets: warn,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.05 },
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: warn,
          alpha: 0,
          delay: 550,
          duration: 300,
          onComplete: () => warn.destroy()
        });
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 6: Deflect the Air Mass (33% / 66%)
  // ═══════════════════════════════════════════════

  private startAirMassEvent() {
    if (this.isComplete || this.quizActive || this.airMassActive) return;
    this.airMassStage++;
    this.airMassActive = true;
    this.airMassResolved = false;
    this.airMassCharge = 0;
    this.airMassFromRight = Math.random() > 0.5;
    this.airMassDeadline = this.time.now + 8000;

    const fromX = this.airMassFromRight ? GAME_WIDTH + 60 : -60;
    const targetX = this.airMassFromRight
      ? this.centerX + 170
      : this.centerX - 170;
    const y = this.centerY + Phaser.Math.Between(-40, 40);

    const blob = this.add.circle(fromX, y, 34, 0x6b3a1a, 0.92).setDepth(4);
    const glow = this.add.circle(fromX, y, 48, 0xff6b4a, 0.15).setDepth(3);
    const core = this.add.circle(fromX, y, 18, 0x3a2010, 1).setDepth(5);
    const frown = this.add
      .text(fromX, y - 8, '😠', {
        fontFamily: FONTS.BODY,
        fontSize: '20px'
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.airMassSprites = [blob, glow, core, frown];

    this.tweens.add({
      targets: this.airMassSprites,
      x: targetX,
      duration: 1100,
      ease: 'Sine.easeIn'
    });

    this.airMassText = this.add
      .text(GAME_WIDTH / 2, this.centerY - 120, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '17px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setAlpha(0);
    this.tweens.add({ targets: this.airMassText, alpha: 1, duration: 300 });

    this.airMassChargeGfx = this.add.graphics().setDepth(8);

    this.airMassTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.airMassResolved || this.isComplete) return;
        if (this.time.now > this.airMassDeadline) this.airMassFail();
      }
    });

    this.playMilestoneBoom();
    this.cameras.main.shake(120, 0.004);
  }

  private drawAirMassCharge() {
    if (!this.airMassChargeGfx) return;
    this.airMassChargeGfx.clear();
    const w = 160;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = this.centerY + 90;
    this.airMassChargeGfx.fillStyle(0x000000, 0.55);
    this.airMassChargeGfx.fillRoundedRect(x, y, w, 12, 6);
    this.airMassChargeGfx.fillStyle(
      this.airMassCharge >= 1 ? 0x06d6a0 : 0xffd166,
      0.9
    );
    this.airMassChargeGfx.fillRoundedRect(
      x + 2,
      y + 2,
      Math.max(0, (w - 4) * this.airMassCharge),
      8,
      4
    );
    this.airMassText.setText(
      `🟤 AIR MASS! Spin to charge the deflector  ${Math.round(
        this.airMassCharge * 100
      )}%`
    );
  }

  private airMassSuccess() {
    if (this.airMassResolved) return;
    this.airMassResolved = true;
    this.airMassActive = false;
    if (this.airMassTimer) this.airMassTimer.remove();

    const dirLabel = this.hemisphere === 'northern' ? '→ Right' : '← Left';
    const dirSign = this.hemisphere === 'northern' ? 1 : -1;
    const bonus = this.airMassStage >= 2 ? 500 : 300;
    this.airMassBonus += bonus;

    // Fling it away in the deflection direction
    this.tweens.add({
      targets: this.airMassSprites,
      x: this.centerX + dirSign * 520,
      scale: { from: 1, to: 0.2 },
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => this.airMassSprites.forEach(s => s.destroy())
    });

    const pop = this.add
      .text(
        this.centerX,
        this.centerY - 60,
        `Deflected ${dirLabel} ✅ +${bonus}`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '22px',
          color: '#06D6A0',
          stroke: '#000000',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y - 40,
      duration: 1600,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });

    this.playDeflectWhoosh();
    this.playCatchChime();
    this.cameras.main.shake(250, 0.005);
    this.updateUI();
    this.cleanupAirMass();
  }

  private airMassFail() {
    if (this.airMassResolved) return;
    this.airMassResolved = true;
    this.airMassActive = false;
    if (this.airMassTimer) this.airMassTimer.remove();

    // Air mass slams into the vortex
    this.tweens.add({
      targets: this.airMassSprites,
      x: this.centerX,
      y: this.centerY,
      scale: { from: 1, to: 0.4 },
      duration: 400,
      ease: 'Quad.easeIn'
    });

    const penaltyDeg = this.targetRotation * 0.08;
    this.totalRotation = Math.max(0, this.totalRotation - penaltyDeg);

    const pop = this.add
      .text(
        this.centerX,
        this.centerY - 60,
        `💥 Air mass hit! -${Math.round(penaltyDeg)}°`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '20px',
          color: '#FF6B6B',
          stroke: '#000000',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y + 20,
      duration: 1400,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });

    this.playFailBuzz();
    this.cameras.main.flash(250, 255, 60, 60);
    this.cameras.main.shake(300, 0.007);
    this.updateUI();
    this.cleanupAirMass();
  }

  private cleanupAirMass() {
    this.time.delayedCall(700, () => {
      this.airMassSprites.forEach(s => s.destroy());
      this.airMassSprites = [];
      if (this.airMassText) this.airMassText.destroy();
      if (this.airMassChargeGfx) this.airMassChargeGfx.destroy();
    });
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 7: Hemisphere Quizzes
  // ═══════════════════════════════════════════════

  private quizTick() {
    if (this.isComplete || this.quizActive || this.airMassActive) return;
    if (this.rotationProgress < 0.2) return;
    if (this.quizCount >= 2) return;
    this.quizSpawnTtl--;
    if (this.quizSpawnTtl <= 0) {
      this.quizSpawnTtl = 12;
      this.startQuiz();
    }
  }

  private startQuiz() {
    this.quizActive = true;
    this.quizResolved = false;
    this.quizAccum = 0;
    this.quizDeadline = this.time.now + 6000;
    this.quizCount++;

    const askNorthern = Math.random() > 0.5;
    this.quizGesture = askNorthern ? 'cw' : 'ccw';

    this.quizText = this.add
      .text(GAME_WIDTH / 2, this.centerY - 160, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '22px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setAlpha(0);
    this.quizSubText = this.add
      .text(GAME_WIDTH / 2, this.centerY - 130, '', {
        fontFamily: FONTS.BODY,
        fontSize: '16px',
        color: '#6DB3E6',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setAlpha(0);
    this.tweens.add({
      targets: [this.quizText, this.quizSubText],
      alpha: 1,
      duration: 300
    });

    this.updateQuizText();

    this.quizTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.quizResolved || this.isComplete) return;
        if (this.time.now > this.quizDeadline) this.resolveQuiz(false);
      }
    });
  }

  private updateQuizText() {
    if (!this.quizText) return;
    const asked = this.quizGesture === 'cw' ? 'NORTHERN' : 'SOUTHERN';
    this.quizText.setText(
      `🌍 ${asked} hemisphere: which way does wind deflect?`
    );
    this.quizSubText?.setText(
      'Clockwise (CW) = spin RIGHT ➡   ·   Counter-clockwise (CCW) = spin LEFT ⬅'
    );
  }

  private resolveQuiz(correct: boolean) {
    if (this.quizResolved) return;
    this.quizResolved = true;
    this.quizActive = false;
    if (this.quizTimer) this.quizTimer.remove();

    const askedNorthern = this.quizGesture === 'cw';
    const correctAnswer = askedNorthern ? 'RIGHT' : 'LEFT';

    if (correct) {
      this.quizBonus += 150;
      this.playCatchChime();
      this.popQuizResult(
        `✅ Correct! Wind deflects ${correctAnswer}  +150`,
        '#06D6A0'
      );
    } else {
      this.totalRotation = Math.max(
        0,
        this.totalRotation - this.targetRotation * 0.01
      );
      this.playFailBuzz();
      this.popQuizResult(
        `❌ Wind deflects ${correctAnswer} in the ${askedNorthern ? 'North' : 'South'}`,
        '#FF6B6B'
      );
    }
    this.updateUI();
    this.cleanupQuiz();
  }

  private popQuizResult(msg: string, color: string) {
    const pop = this.add
      .text(GAME_WIDTH / 2, this.centerY - 60, msg, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '20px',
        color,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y - 40,
      duration: 1800,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });
  }

  private cleanupQuiz() {
    this.time.delayedCall(1600, () => {
      if (this.quizText) this.quizText.destroy();
      if (this.quizSubText) this.quizSubText.destroy();
    });
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 9: Rounds (escalating difficulty)
  // ═══════════════════════════════════════════════

  private updateRound() {
    const newRound =
      this.rotationProgress >= 0.66 ? 3 : this.rotationProgress >= 0.33 ? 2 : 1;
    if (newRound === this.currentRound) return;
    this.currentRound = newRound;
    this.roundDecayMult = newRound === 1 ? 0.6 : newRound === 2 ? 1.0 : 1.4;
    // Hemisphere Challenge: N → S → N (real Coriolis — spin CCW North, CW South)
    this.hemisphere = newRound === 2 ? 'southern' : 'northern';
    this.updateHemisphereText();
    this.roundBonus += 250;
    this.showRoundBanner(newRound);
    this.playRoundChime();
    this.rescheduleHeadwinds();
    this.updateUI();
  }

  private showRoundBanner(round: number) {
    const titles = [
      'Build the Rotation!',
      'Deflect the Air Mass!',
      'Weather the Storm!'
    ];
    const colors = ['#6DB3E6', '#FFD166', '#FF6B6B'];
    const hemi =
      round === 2
        ? '🌍 SOUTHERN — SPIN CLOCKWISE ↻'
        : '🌎 NORTHERN — SPIN COUNTER-CLOCKWISE ↺';
    this.roundBanner.setText(`${titles[round - 1]}\n${hemi}`);
    this.roundBanner.setColor(colors[round - 1]);
    this.roundBanner.setAlpha(0);
    this.roundBanner.setScale(0.6);
    this.tweens.add({
      targets: this.roundBanner,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.05 },
      duration: 450,
      ease: 'Back.easeOut'
    });
    this.tweens.add({
      targets: this.roundBanner,
      alpha: 0,
      delay: 2200,
      duration: 700,
      onComplete: () => this.roundBanner.setAlpha(0)
    });

    const pop = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160, '+250 Round bonus!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '18px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0);
    this.tweens.add({
      targets: pop,
      alpha: { from: 1, to: 0 },
      y: pop.y - 30,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy()
    });
  }

  /** Recreate the headwind timer with a round-appropriate frequency */
  private rescheduleHeadwinds() {
    if (this.windGustTimer) this.windGustTimer.remove();
    const [min, max] =
      this.currentRound === 1
        ? [4500, 6500]
        : this.currentRound === 2
          ? [3000, 4500]
          : [2000, 3200];
    this.windGustTimer = this.time.addEvent({
      delay: Phaser.Math.Between(min, max),
      callback: () => this.spawnWindGust(),
      loop: true
    });
  }

  private playRoundChime() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 523, 0.15, 'triangle', 0.14);
    this.tone(ctx, 659, 0.15, 'triangle', 0.14, 0.12);
    this.tone(ctx, 784, 0.25, 'triangle', 0.14, 0.24);
  }

  // ═══════════════════════════════════════════════
  //  FEATURE 8: Procedural Sound Effects (WebAudio)
  // ═══════════════════════════════════════════════

  private getAudioCtx(): AudioContext | null {
    const sm = this.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = sm.context ?? null;
    if (!ctx || ctx.state === 'closed') return null;
    return ctx;
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0
  ) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + delay;
      osc.start(t);
      osc.stop(t + dur);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* already gone */
        }
      };
    } catch {
      /* audio unavailable */
    }
  }

  private playSpinWhoosh(speed: number) {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    // Pitch rises with spin speed: ~140Hz → ~520Hz
    const freq = 140 + speed * 380;
    this.tone(ctx, freq, 0.09, 'triangle', 0.03 + speed * 0.03);
    this.tone(ctx, freq * 2, 0.05, 'sine', 0.015 + speed * 0.02);
  }

  private playComboChime() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 660 + this.combo * 30, 0.12, 'triangle', 0.12);
  }

  private playRatingSound(rating: number) {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    const base = [660, 784, 880, 1047][rating - 1] ?? 660;
    this.tone(ctx, base, 0.14, 'triangle', 0.14);
    if (rating >= 3) this.tone(ctx, base * 1.25, 0.16, 'triangle', 0.12, 0.06);
    if (rating >= 4) {
      this.tone(ctx, base * 1.5, 0.2, 'square', 0.08, 0.12);
      this.tone(ctx, base * 2, 0.2, 'triangle', 0.1, 0.14);
    }
  }

  private playCollectChime() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 880, 0.12, 'sine', 0.14);
    this.tone(ctx, 1320, 0.15, 'sine', 0.1, 0.06);
  }

  private playCatchChime() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 660, 0.1, 'triangle', 0.14);
    this.tone(ctx, 990, 0.16, 'triangle', 0.12, 0.07);
  }

  private playHeadwindWhoosh() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    for (let i = 0; i < 5; i++) {
      this.tone(ctx, 520 - i * 90, 0.12, 'sawtooth', 0.03, i * 0.06);
    }
  }

  private playMilestoneBoom() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 90, 0.4, 'sine', 0.22);
    this.tone(ctx, 60, 0.5, 'triangle', 0.18, 0.05);
  }

  private playThunder() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 120, 0.3, 'sawtooth', 0.12);
    this.tone(ctx, 70, 0.5, 'sine', 0.16, 0.08);
    this.tone(ctx, 50, 0.6, 'triangle', 0.1, 0.18);
  }

  private playDeflectWhoosh() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    for (let i = 0; i < 6; i++) {
      this.tone(ctx, 200 + i * 120, 0.08, 'triangle', 0.06, i * 0.04);
    }
  }

  private playFailBuzz() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 160, 0.25, 'sawtooth', 0.14);
    this.tone(ctx, 110, 0.3, 'square', 0.12, 0.08);
  }

  private playFanfare() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) =>
      this.tone(ctx, n, 0.28, 'triangle', 0.16, i * 0.13)
    );
  }

  private playFailJingle() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 392, 0.25, 'triangle', 0.14);
    this.tone(ctx, 311, 0.25, 'triangle', 0.14, 0.16);
    this.tone(ctx, 262, 0.4, 'triangle', 0.14, 0.32);
  }

  /** Stop any in-progress event when the level ends */
  private cleanupActiveEvents() {
    if (this.airMassTimer) this.airMassTimer.remove();
    if (this.quizTimer) this.quizTimer.remove();
    this.airMassActive = false;
    this.airMassResolved = true;
    this.quizActive = false;
    this.quizResolved = true;
  }

  // ═══════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════

  private didWin = false;

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    GameManager.handleContinue(this, 'rotation', this.didWin);
  };

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'counter-clockwise ↺' : 'clockwise ↻'} — Round ${this.currentRound}/3`,
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
    // Spin anywhere on screen — just not dead-center (angle gets unstable there)
    if (dist >= 15) {
      this.isDragging = true;
      this.lastMoveTime = this.time.now;
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

    // Wrong direction = LOSES progress + red sparks (suspended during quizzes)
    // Real physics: Northern Hemisphere spins COUNTER-CLOCKWISE, Southern CLOCKWISE.
    // (Visual screen CCW = delta < 0, CW = delta > 0.)
    const isWrongDir =
      (this.hemisphere === 'northern' && delta > 0) ||
      (this.hemisphere === 'southern' && delta < 0);
    if (isWrongDir && Math.abs(delta) > 0.1 && !this.quizActive) {
      this.spawnWrongDirectionSparks(pointer.x, pointer.y);
    }

    const deltaDeg = Phaser.Math.RadToDeg(Math.abs(delta));

    // ── SPIN POWER: fills with FAST sustained spinning ──
    const now = this.time.now;
    let dtMs = now - this.lastMoveTime;
    this.lastMoveTime = now;
    if (dtMs < 1 || dtMs > 100) dtMs = 100;
    const degPerSec = (deltaDeg / dtMs) * 1000;
    if (!isWrongDir) {
      // Slow mosey doesn't build power — you must actually spin fast
      if (degPerSec > 60) {
        const speedNorm = Math.min(1, degPerSec / 540); // maxes out at ~540°/s
        this.spinPower = Math.min(1, this.spinPower + speedNorm * 0.012);
      }
      // ── Combo: every 90° of steady correct spin ──
      this.comboAccum += deltaDeg;
      while (this.comboAccum >= 90) {
        this.comboAccum -= 90;
        this.combo++;
        this.lastComboTime = this.time.now;
        if (this.combo >= 2) this.playComboChime();
        this.evalComboRating();
      }
      this.lastComboTime = this.time.now;
      this.updateComboText();
    } else if (Math.abs(delta) > 0.1) {
      // Wrong direction resets combo & drains power
      this.combo = 0;
      this.comboAccum = 0;
      this.comboRatingTier = 0;
      this.updateComboText();
      this.spinPower = Math.max(0, this.spinPower - 0.15);
    }
    this.drawPowerMeter();

    // ── Spin whoosh — pitches up with spin speed ──
    if (deltaDeg > 2 && this.time.now - this.lastWhooshTime > 120) {
      this.playSpinWhoosh(Math.min(1, deltaDeg / 12));
      this.lastWhooshTime = this.time.now;
    }

    // ── Progress gain — multiplied by SPIN POWER (up to 2×) ──
    const powerMult = 1 + this.spinPower;
    const gainMultiplier = (this.headwindActive ? 0.5 : 1) * powerMult;
    if (this.quizActive) {
      // Quiz mode: no rotation gain/loss while answering
    } else if (!isWrongDir) {
      this.totalRotation += deltaDeg * gainMultiplier;
    } else {
      this.totalRotation -= deltaDeg * 0.5;
    }
    this.totalRotation = Math.max(0, this.totalRotation);
    this.lastAngle = currentAngle;

    // ── Hemisphere Quiz: spin the gesture to answer (CW = Right, CCW = Left) ──
    if (this.quizActive && Math.abs(delta) > 0.02) {
      const gestureCw = delta > 0;
      const answersGesture = this.quizGesture === 'cw' ? gestureCw : !gestureCw;
      if (answersGesture) {
        this.quizAccum += deltaDeg;
        if (this.quizAccum >= 180) this.resolveQuiz(true);
      }
    }

    // ── Air Mass: charge the deflector with correct-direction spin ──
    if (this.airMassActive && !this.airMassResolved) {
      if (!isWrongDir && deltaDeg > 0.5) {
        this.airMassCharge = Math.min(1, this.airMassCharge + deltaDeg * 0.022);
      } else if (Math.abs(delta) > 0.05) {
        this.airMassCharge = Math.max(0, this.airMassCharge - deltaDeg * 0.012);
      }
      this.drawAirMassCharge();
      if (this.airMassCharge >= 1) this.airMassSuccess();
    }

    this.updateUI();
    this.updateVortex();
    this.spawnVortexParticle(pointer.x, pointer.y);
    this.spawnSpinTrail(
      pointer.x,
      pointer.y,
      Math.abs(delta) > 0.05 ? Math.abs(delta) : 0
    );

    this.rotationProgress = Math.min(
      1,
      this.totalRotation / this.targetRotation
    );

    // ── Storm stage label (Depression → Cyclone) tracks progress ──
    this.updateStormStage();

    // ── Round transitions (1 → 2 → 3) escalate difficulty ──
    this.updateRound();

    // ── Trigger Deflect-the-Air-Mass events at 33% / 66% ──
    if (!this.airMassActive && !this.isComplete && !this.quizActive) {
      if (this.rotationProgress >= 0.66 && this.airMassStage < 2) {
        this.startAirMassEvent();
      } else if (this.rotationProgress >= 0.33 && this.airMassStage < 1) {
        this.startAirMassEvent();
      }
    }

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
    const totalBonus =
      this.orbBonusScore +
      this.deflectionScore +
      this.airMassBonus +
      this.quizBonus +
      this.roundBonus +
      this.comboBonus;
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Spin ${this.hemisphere === 'northern' ? 'counter-clockwise ↺' : 'clockwise ↻'} — Round ${this.currentRound}/3`,
      progress: Math.round(this.totalRotation),
      target: this.targetRotation
    } satisfies HUDObjectivePayload);
    this.game.events.emit(GAME_EVENTS.HUD_SCORE, {
      score:
        Math.round((this.totalRotation / this.targetRotation) * 2500) +
        totalBonus,
      label: 'Spin'
    } satisfies HUDScorePayload);
  }

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    this.cleanupActiveEvents();

    const timeBonus = Math.round((this.timeRemaining / this.totalTime) * 400);
    const score =
      2500 +
      timeBonus +
      this.orbBonusScore +
      this.deflectionScore +
      this.airMassBonus +
      this.quizBonus +
      this.roundBonus +
      this.comboBonus +
      this.combo * 25;
    const stars = GameManager.getStars(score, 3600);

    this.didWin = true;
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
    this.playFanfare();

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

    const totalBonus =
      this.orbBonusScore +
      this.deflectionScore +
      this.airMassBonus +
      this.quizBonus +
      this.roundBonus +
      this.comboBonus;
    const bonusSummary = totalBonus > 0 ? `\n💰 Bonus: +${totalBonus} pts` : '';
    const comboLine =
      this.combo >= 2
        ? `\n🔥 Best combo: x${this.combo} (+${this.combo * 25})`
        : '';
    const victoryText = this.add
      .text(
        GAME_WIDTH / 2,
        180,
        `🌪️ CYCLONE FORMED!${bonusSummary}${comboLine}`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '30px',
          color: '#06D6A0',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY)
      .setAlpha(0);
    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      duration: 500
    });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: '🌪️ CYCLONE FORMED!',
      subtitle: 'You built a full cyclone from Coriolis force',
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
    this.cleanupActiveEvents();
    this.playFailJingle();

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
    if (this.quizTickTimer) this.quizTickTimer.remove();
    if (this.quizTimer) this.quizTimer.remove();
    if (this.airMassTimer) this.airMassTimer.remove();
    if (this.inflowTimer) this.inflowTimer.remove();
    this.inflowSprites.forEach(s => s.destroy());
    this.inflowSprites = [];
    this.rainStreakPool.forEach(s => s.destroy());
    this.rainStreakPool = [];
  }
}
