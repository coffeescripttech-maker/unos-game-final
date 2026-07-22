import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDLevelInfoPayload } from '@shared/events';
import type { HUDTutorialStepPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

// ── Tutorial step types ──
type TutorialTask = 'beacon' | 'streams' | 'burst' | 'complete';

interface StepDef {
  id: TutorialTask;
  task: string;
  instruction: string;
  description: string;
}

const STEPS: StepDef[] = [
  {
    id: 'beacon',
    task: 'Dismiss Alert Beacon',
    instruction: 'Click the beacon 5 times to silence it!',
    description: 'Multi-click to clear alerts'
  },
  {
    id: 'streams',
    task: 'Collect Data Streams',
    instruction: 'Click the floating data particles before they fade!',
    description: 'Click moving targets'
  },
  {
    id: 'burst',
    task: 'Burst Calibration',
    instruction: 'Click rapidly to fill the burst meter to 100%!',
    description: 'Rapid clicking builds power'
  },
  {
    id: 'complete',
    task: 'Briefing Complete',
    instruction: "You're ready for fieldwork!",
    description: ''
  }
];

const TASK_COLORS: Record<string, number> = {
  beacon: 0xd62828,
  streams: 0x6db3e6,
  burst: 0xffd166,
  complete: 0x06d6a0
};

export class TutorialScene extends Phaser.Scene {
  private currentStepIndex = 0;

  // ── Scene containers ──
  private bgContainer!: Phaser.GameObjects.Container;
  private deskContainer!: Phaser.GameObjects.Container;
  private stepContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;

  // ── Ambient ──
  private indoorGlow!: Phaser.GameObjects.Arc;
  private windowGlow!: Phaser.GameObjects.Rectangle;

  // ── Step indicator ──

  // ── Step-specific objects ──
  private beaconBody!: Phaser.GameObjects.Graphics;
  private beaconLight!: Phaser.GameObjects.Arc;
  private beaconClicks = 0;
  private streamsCollected = 0;
  private streamSpawnTimer!: Phaser.Time.TimerEvent;
  private burstValue = 0;
  private burstBar!: Phaser.GameObjects.Graphics;
  private burstBg!: Phaser.GameObjects.Graphics;

  // ── Step state ──
  private isInstructionsShown = false;

  constructor() {
    super({ key: SCENES.TUTORIAL });
  }

  // ════════════════════════════════════════════
  //  CREATE
  // ════════════════════════════════════════════

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.OCEAN_DEEP);

    this.currentStepIndex = 0;
    this.isInstructionsShown = false;

    this.buildScene();
    this.showIntroOverlay();
  }

  // ════════════════════════════════════════════
  //  BUILD SCENE — Research Base Environment
  // ════════════════════════════════════════════

  private buildScene() {
    // ── Depth 0: Background (Main Menu BG) ──
    const bgKey = this.textures.exists('main_menu_bg') ? 'main_menu_bg' : null;
    if (bgKey) {
      this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(0);
    }

    // ── Depth 1: Dim overlay + warm indoor ambient glow ──
    // Dim overlay to make text/objects pop
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setDepth(1);

    // Warm amber glow (overhead light)
    this.indoorGlow = this.add
      .circle(GAME_WIDTH / 2, 100, 500, 0xffd166, 0.06)
      .setDepth(1);
    const glow2 = this.add
      .circle(GAME_WIDTH / 2, 80, 300, 0xf77f00, 0.04)
      .setDepth(1);

    // Subtle pulsing
    this.tweens.add({
      targets: this.indoorGlow,
      alpha: 0.03,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ── Depth 2: Observation Window (right side) ──
    this.buildWindow();

    // ── Depth 3: Research Desk ──
    this.buildDesk();

    // ── Container for step objects ──
    this.stepContainer = this.add.container(0, 0).setDepth(5);

    // ── Container for UI ──
    this.uiContainer = this.add.container(0, 0).setDepth(10);
  }

  private buildWindow() {
    const wx = GAME_WIDTH - 240;
    const wy = 200;
    const ww = 200;
    const wh = 280;

    // Ocean view behind window (gradient-like)
    const oceanView = this.add.graphics().setDepth(2);
    oceanView.fillGradientStyle(0x3a87c4, 0x6db3e6, 0x0a2472, 0x1e5aa0);
    oceanView.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);

    // Window frame
    // this.add
    //   .rectangle(wx, wy, ww + 8, wh + 8, 0x2d3047, 0.9)
    //   .setStrokeStyle(4, 0x000000, 1)
    //   .setDepth(2);

    // Cross bars
    const crossH = this.add
      .rectangle(wx, wy, ww - 10, 3, 0x2d3047, 0.7)
      .setDepth(2);
    const crossV = this.add
      .rectangle(wx, wy, 3, wh - 10, 0x2d3047, 0.7)
      .setDepth(2);

    // Subtle blue glow from the window
    this.add.rectangle(wx - 80, wy, 80, wh, 0x6db3e6, 0.04).setDepth(1);
  }

  private buildDesk() {
    const deskY = 580;
    const deskH = 160;
    const deskW = GAME_WIDTH - 80;

    // Main desk surface
    // const desk = this.add.graphics().setDepth(3);
    // desk.fillStyle(0x5c4033, 1);
    // desk.fillRect(40, deskY, deskW, deskH);
    // desk.lineStyle(3, 0x000000, 1);
    // desk.strokeRect(40, deskY, deskW, deskH);

    // // Desk top edge (lighter wood highlight)
    // desk.fillStyle(0x8b6914, 0.3);
    // desk.fillRect(40, deskY, deskW, 4);

    // // Front panel detail
    // desk.fillStyle(0x4a3026, 1);
    // desk.fillRect(40, deskY + 30, deskW, 4);

    // ── Desk clutter ──
    // Coffee mug (left side)
    const mugX = 100;
    const mugBody = this.add.graphics().setDepth(3);
    mugBody.fillStyle(0xffffff, 0.15);
    mugBody.fillCircle(mugX, deskY - 10, 14);
    mugBody.fillStyle(0xffffff, 0.2);
    mugBody.fillRect(mugX - 4, deskY - 10, 8, 14);
    // Handle
    mugBody.lineStyle(2, 0xffffff, 0.15);
    mugBody.beginPath();
    mugBody.arc(mugX + 14, deskY - 6, 6, -1.2, 1.2);
    mugBody.strokePath();

    // Papers (left-center)
    for (let i = 0; i < 3; i++) {
      const px = 180 + i * 8;
      const py = deskY - 5 - i * 3;
      const paper = this.add.graphics().setDepth(3);
      paper.fillStyle(0xffffff, 0.12);
      paper.fillRect(px, py, 50, 35);
      paper.lineStyle(1, 0xffffff, 0.08);
      paper.strokeRect(px, py, 50, 35);
      // Text lines on paper
      paper.fillStyle(0xffffff, 0.08);
      paper.fillRect(px + 5, py + 6, 30, 2);
      paper.fillRect(px + 5, py + 12, 40, 2);
      paper.fillRect(px + 5, py + 18, 25, 2);
    }

    // Map/scroll (far right on desk)
    const mapX = GAME_WIDTH - 180;
    const map = this.add.graphics().setDepth(3);
    map.fillStyle(0x8b6914, 0.2);
    map.fillRoundedRect(mapX, deskY - 10, 80, 25, 4);
    map.lineStyle(1, 0x000000, 0.3);
    map.strokeRoundedRect(mapX, deskY - 10, 80, 25, 4);
    // Scroll roll
    map.fillStyle(0x654321, 0.3);
    map.fillCircle(mapX + 2, deskY + 2, 6);
    map.fillCircle(mapX + 78, deskY + 2, 6);
  }

  // ════════════════════════════════════════════
  //  INTRO OVERLAY (React)
  // ════════════════════════════════════════════

  private showIntroOverlay() {
    // Show custom mission briefing card (React TutorialBriefingOverlay)
    this.game.events.emit(GAME_EVENTS.HUD_TUTORIAL_BRIEFING);

    // Dismiss starts the game (same flow as other levels)
    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.isInstructionsShown = true;
    // Signal React with level info (clears WorldMapHeader, updates HUDTopBar)
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Welcome Aboard',
      description: 'Research base briefing'
    } satisfies HUDLevelInfoPayload);
    this.setupTutorialUI();
    this.showStep(0);
  };

  // ════════════════════════════════════════════
  //  UI: Skip listener (React renders step indicator + text)
  // ════════════════════════════════════════════

  private setupTutorialUI() {
    // Listen for skip from React overlay
    this.game.events.once(
      GAME_EVENTS.HUD_TUTORIAL_SKIP,
      this.skipTutorial,
      this
    );
    // Listen for continue from React overlay (complete step)
    this.game.events.once(
      GAME_EVENTS.HUD_TUTORIAL_CONTINUE,
      this.completeTutorial,
      this
    );
  }

  private updateStepDots(_index: number) {
    // Handled by React TutorialStepOverlay
  }

  // ════════════════════════════════════════════
  //  STEP MANAGER
  // ════════════════════════════════════════════

  private showStep(index: number) {
    if (index >= STEPS.length) {
      this.completeTutorial();
      return;
    }

    const step = STEPS[index];
    if (!step) return;

    this.currentStepIndex = index;
    this.updateStepDots(index);

    // Emit step info to React overlay
    this.game.events.emit(GAME_EVENTS.HUD_TUTORIAL_STEP, {
      currentStep: index,
      totalSteps: STEPS.length,
      task: step.task,
      instruction: step.instruction,
      description: step.description,
      stepId: step.id
    } satisfies HUDTutorialStepPayload);

    // Slide out old step objects
    this.tweens.add({
      targets: this.stepContainer,
      alpha: 0,
      x: -40,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.stepContainer.removeAll(true);
        this.stepContainer.setAlpha(1);
        this.stepContainer.setX(0);

        // Build step-specific objects
        this.buildStep(step);
      }
    });
  }

  private buildStep(step: StepDef) {
    switch (step.id) {
      case 'beacon':
        this.createAlertBeacon();
        break;
      case 'streams':
        this.createDataStreams();
        break;
      case 'burst':
        this.createBurstMeter();
        break;
      case 'complete':
        this.createCompleteStep();
        break;
    }
  }

  // ════════════════════════════════════════════
  //  STEP 1 — Alert Beacon (multi-click)
  // ════════════════════════════════════════════

  private createAlertBeacon() {
    const cx = 300;
    const cy = 450;
    this.beaconClicks = 0;
    const maxClicks = 5;

    // Device base
    const base = this.add.graphics();
    base.fillStyle(0x2d3047, 1);
    base.fillRoundedRect(cx - 45, cy - 50, 90, 100, 6);
    base.lineStyle(3, 0x000000, 1);
    base.strokeRoundedRect(cx - 45, cy - 50, 90, 100, 6);

    // Dome on top
    base.fillStyle(0xd62828, 0.3);
    base.fillCircle(cx, cy - 50, 20);
    base.lineStyle(2, 0x000000, 1);
    base.strokeCircle(cx, cy - 50, 20);

    // Blinking light
    this.beaconLight = this.add.circle(cx, cy - 50, 12, 0xd62828, 1);
    this.tweens.add({
      targets: this.beaconLight,
      alpha: 0.15,
      scale: 0.8,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // Screen showing click count
    const screenBg = this.add.graphics();
    screenBg.fillStyle(0x0a2472, 0.8);
    screenBg.fillRoundedRect(cx - 30, cy - 20, 60, 30, 4);

    const clickCounter = this.add
      .text(cx, cy - 5, `${this.beaconClicks}/${maxClicks}`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '16px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    // Progress dots on screen
    const dotRow = this.add.graphics();
    this.drawBeaconDots(dotRow, cx, cy + 12, 0, maxClicks);

    // Label
    const label = this.add
      .text(cx, cy + 35, 'ALERT BEACON', {
        fontFamily: FONTS.BODY,
        fontSize: '9px',
        color: '#d62828',
        stroke: '#000000',
        strokeThickness: 1
      })
      .setOrigin(0.5);

    // Glow
    const glow = this.add.circle(cx, cy, 80, TASK_COLORS.beacon, 0.06);

    // Hit zone
    const hitZone = this.add
      .rectangle(cx, cy, 90, 100, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', () => {
      this.beaconClicks++;

      // Feedback: shake + flash
      this.tweens.add({
        targets: [base, this.beaconLight],
        x: cx + Phaser.Math.Between(-3, 3),
        duration: 30,
        yoyo: true,
        repeat: 2
      });

      clickCounter.setText(`${this.beaconClicks}/${maxClicks}`);
      this.drawBeaconDots(dotRow, cx, cy + 12, this.beaconClicks, maxClicks);

      if (this.beaconClicks >= maxClicks) {
        // Silenced!
        this.tweens.killTweensOf(this.beaconLight);
        this.beaconLight.setFillStyle(0x06d6a0);
        this.beaconLight.setAlpha(1);
        hitZone.disableInteractive();

        this.showSuccessFeedback(cx, cy - 70, '✓ Beacon Silenced!');
        this.time.delayedCall(600, () =>
          this.showStep(++this.currentStepIndex)
        );
      }
    });

    this.stepContainer.add([
      base,
      screenBg,
      clickCounter,
      dotRow,
      label,
      this.beaconLight,
      glow,
      hitZone
    ]);
  }

  private drawBeaconDots(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    filled: number,
    total: number
  ) {
    gfx.clear();
    const spacing = 14;
    const startX = cx - ((total - 1) * spacing) / 2;
    for (let i = 0; i < total; i++) {
      gfx.fillStyle(i < filled ? 0x06d6a0 : 0xffffff, i < filled ? 1 : 0.25);
      gfx.fillCircle(startX + i * spacing, cy, 4);
    }
  }

  // ════════════════════════════════════════════
  //  STEP 2 — Data Streams (moving targets)
  // ════════════════════════════════════════════

  private createDataStreams() {
    const cx = 300;
    this.streamsCollected = 0;
    const targetCount = 8;

    // Device base — data receiver
    const base = this.add.graphics();
    base.fillStyle(0x2d3047, 1);
    base.fillRoundedRect(cx - 80, 480, 160, 55, 6);
    base.lineStyle(3, 0x000000, 1);
    base.strokeRoundedRect(cx - 80, 480, 160, 55, 6);

    // Receiver dish on top
    base.fillStyle(0x1e5aa0, 0.5);
    base.fillEllipse(cx, 480, 60, 16);
    base.lineStyle(2, 0x6db3e6, 0.5);
    base.strokeEllipse(cx, 480, 60, 16);

    // Label
    const label = this.add
      .text(cx, 510, 'DATA RECEIVER', {
        fontFamily: FONTS.BODY,
        fontSize: '9px',
        color: '#6DB3E6',
        stroke: '#000000',
        strokeThickness: 1
      })
      .setOrigin(0.5);

    // Counter
    const counter = this.add
      .text(cx, 470, `Collected: 0/${targetCount}`, {
        fontFamily: FONTS.BODY,
        fontSize: '12px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    // Glow
    const glow = this.add.circle(cx, 400, 120, TASK_COLORS.streams, 0.04);

    // Spawn particles over time
    let spawnCount = 0;
    this.streamSpawnTimer = this.time.addEvent({
      delay: 900,
      callback: () => {
        if (spawnCount >= targetCount + 3) return; // a few extra chances
        spawnCount++;

        const px = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const py = Phaser.Math.Between(300, 420);
        const size = Phaser.Math.Between(8, 14);
        const speed = Phaser.Math.Between(2000, 3500);

        // Particle body
        const p = this.add
          .circle(px, py, size, 0x6db3e6, 0.5)
          .setStrokeStyle(2, 0xffffff, 0.3)
          .setDepth(6)
          .setInteractive({ useHandCursor: true });

        // Glow ring behind it
        const g = this.add.circle(px, py, size + 4, 0x6db3e6, 0.1).setDepth(5);

        // Float tween
        const targetY = py - Phaser.Math.Between(150, 250);
        const driftX = Phaser.Math.Between(-60, 60);
        this.tweens.add({
          targets: [p, g],
          y: targetY,
          x: px + driftX,
          alpha: 0.2,
          duration: speed,
          ease: 'Quad.easeIn',
          onComplete: () => {
            // Particle faded — stream lost
            if (p.active) p.destroy();
            if (g.active) g.destroy();
          }
        });

        // Click handler
        p.on('pointerdown', () => {
          if (!p.active) return;
          p.disableInteractive();
          this.streamsCollected++;

          // Pop effect
          this.tweens.add({
            targets: [p, g],
            scale: 1.8,
            alpha: 0,
            duration: 200
          });

          counter.setText(`Collected: ${this.streamsCollected}/${targetCount}`);

          // Small spark
          for (let s = 0; s < 3; s++) {
            const spark = this.add
              .circle(p.x, p.y, 3, 0x06d6a0, 0.8)
              .setDepth(6);
            this.tweens.add({
              targets: spark,
              x: spark.x + Phaser.Math.Between(-15, 15),
              y: spark.y - Phaser.Math.Between(10, 25),
              alpha: 0,
              scale: 0.2,
              duration: 300,
              onComplete: () => spark.destroy()
            });
          }

          // Done?
          if (this.streamsCollected >= targetCount) {
            this.streamSpawnTimer.destroy();
            base.clear();
            base.fillStyle(0x06d6a0, 0.15);
            base.fillRoundedRect(cx - 80, 480, 160, 55, 6);
            base.lineStyle(3, 0x06d6a0, 0.6);
            base.strokeRoundedRect(cx - 80, 480, 160, 55, 6);
            base.fillStyle(0x1e5aa0, 0.5);
            base.fillEllipse(cx, 480, 60, 16);
            base.lineStyle(2, 0x6db3e6, 0.5);
            base.strokeEllipse(cx, 480, 60, 16);

            this.showSuccessFeedback(cx, targetY - 40, '✓ All Data Collected!');
            this.time.delayedCall(600, () =>
              this.showStep(++this.currentStepIndex)
            );
          }
        });

        this.stepContainer.add([p, g]);
      },
      loop: true
    });

    this.stepContainer.add([base, label, counter, glow]);
  }

  // ════════════════════════════════════════════
  //  STEP 3 — Burst Calibration (rapid click)
  // ════════════════════════════════════════════

  private createBurstMeter() {
    const cx = 300;
    const cy = 470;
    this.burstValue = 0;

    // Label
    const label = this.add
      .text(cx, cy - 85, 'ENERGY BURST METER', {
        fontFamily: FONTS.BODY,
        fontSize: '11px',
        color: '#8C8F9E',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    // Glow
    const glow = this.add.circle(cx, cy, 100, TASK_COLORS.burst, 0.05);

    // Burst target (the clickable drum)
    const drum = this.add.graphics();
    drum.fillStyle(0x2d3047, 1);
    drum.fillCircle(cx, cy, 50);
    drum.lineStyle(3, 0x000000, 1);
    drum.strokeCircle(cx, cy, 50);
    drum.fillStyle(0x1a1a3e, 0.5);
    drum.fillCircle(cx, cy, 35);

    // Center icon (lightning bolt)
    const icon = this.add
      .text(cx, cy - 3, '⚡', {
        fontFamily: FONTS.BODY,
        fontSize: '28px'
      })
      .setOrigin(0.5);

    const clickMe = this.add
      .text(cx, cy + 22, 'CLICK!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '11px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5);

    // ── Bar background ──
    this.burstBg = this.add.graphics();
    this.burstBg.fillStyle(0x000000, 0.5);
    this.burstBg.fillRoundedRect(cx - 80, cy + 45, 160, 20, 6);

    // ── Burst fill bar ──
    this.burstBar = this.add.graphics();
    this.drawBurstBar(cx, 0);

    // Percentage text
    const pctText = this.add
      .text(cx, cy + 55, '0%', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '10px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
      })
      .setOrigin(0.5);

    // Hit zone
    const hitZone = this.add
      .circle(cx, cy, 50, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    let clickCount = 0;
    hitZone.on('pointerdown', () => {
      clickCount++;
      this.burstValue = Math.min(100, this.burstValue + 10);
      this.drawBurstBar(cx, this.burstValue, cy);
      pctText.setText(`${this.burstValue}%`);

      // Drum feedback
      this.tweens.add({
        targets: drum,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 60,
        yoyo: true
      });

      // Flash icon
      this.tweens.add({
        targets: icon,
        alpha: 0.3,
        duration: 50,
        yoyo: true
      });

      // Spark each click
      for (let s = 0; s < 2; s++) {
        const sp = this.add
          .circle(
            cx + Phaser.Math.Between(-20, 20),
            cy + Phaser.Math.Between(-20, 20),
            Phaser.Math.Between(2, 4),
            0xffd166,
            0.8
          )
          .setDepth(6);
        this.tweens.add({
          targets: sp,
          alpha: 0,
          scale: 0.2,
          x: sp.x + Phaser.Math.Between(-15, 15),
          y: sp.y - Phaser.Math.Between(10, 20),
          duration: 300,
          onComplete: () => sp.destroy()
        });
      }

      if (this.burstValue >= 100) {
        hitZone.disableInteractive();
        drum.clear();
        drum.fillStyle(0x06d6a0, 0.15);
        drum.fillCircle(cx, cy, 50);
        drum.lineStyle(3, 0x06d6a0, 0.6);
        drum.strokeCircle(cx, cy, 50);
        drum.fillStyle(0x1a1a3e, 0.5);
        drum.fillCircle(cx, cy, 35);

        icon.setText('✓');
        icon.setColor('#06D6A0');
        clickMe.setText('FULL POWER!');
        clickMe.setColor('#06D6A0');

        this.showSuccessFeedback(cx, cy - 80, '✓ Meter Full!');
        this.time.delayedCall(600, () =>
          this.showStep(++this.currentStepIndex)
        );
      }
    });

    this.stepContainer.add([
      label,
      glow,
      drum,
      icon,
      clickMe,
      this.burstBg,
      this.burstBar,
      pctText,
      hitZone
    ]);
  }

  private drawBurstBar(cx: number, value: number, cy = 470) {
    this.burstBar.clear();
    if (value <= 0) return;
    const fill = Math.min(1, value / 100);
    const color = value >= 80 ? 0x06d6a0 : value >= 40 ? 0xffd166 : 0xd62828;

    this.burstBar.fillStyle(color, 0.85);
    this.burstBar.fillRoundedRect(cx - 78, cy + 47, 156 * fill, 16, 5);

    // Glow line at top
    this.burstBar.fillStyle(0xffffff, 0.2);
    this.burstBar.fillRect(cx - 78, cy + 47, 156 * fill, 2);
  }

  // (Swipe step moved to RotationScene)

  // ════════════════════════════════════════════
  //  STEP 5 — Complete
  // ════════════════════════════════════════════

  private createCompleteStep() {
    // Flash the cameras for celebration
    this.cameras.main.flash(300, 255, 255, 200);
    this.cameras.main.shake(200, 0.005);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Success ring (expanding decorative circle)
    const ring = this.add.circle(cx, cy - 20, 60, 0x06d6a0, 0.1).setDepth(5);
    ring.setStrokeStyle(3, 0x06d6a0, 0.5);
    this.tweens.add({
      targets: ring,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1000
    });

    // Checkmark
    const check = this.add
      .text(cx, cy - 20, '✓', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '48px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setScale(0);

    this.tweens.add({
      targets: check,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Light particles
    for (let i = 0; i < 12; i++) {
      const spark = this.add
        .circle(
          cx + Phaser.Math.Between(-150, 150),
          cy + Phaser.Math.Between(-80, 20),
          Phaser.Math.Between(2, 5),
          [0x06d6a0, 0xffd166, 0x6db3e6][Phaser.Math.Between(0, 2)],
          0.8
        )
        .setDepth(5);

      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-40, 40),
        y: spark.y - Phaser.Math.Between(30, 80),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(600, 1200),
        delay: i * 100,
        onComplete: () => spark.destroy()
      });
    }

    this.stepContainer.add([ring, check]);
  }

  // ════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════

  private showSuccessFeedback(x: number, y: number, text: string) {
    const popup = this.add
      .text(x, y, text, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '16px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: popup,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => popup.destroy()
    });
  }

  // ════════════════════════════════════════════
  //  COMPLETE / SKIP
  // ════════════════════════════════════════════

  private completeTutorial() {
    this.game.events.emit(GAME_EVENTS.HUD_TUTORIAL_HIDE);
    // Listen for Continue from the result overlay
    this.game.events.once(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    GameManager.getInstance().completeLevel('tutorial', 0, 1, 0);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    progress['tutorial'] = {
      completed: true,
      bestScore: 0,
      bestTime: 0,
      stars: 1,
      attempts: (progress['tutorial']?.attempts ?? 0) + 1,
      factsUnlocked: ['fact_tutorial']
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Welcome Aboard!',
      subtitle: 'Research base briefing complete',
      score: 0,
      stars: 1,
      levelId: 'tutorial',
      timeUsed: 0,
      factsUnlocked: ['fact_tutorial']
    });
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private skipTutorial() {
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
    this.cleanupStep();
    this.completeTutorial();
  }

  private cleanupStep() {
    if (this.streamSpawnTimer) this.streamSpawnTimer.destroy();
    this.stepContainer.removeAll(true);
  }

  // ════════════════════════════════════════════
  //  SHUTDOWN
  // ════════════════════════════════════════════

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
    this.game.events.off(
      GAME_EVENTS.HUD_TUTORIAL_SKIP,
      this.skipTutorial,
      this
    );
    this.game.events.off(
      GAME_EVENTS.HUD_TUTORIAL_CONTINUE,
      this.completeTutorial,
      this
    );
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    if (this.streamSpawnTimer) this.streamSpawnTimer.destroy();
  }
}
