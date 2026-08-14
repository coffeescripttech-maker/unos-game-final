import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type {
  HUDTimerPayload,
  HUDObjectivePayload,
  HUDLevelInfoPayload,
  HUDLevelIntroPayload,
  HUDResultPayload,
  HUDPatternReviewPayload,
  HUDPressureSlotsPayload
} from '@shared/events';
import { FONTS, GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameManager } from '../managers/GameManager';
import { playChime, playBuzz } from '../utils/audio';

const TOTAL_TIME = 90;
const TARGET_X = 1100;
const TARGET_Y = 180;
const ROUNDS_TO_WIN = 3;

interface SlotData {
  x: number;
  y: number;
  placed: 'high' | 'low' | null;
  correct: 'high' | 'low';
  ghostLabel: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Arc;
  marker?: Phaser.GameObjects.Arc;
  markerText?: Phaser.GameObjects.Text;
  statusText?: Phaser.GameObjects.Text;
}

export class PressureScene extends Phaser.Scene {
  private slots: SlotData[] = [];
  private cloud!: Phaser.GameObjects.Image;
  private cloudGlow!: Phaser.GameObjects.Image;
  private selectedType: 'high' | 'low' | null = null;
  private currentPattern: ('high' | 'low')[] = [];
  private awaitingReview: 'correct' | 'wrong' | null = null;
  private roundActive = false;
  private isComplete = false;
  private gameStarted = false;
  private timeRemaining = TOTAL_TIME;
  private hintBtn?: Phaser.GameObjects.Text;
  private hintUses = 2;
  private hintRevealTimer?: Phaser.Time.TimerEvent;
  private combo = 0;
  private bestCombo = 0;
  private comboScore = 0;
  private comboText?: Phaser.GameObjects.Text;
  private stormShade?: Phaser.GameObjects.Rectangle;
  private roundText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private windArrows: Phaser.GameObjects.Graphics[] = [];
  private previewArrows: Phaser.GameObjects.GameObject[] = [];
  private placedCount = 0;
  private round = 0;
  private targetArrow!: Phaser.GameObjects.Graphics;
  private windStreamTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: SCENES.PRESSURE });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x0d1b2a);
    this.isComplete = false;
    this.gameStarted = false;
    this.roundActive = false;
    this.timeRemaining = TOTAL_TIME;
    this.selectedType = null;
    this.placedCount = 0;
    this.round = 0;
    this.slots = [];
    this.windArrows = [];
    this.previewArrows = [];

    this.buildScene();
    this.showIntroOverlay();
  }

  private buildScene() {
    // ── Pressure island background (subtle slow zoom animation) ──
    const bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'pressure_island_bg')
      .setDepth(0);
    const bgScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(bgScale);
    this.tweens.add({
      targets: bg,
      scaleX: bgScale * 1.02,
      scaleY: bgScale * 1.02,
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Subtle dark overlay so game elements pop
    const overlay = this.add.graphics().setDepth(0);
    overlay.fillStyle(0x000000, 0.3);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Storm darkness — grows every round for escalating tension
    this.stormShade = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a2e, 0)
      .setDepth(0.5);

    // ── Target zone (destination) ──
    const tg = this.add.graphics().setDepth(1);
    tg.lineStyle(2, 0xffd166, 0.5);
    tg.strokeCircle(TARGET_X, TARGET_Y, 32);
    tg.fillStyle(0xffd166, 0.05);
    tg.fillCircle(TARGET_X, TARGET_Y, 32);
    // pulse ring
    const pulse = this.add
      .circle(TARGET_X, TARGET_Y, 28, 0xffd166, 0.04)
      .setStrokeStyle(1, 0xffd166, 0.15)
      .setDepth(1);
    this.tweens.add({
      targets: pulse,
      scale: 2,
      alpha: 0,
      duration: 2500,
      repeat: -1,
      ease: 'Sine.easeOut'
    });
    // label
    this.add
      .text(TARGET_X, TARGET_Y + 44, '🎯 DESTINATION', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '11px',
        color: '#FFD166',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(1);

    // ── Cloud (starts at left) — cloud_glow_s3 image only ──
    this.cloud = this.add
      .image(140, TARGET_Y, 'cloud_glow_s3')
      .setDepth(3)
      .setScale(0.35)
      .setAlpha(0.85);
    this.cloudGlow = this.add
      .image(140, TARGET_Y, 'cloud_glow_s3')
      .setDepth(2)
      .setScale(0.24)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Idle breathing animation for cloud (very subtle)
    this.tweens.add({
      targets: this.cloud,
      scaleX: 0.35 * 1.03,
      scaleY: 0.35 * 1.03,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ── Arrow path toward target ──
    this.targetArrow = this.add.graphics().setDepth(1);
    this.targetArrow.lineStyle(2.5, 0xffd166, 0.35);
    this.targetArrow.lineBetween(160, TARGET_Y, TARGET_X - 34, TARGET_Y);
    // arrowhead
    this.targetArrow.fillStyle(0xffd166, 0.35);
    this.targetArrow.fillTriangle(
      TARGET_X - 34,
      TARGET_Y - 4,
      TARGET_X - 34,
      TARGET_Y + 4,
      TARGET_X - 28,
      TARGET_Y
    );

    // Animated flow dots along the path
    for (let i = 0; i < 4; i++) {
      const dot = this.add.circle(160, TARGET_Y, 3, 0xffd166, 0.5).setDepth(1);
      this.tweens.add({
        targets: dot,
        x: TARGET_X - 34,
        duration: 2500,
        delay: i * 600,
        repeat: -1,
        ease: 'Sine.easeInOut',
        yoyo: true
      });
    }

    // ── Round / Progress ──
    this.roundText = this.add
      .text(20, 80, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '14px',
        color: '#8ab4f8',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setDepth(5);

    // Combo indicator (top-right)
    this.comboText = this.add
      .text(GAME_WIDTH - 40, 100, '', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '16px',
        color: '#FF6D3F',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(1, 0)
      .setDepth(6)
      .setAlpha(0);

    this.progressBar = this.add.graphics().setDepth(5);

    // ── Title ──
    this.add
      .text(GAME_WIDTH / 2, 100, '🌀 Wind flows from HIGH → LOW pressure', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '13px',
        color: '#4fc3f7',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0.7);

    // ── Slots (will be created by newRound) ──
    this.createSlots();

    // ── Divider ──
    const div = this.add.graphics().setDepth(1);
    div.lineStyle(1, 0x4a6a7a, 0.3);
    div.lineBetween(80, 550, GAME_WIDTH - 80, 550);

    // ── React pressure control listeners ──
    this.game.events.on(GAME_EVENTS.HUD_PRESSURE_SELECT, this.onReactSelect);
    this.game.events.on(GAME_EVENTS.HUD_PRESSURE_START, this.onReactStart);
  }

  private createSlots() {
    const slotPositions = [
      { x: 640, y: 240 }, // top
      { x: 840, y: 290 }, // top-right
      { x: 820, y: 460 }, // bottom-right
      { x: 640, y: 500 }, // bottom
      { x: 460, y: 460 }, // bottom-left
      { x: 440, y: 290 } // top-left
    ];
    slotPositions.forEach((p, i) => {
      const hit = this.add
        .circle(p.x, p.y, 32, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(3);
      hit.on('pointerdown', () => this.onSlotClicked(i));
      const ghost = this.add
        .text(p.x, p.y, '?', {
          fontFamily: FONTS.DISPLAY,
          fontSize: '18px',
          color: '#4a6a7a',
          stroke: '#000000',
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(1.5)
        .setAlpha(0);
      // Slot number label (matches modal references like "#1", "#2")
      this.add
        .text(p.x, p.y + 35, `#${i + 1}`, {
          fontFamily: FONTS.DISPLAY,
          fontSize: '9px',
          color: '#3a5a7a',
          stroke: '#000000',
          strokeThickness: 1
        })
        .setOrigin(0.5)
        .setDepth(1)
        .setAlpha(0.5);
      this.slots.push({
        x: p.x,
        y: p.y,
        placed: null,
        correct: 'low',
        ghostLabel: ghost,
        hitArea: hit
      });
    });
  }

  private newRound() {
    this.round++;
    this.placedCount = 0;
    this.selectedType = null;
    this.awaitingReview = null;
    this.roundActive = true;
    this.combo = 0;
    this.hideCombo();
    this.windArrows.forEach(a => a.destroy());
    this.previewArrows.forEach(a => a.destroy());
    this.previewArrows = [];
    this.destroyHintButton();

    // Storm darkens as the typhoon grows — tension each round
    if (this.stormShade) {
      this.stormShade.setAlpha(0.05 * (this.round - 1));
    }
    // Round start chime (two soft notes)
    this.playRoundChime();

    // Per-round learning mode:
    //  R1 = tutorial (pattern visible the whole time)
    //  R2 = memorize (2-second peek, then hide)
    //  R3 = challenge (hidden; reward earned by using the Hint button)
    const learnMode = this.round === 1 ? 'tutorial' : this.round === 2 ? 'memorize' : 'challenge';
    const rMeta =
      this.round === 1
        ? { msg: 'Follow the letters!', color: '#8ab4f8' }
        : this.round === 2
          ? { msg: 'Memorize the pattern!', color: '#c792ea' }
          : { msg: 'No hints — use your knowledge!', color: '#4fc3f7' };

    // Round announcement
    const roundMsg = this.add
      .text(GAME_WIDTH / 2, 220, `🌀 Round ${this.round}\n${rMeta.msg}`, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '28px',
        color: rMeta.color,
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScale(0.01);
    this.tweens.add({
      targets: roundMsg,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: roundMsg,
          alpha: 0,
          delay: 900,
          duration: 300,
          onComplete: () => roundMsg.destroy()
        });
      }
    });
    this.windArrows = [];

    // Destroy tracked markers from the previous round
    this.slots.forEach(s => {
      if (s.marker) { s.marker.destroy(); s.marker = undefined; }
      if (s.markerText) { s.markerText.destroy(); s.markerText = undefined; }
      if (s.statusText) { s.statusText.destroy(); s.statusText = undefined; }
    });

    // Clear old markers safely (ghost labels at depth 1.5 are NOT destroyed)
    this.children.list.slice().forEach(c => {
      const o = c as any;
      if (
        o.type === 'Arc' &&
        o.active &&
        o.depth === 3 &&
        (o.fillColor === 0xd62828 ||
          o.fillColor === 0x1565c0 ||
          o.fillColor === 0x06d6a0)
      )
        o.destroy();
    });
    this.children.list.slice().forEach(c => {
      const o = c as any;
      if (
        o.type === 'Text' &&
        o.active &&
        o.depth === 4 &&
        (o.text === 'H' || o.text === 'L')
      )
        o.destroy();
    });

    // Generate random but valid pattern: 3H + 3L that creates a flow
    // Simple: keep the alternating pattern but shift it each round
    const patterns: ('high' | 'low')[][] = [
      ['low', 'high', 'low', 'high', 'low', 'high'],
      ['high', 'low', 'high', 'low', 'high', 'low'],
      ['low', 'low', 'high', 'high', 'low', 'high'],
      ['high', 'high', 'low', 'low', 'high', 'low']
    ];
    const correct = patterns[(this.round - 1) % patterns.length];
    this.currentPattern = correct;

    this.slots.forEach((s, i) => {
      s.placed = null;
      s.correct = correct[i];
      // Slot circle
      const circle = this.add
        .circle(s.x, s.y, 26, 0x1a3a4a, 0.6)
        .setStrokeStyle(2, 0x4a6a7a, 0.3)
        .setDepth(2);
      this.tweens.add({
        targets: circle,
        alpha: { from: 0.6, to: 0.3 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Ghost label — starts hidden ('?'), reveal depends on round
      s.ghostLabel.setText('?');
      s.ghostLabel.setColor('#4a6a7a');
      s.ghostLabel.setAlpha(0.55);
      s.ghostLabel.setStroke('rgba(0,0,0,0.8)', 3);
      s.ghostLabel.setFontSize('18px');
    });

    // Apply per-round reveal strategy
    if (learnMode === 'tutorial') {
      this.setGhostReveal(true);
    } else if (learnMode === 'memorize') {
      this.setGhostReveal(true);
      this.time.delayedCall(2200, () => {
        if (!this.roundActive || this.isComplete) return;
        this.setGhostReveal(false);
        this.spawnFloatText(GAME_WIDTH / 2, 270, '🧠 Now place from memory!', '#c792ea');
      });
    } else {
      this.setGhostReveal(false);
      this.showHintButton();
    }

    this.updateUI();
    this.drawProgress();
    this.emitState();
    this.emitSlots();
  }

  private updateUI() {
    this.roundText.setText(`Round ${this.round}/${ROUNDS_TO_WIN}`);
  }

  // ─────────────────────────────────
  //  LIVE FEEDBACK HELPERS
  // ─────────────────────────────────

  /** Show or hide the ghost H/L pattern on all slots */
  private setGhostReveal(reveal: boolean) {
    this.slots.forEach(s => {
      if (reveal) {
        s.ghostLabel.setText(s.correct === 'high' ? 'H' : 'L');
        s.ghostLabel.setColor(s.correct === 'high' ? '#d62828' : '#1565c0');
        s.ghostLabel.setAlpha(0.7);
      } else {
        s.ghostLabel.setText('?');
        s.ghostLabel.setColor('#4a6a7a');
        s.ghostLabel.setAlpha(0.55);
      }
    });
  }

  /** Round 3 — limited "peek at the pattern" hint button */
  private showHintButton() {
    this.destroyHintButton();
    this.hintUses = 2;
    const btn = this.add
      .text(GAME_WIDTH - 40, 60, '💡 Reveal pattern (2)', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '13px',
        color: '#FFD166',
        backgroundColor: '#1a1a3e',
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(1, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    this.hintBtn = btn;
    btn.on('pointerdown', () => {
      if (this.hintUses <= 0 || !this.roundActive || this.isComplete) return;
      this.hintUses--;
      btn.setText(`💡 Reveal pattern (${this.hintUses})`);
      this.setGhostReveal(true);
      this.hintRevealTimer = this.time.delayedCall(2200, () => {
        if (!this.roundActive || this.isComplete) return;
        if (this.hintUses <= 0) this.destroyHintButton();
        else this.setGhostReveal(false);
      });
    });
  }

  private destroyHintButton() {
    if (this.hintRevealTimer) {
      this.hintRevealTimer.destroy();
      this.hintRevealTimer = undefined;
    }
    if (this.hintBtn) {
      this.hintBtn.destroy();
      this.hintBtn = undefined;
    }
  }

  // ── Combo feedback ──

  private showCombo() {
    if (!this.comboText) return;
    if (this.combo < 2) {
      this.hideCombo();
      return;
    }
    this.comboText
      .setText(`🔥 x${this.combo}  +${this.combo * 50}`)
      .setAlpha(1);
    this.comboText.setScale(1.25);
    this.tweens.add({
      targets: this.comboText,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
  }

  private hideCombo() {
    if (this.comboText) {
      this.comboText.setAlpha(0);
      this.comboText.setText('');
    }
  }

  // ── Procedural sound effects (WebAudio, no audio files needed) ──

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
    delay: number
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
        } catch { /* already gone */ }
      };
    } catch { /* audio unavailable */ }
  }

  /** Correct placement — pitch rises with the combo for a satisfying climb */
  private playCorrectTone(combo: number) {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    const base = 430 + Math.min(combo, 6) * 75;
    this.tone(ctx, base, 0.11, 'triangle', 0.06, 0);
    this.tone(ctx, base * 1.5, 0.16, 'triangle', 0.05, 0.09);
  }

  /** Wrong placement — low buzz */
  private playWrongTone() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 150, 0.26, 'sawtooth', 0.045, 0);
    this.tone(ctx, 110, 0.3, 'square', 0.03, 0.02);
  }

  /** START WIND — rising gust sweep */
  private playWhoosh() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    for (let i = 0; i < 6; i++) {
      this.tone(ctx, 260 + i * 130, 0.12, 'sine', 0.024, i * 0.045);
    }
  }

  /** Round start chime */
  private playRoundChime() {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    this.tone(ctx, 620, 0.12, 'triangle', 0.05, 0);
    this.tone(ctx, 830, 0.16, 'triangle', 0.04, 0.11);
  }

  // ── Cloud personality ──

  /** Happy hop when a slot is placed correctly */
  private cloudHop() {
    this.tweens.add({
      targets: this.cloud,
      y: TARGET_Y - 8,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  /** Red tint flash when a slot is placed wrong */
  private cloudFlash() {
    this.cloud.setTint(0xff4444);
    this.time.delayedCall(240, () => {
      if (this.cloud.active) this.cloud.clearTint();
    });
  }

  /** Small floating text that rises and fades (CORRECT! / WRONG! / reminders) */
  private spawnFloatText(x: number, y: number, msg: string, color: string) {
    const t = this.add
      .text(x, y, msg, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '13px',
        color,
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy()
    });
  }

  /** Cloud glides forward for each correct slot, slides back on a wrong one */
  private updateCloudProgress() {
    if (this.round < 1 || !this.gameStarted) return;
    const correctCount = this.slots.filter(s => s.placed === s.correct).length;
    const roundStart = Phaser.Math.Linear(
      140,
      TARGET_X,
      (this.round - 1) / ROUNDS_TO_WIN
    );
    const roundEnd = Phaser.Math.Linear(
      140,
      TARGET_X,
      this.round / ROUNDS_TO_WIN
    );
    const dest = Phaser.Math.Linear(roundStart, roundEnd, correctCount / 6);
    this.tweens.add({
      targets: [this.cloud, this.cloudGlow],
      x: dest,
      duration: 400,
      ease: 'Sine.easeOut'
    });
  }

  // ─────────────────────────────────
  //  SLOT & SELECT
  // ─────────────────────────────────

  private selectType(type: 'high' | 'low') {
    if (!this.roundActive || this.isComplete || !this.gameStarted) return;
    this.selectedType = type;
    this.updateUI();
    this.emitState();
  }

  private onReactSelect = (type: 'high' | 'low' | null) => {
    if (type === null) {
      this.selectedType = null;
      this.updateUI();
      this.emitState();
      return;
    }
    this.selectType(type);
  };

  private onReactStart = () => {
    this.startWind();
  };

  private emitState() {
    this.game.events.emit(GAME_EVENTS.HUD_PRESSURE_STATE, {
      selectedType: this.selectedType,
      placedCount: this.placedCount,
      roundActive: this.roundActive,
      gameStarted: this.gameStarted,
      isComplete: this.isComplete,
      round: this.round,
      totalRounds: ROUNDS_TO_WIN
    });
  }

  private emitSlots() {
    this.game.events.emit(GAME_EVENTS.HUD_PRESSURE_SLOTS, {
      slots: this.slots.map(s => ({
        x: s.x,
        y: s.y,
        index: this.slots.indexOf(s),
        correct: s.correct,
        placed: s.placed
      })),
      round: this.round,
      totalRounds: ROUNDS_TO_WIN
    } satisfies HUDPressureSlotsPayload);
  }

  private playPlaceBurst(x: number, y: number, type: 'high' | 'low') {
    const color = type === 'high' ? 0xd62828 : 0x4fc3f7;
    const count = 10;

    // Expanding pressure ring
    const ring = this.add
      .circle(x, y, 10, 0x000000, 0)
      .setStrokeStyle(2.5, color, 0.9)
      .setDepth(5);
    this.tweens.add({
      targets: ring,
      radius: 38,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });

    // Wind swirl particles
    for (let i = 0; i < count; i++) {
      const angle =
        (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = Phaser.Math.Between(35, 55);
      const size = Phaser.Math.Between(2, 5);
      const particle = this.add.circle(x, y, size, color, 0.8).setDepth(5);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    // Curved wind streak arcs (2 of them)
    for (let i = 0; i < 2; i++) {
      const dir = i === 0 ? 1 : -1;
      const g = this.add.graphics().setDepth(5);
      const startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRad = 14;
      const endRad = 32;
      const steps = 12;
      const pts: Phaser.Math.Vector2[] = [];
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const a = startAngle + t * dir * 1.2;
        const r = Phaser.Math.Linear(startRad, endRad, t);
        pts.push(
          new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r)
        );
      }
      g.lineStyle(2, color, 0.7);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        g.lineTo(pts[j].x, pts[j].y);
      }
      g.strokePath();
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: 400,
        delay: i * 80,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy()
      });
    }
  }

  private onSlotClicked(index: number) {
    if (
      !this.roundActive ||
      this.isComplete ||
      !this.gameStarted ||
      !this.selectedType
    )
      return;
    const slot = this.slots[index];

    // ── Undo: tap an occupied slot with the SAME selected type → remove it
    if (slot.placed === this.selectedType) {
      slot.placed = null;
      this.placedCount--;
      if (slot.marker) { slot.marker.destroy(); slot.marker = undefined; }
      if (slot.markerText) { slot.markerText.destroy(); slot.markerText = undefined; }
      if (slot.statusText) { slot.statusText.destroy(); slot.statusText = undefined; }
      slot.ghostLabel.setAlpha(0.55);
      this.updateCloudProgress();
      this.selectedType = null;
      this.updateUI();
      this.emitState();
      this.emitSlots();
      this.emitObjective();
      this.updatePreviewArrows();
      return;
    }

    // ── Replace: occupying with a DIFFERENT type → swap it
    if (slot.placed) {
      this.placedCount--;
      if (slot.marker) { slot.marker.destroy(); slot.marker = undefined; }
      if (slot.markerText) { slot.markerText.destroy(); slot.markerText = undefined; }
      if (slot.statusText) { slot.statusText.destroy(); slot.statusText = undefined; }
    }

    const isCorrect = this.selectedType === slot.correct;
    slot.placed = this.selectedType;
    this.placedCount++;

    // Dim ghost
    slot.ghostLabel.setAlpha(0.15);

    // Marker — green outline if correct, red outline if wrong
    const color = this.selectedType === 'high' ? 0xd62828 : 0x1565c0;
    const letter = this.selectedType === 'high' ? 'H' : 'L';
    const marker = this.add
      .circle(slot.x, slot.y, 22, color, 0.85)
      .setStrokeStyle(3, isCorrect ? 0x06d6a0 : 0xd62828, 1)
      .setDepth(3)
      .setScale(0.01);
    this.tweens.add({
      targets: marker,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
    slot.marker = marker;

    const markerText = this.add
      .text(slot.x, slot.y, letter, {
        fontFamily: FONTS.DISPLAY,
        fontSize: '16px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setScale(0.01);
    this.tweens.add({
      targets: markerText,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
    slot.markerText = markerText;

    // ✓ / ✗ status above the slot
    const statusText = this.add
      .text(slot.x, slot.y - 34, isCorrect ? '✓' : '✗', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '18px',
        color: isCorrect ? '#06D6A0' : '#FF5252',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(4.5);
    slot.statusText = statusText;

    // ── Instant feedback FX ──
    this.playPlaceBurst(slot.x, slot.y, this.selectedType);
    if (isCorrect) {
      // Combo climb — each correct placement stacks a multiplier
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboScore += 50 * this.combo;
      this.showCombo();
      this.playCorrectTone(this.combo);
      this.cloudHop();

      const ring = this.add
        .circle(slot.x, slot.y, 10, 0x000000, 0)
        .setStrokeStyle(3, 0x06d6a0, 0.9)
        .setDepth(5);
      this.tweens.add({
        targets: ring,
        radius: 40,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy()
      });
      this.spawnFloatText(
        slot.x,
        slot.y - 52,
        `CORRECT! +${50 * this.combo}`,
        '#06D6A0'
      );
    } else {
      // Wrong → combo broken + red flash + screen shake + cloud slides back
      this.combo = 0;
      this.hideCombo();
      this.playWrongTone();
      this.cloudFlash();
      this.cameras.main.shake(180, 0.004);
      const xfl = this.add
        .circle(slot.x, slot.y, 30, 0xd62828, 0.15)
        .setStrokeStyle(2, 0xd62828, 0.4)
        .setDepth(5)
        .setScale(0.01);
      this.tweens.add({
        targets: xfl,
        scale: 1.3,
        duration: 300,
        yoyo: true,
        repeat: 1,
        onComplete: () => xfl.destroy()
      });
      this.spawnFloatText(slot.x, slot.y - 52, 'WRONG! Tap again', '#FF5252');
    }

    // Cloud glides forward per correct slot, slides back on a wrong one
    this.updateCloudProgress();

    this.selectedType = null;
    this.updateUI();
    this.emitState();
    this.emitSlots();
    this.emitObjective();
    this.updatePreviewArrows();
  }

  // ─────────────────────────────────
  //  START WIND
  // ─────────────────────────────────

  private spawnWindStream() {
    if (this.isComplete || !this.gameStarted) return;
    const y = Phaser.Math.Between(140, 500);
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -160 : GAME_WIDTH + 160;
    const endX = fromLeft ? GAME_WIDTH + 160 : -160;

    const stream = this.add
      .image(startX, y, 'wind_stream_s3')
      .setDepth(0.5)
      .setAlpha(0);

    const scale = Phaser.Math.FloatBetween(0.12, 0.28);
    stream.setScale(scale);
    if (this.cloud.x > GAME_WIDTH / 2) stream.setFlipX(fromLeft);

    const driftY = y + Phaser.Math.Between(-50, 50);
    const duration = Phaser.Math.Between(5000, 9000);

    this.tweens.add({
      targets: stream,
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.1, 0.25) },
      duration: 800,
      ease: 'Sine.easeIn'
    });
    this.tweens.add({
      targets: stream,
      x: endX,
      y: driftY,
      alpha: 0,
      duration,
      ease: 'Sine.easeInOut',
      delay: 700,
      onComplete: () => stream.destroy()
    });
  }

  private playWindGustBurst(hSlots: SlotData[], lSlots: SlotData[]) {
    // Spawn wind_gust_effect images along H→L paths
    hSlots.forEach(h => {
      const nearest = lSlots.reduce((a, b) =>
        Phaser.Math.Distance.Between(h.x, h.y, a.x, a.y) <
        Phaser.Math.Distance.Between(h.x, h.y, b.x, b.y)
          ? a
          : b
      );
      const mx = (h.x + nearest.x) / 2;
      const my = (h.y + nearest.y) / 2;

      // Gust burst at midpoint — scale up fast, then hold visible, then fade
      const gust = this.add
        .image(mx, my, 'wind_gust_effect')
        .setDepth(3)
        .setScale(0.01)
        .setAlpha(1)
        .setRotation(Math.atan2(nearest.y - h.y, nearest.x - h.x));
      // Quick scale-in
      this.tweens.add({
        targets: gust,
        scale: Phaser.Math.FloatBetween(0.08, 0.15),
        duration: 150,
        ease: 'Back.easeOut'
      });
      // Hold then fade out
      this.tweens.add({
        targets: gust,
        alpha: 0,
        delay: 400,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => gust.destroy()
      });

      // Small wind_particles along the path — brighter, more visible
      for (let i = 0; i < 5; i++) {
        const t = Phaser.Math.FloatBetween(0.1, 0.9);
        const px = Phaser.Math.Linear(h.x, nearest.x, t);
        const py = Phaser.Math.Linear(h.y, nearest.y, t);
        const p = this.add
          .image(px, py, 'wind_particles')
          .setDepth(3)
          .setScale(Phaser.Math.FloatBetween(0.06, 0.12))
          .setAlpha(0.8)
          .setRotation(Math.random() * Math.PI * 2);
        this.tweens.add({
          targets: p,
          alpha: 0,
          scale: 0.01,
          duration: Phaser.Math.Between(500, 800),
          delay: i * 80,
          ease: 'Sine.easeOut',
          onComplete: () => p.destroy()
        });
      }
    });
  }

  private startWind() {
    if (!this.roundActive || this.isComplete || this.placedCount < 6) return;
    this.roundActive = false;
    this.updateUI();
    this.emitState();

    const isCorrect = this.slots.every(s => s.placed === s.correct);
    if (isCorrect) this.onCorrect();
    else this.onWrong();
  }

  private onCorrect() {
    // Gust sound + happy cloud bounce as the wind rises
    this.playWhoosh();
    if (this.cloud) {
      this.tweens.add({
        targets: this.cloud,
        y: TARGET_Y - 14,
        duration: 160,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    // Combo bonus summary
    this.hideCombo();
    if (this.comboScore > 0) {
      this.spawnFloatText(
        GAME_WIDTH / 2,
        300,
        `🔥 Combo bonus earned: +${this.comboScore}`,
        '#FFD166'
      );
    }

    // Green flash on all slots
    this.slots.forEach(s => {
      const flash = this.add
        .circle(s.x, s.y, 28, 0x06d6a0, 0.2)
        .setDepth(5)
        .setScale(0.01);
      this.tweens.add({ targets: flash, scale: 1.4, alpha: 0, duration: 500 });
    });

    // Wind arrows from H→L
    const hSlots = this.slots.filter(s => s.correct === 'high');
    const lSlots = this.slots.filter(s => s.correct === 'low');
    hSlots.forEach(h => {
      const nearest = lSlots.reduce((a, b) =>
        Phaser.Math.Distance.Between(h.x, h.y, a.x, a.y) <
        Phaser.Math.Distance.Between(h.x, h.y, b.x, b.y)
          ? a
          : b
      );
      this.drawWindArrow(h.x, h.y, nearest.x, nearest.y);
    });

    // Wind gust burst effects
    this.playWindGustBurst(hSlots, lSlots);

    // Move cloud toward target
    const progress = this.round / ROUNDS_TO_WIN;
    const targetX = Phaser.Math.Linear(140, TARGET_X, progress);
    this.tweens.add({
      targets: [this.cloud, this.cloudGlow],
      x: targetX,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.cloudGlow,
      alpha: { from: 0.3, to: 0.5 },
      duration: 1200,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // "Correct!" message
    const msg = this.add
      .text(GAME_WIDTH / 2, 530, '✅ Correct! Wind blows from High → Low!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '15px',
        color: '#06D6A0',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);
    this.tweens.add({
      targets: msg,
      alpha: 1,
      duration: 400,
      onComplete: () => {
        this.tweens.add({
          targets: msg,
          alpha: 0,
          delay: 1000,
          duration: 300,
          onComplete: () => msg.destroy()
        });
      }
    });

    // "Round X Complete!" message — cosmetic only, doesn't block clicks
    const trans = this.add
      .text(
        GAME_WIDTH / 2,
        220,
        `✅ Round ${this.round} Complete!\n☁️ ${Math.round((this.round / ROUNDS_TO_WIN) * 100)}% to Destination`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '20px',
          color: '#FFD166',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);
    this.tweens.add({
      targets: trans,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: trans,
          alpha: 0,
          delay: 2000,
          duration: 400,
          onComplete: () => trans.destroy()
        });
      }
    });

    this.drawProgress();

    // Show pattern review modal — the dismiss handler decides next step
    this.time.delayedCall(800, () => {
      this.game.events.emit(GAME_EVENTS.HUD_PATTERN_REVIEW, {
        round: this.round,
        totalRounds: ROUNDS_TO_WIN,
        pattern: this.currentPattern,
        type: 'correct'
      } satisfies HUDPatternReviewPayload);
    });
  }

  private onWrong() {
    this.awaitingReview = 'wrong';

    // Quick red flash on wrong slots (cosmetic only — modal will explain)
    this.slots.forEach(s => {
      if (s.placed !== s.correct) {
        const x = this.add
          .circle(s.x, s.y, 30, 0xd62828, 0.15)
          .setStrokeStyle(2, 0xd62828, 0.4)
          .setDepth(5)
          .setScale(0.01);
        this.tweens.add({
          targets: x,
          scale: 1.3,
          duration: 300,
          yoyo: true,
          repeat: 1,
          onComplete: () => x.destroy()
        });
      }
    });

    const msg = this.add
      .text(GAME_WIDTH / 2, 530, '❌ Check the modal for details!', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '14px',
        color: '#FF8A65',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setAlpha(0);
    this.tweens.add({
      targets: msg,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: msg,
          alpha: 0,
          delay: 1500,
          duration: 300,
          onComplete: () => msg.destroy()
        });
      }
    });

    // Build the player's placed array
    const placed: ('high' | 'low' | null)[] = this.slots.map(s => s.placed);

    // Show modal after brief delay
    this.time.delayedCall(700, () => {
      this.game.events.emit(GAME_EVENTS.HUD_PATTERN_REVIEW, {
        round: this.round,
        totalRounds: ROUNDS_TO_WIN,
        pattern: this.currentPattern,
        type: 'wrong',
        placed
      } satisfies HUDPatternReviewPayload);
    });
  }

  private drawWindArrow(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(3, 0x4fc3f7, 0.6);
    const dx = x2 - x1,
      dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = dx / len,
      ny = dy / len;
    g.lineBetween(x1, y1, x2, y2);
    const hl = 12,
      ha = 0.4;
    g.lineBetween(
      x2,
      y2,
      x2 - hl * (nx * Math.cos(ha) - ny * Math.sin(ha)),
      y2 - hl * (nx * Math.sin(ha) + ny * Math.cos(ha))
    );
    g.lineBetween(
      x2,
      y2,
      x2 - hl * (nx * Math.cos(ha) + ny * Math.sin(ha)),
      y2 - hl * (-nx * Math.sin(ha) + ny * Math.cos(ha))
    );
    this.tweens.add({
      targets: g,
      alpha: { from: 0, to: 0.85 },
      duration: 400
    });
    this.windArrows.push(g);
  }

  /** Draw live preview arrows from placed H → L as the player builds the pattern */
  private updatePreviewArrows() {
    // Clear old preview arrows
    this.previewArrows.forEach(a => a.destroy());
    this.previewArrows = [];

    const placedH = this.slots.filter(s => s.placed === 'high');
    const placedL = this.slots.filter(s => s.placed === 'low');
    if (placedH.length === 0 || placedL.length === 0) return;

    // For each H, find the nearest L and draw a visible arrow
    placedH.forEach(h => {
      const nearest = placedL.reduce((a, b) =>
        Phaser.Math.Distance.Between(h.x, h.y, a.x, a.y) <
        Phaser.Math.Distance.Between(h.x, h.y, b.x, b.y)
          ? a
          : b
      );

      const dx = nearest.x - h.x,
        dy = nearest.y - h.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 20) return;
      const nx = dx / len,
        ny = dy / len;
      const R = 27; // circle radius — arrow stops at edge, not center

      // Start at H circle edge, end at L circle edge
      const x1 = h.x + nx * R;
      const y1 = h.y + ny * R;
      const x2 = nearest.x - nx * R;
      const y2 = nearest.y - ny * R;

      // ── Arrow line at depth 2 ──
      const g = this.add.graphics().setDepth(2);
      g.lineStyle(3, 0x4fc3f7, 0.65);
      g.lineBetween(x1, y1, x2, y2);

      // Solid arrowhead at the edge of the L circle
      const hl = 13,
        ha = 0.45;
      g.lineStyle(3, 0x4fc3f7, 0.8);
      g.lineBetween(
        x2,
        y2,
        x2 - hl * (nx * Math.cos(ha) - ny * Math.sin(ha)),
        y2 - hl * (nx * Math.sin(ha) + ny * Math.cos(ha))
      );
      g.lineBetween(
        x2,
        y2,
        x2 - hl * (nx * Math.cos(ha) + ny * Math.sin(ha)),
        y2 - hl * (-nx * Math.sin(ha) + ny * Math.cos(ha))
      );

      // Fade in
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 300 });

      this.previewArrows.push(g);

      // ── Animated wind puffs flowing along the arrow ──
      for (let p = 0; p < 3; p++) {
        const puff = this.add
          .circle(x1, y1, 4, 0xffffff, 0.7)
          .setDepth(2.2)
          .setScale(0.01);
        // Pop in
        this.tweens.add({
          targets: puff,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut'
        });
        // Travel from H edge → L edge with fade
        this.tweens.add({
          targets: puff,
          x: x2,
          y: y2,
          alpha: 0,
          duration: 1400,
          delay: p * 450,
          repeat: -1,
          onRepeat: () => {
            puff.setPosition(x1, y1).setAlpha(0.7);
          }
        });
        this.previewArrows.push(puff);
      }
    });
  }

  private drawProgress() {
    this.progressBar.clear();
    const x = 20,
      y = 100,
      w = 180,
      h = 10;
    this.progressBar.fillStyle(0x000000, 0.4);
    this.progressBar.fillRoundedRect(x, y, w, h, 5);
    this.progressBar.lineStyle(1, 0x4a6a7a, 0.2);
    this.progressBar.strokeRoundedRect(x, y, w, h, 5);
    const fill = (this.round / ROUNDS_TO_WIN) * (w - 4);
    if (fill > 0) {
      this.progressBar.fillStyle(0xffd166, 0.7);
      this.progressBar.fillRect(x + 2, y + 1, fill, h - 2);
    }
    // Label
    this.add
      .text(
        x + w + 8,
        y + 6,
        `☁️ ${Math.round((this.round / ROUNDS_TO_WIN) * 100)}%`,
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '10px',
          color: '#FFD166',
          stroke: '#000000',
          strokeThickness: 2
        }
      )
      .setDepth(5);
  }

  // ─────────────────────────────────
  //  INTRO & FLOW
  // ─────────────────────────────────

  private showIntroOverlay() {
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INTRO, {
      levelId: 'pressure',
      badge: '🌀 LEVEL 3',
      title: 'Air Pressure',
      subtitle: 'Guide the cloud home — 3 rounds that get harder!',
      mechanics: [
        { icon: '👻', text: 'ROUND 1 — the letters are shown. Watch and learn!' },
        { icon: '🧠', text: 'ROUND 2 — memorize the pattern (2-second peek only!)' },
        { icon: '💡', text: 'ROUND 3 — solve it yourself using the Hint button!' },
        { icon: '👆', text: 'Tap H (▲ red) or L (▼ blue), then tap a circle to place it' },
        { icon: '✅', text: 'Green = correct (cloud sails forward) · Red = wrong (fix it!)' },
        { icon: '🔥', text: 'Chain correct answers to build a COMBO and earn bonus points!' },
        { icon: '💨', text: 'All 6 correct → START WIND — wind blows High → Low!' },
        { icon: '🎯', text: '3 correct rounds carry the cloud all the way home!' }
      ]
    } satisfies HUDLevelIntroPayload);
    this.game.events.once(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
  }

  private startGame = () => {
    this.gameStarted = true;
    this.newRound();
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Air Pressure',
      description: 'Match H/L with instant feedback — wind blows High → Low!'
    } satisfies HUDLevelInfoPayload);
    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.game.events.on(GAME_EVENTS.HUD_PATTERN_DISMISS, this.onPatternDismiss);
    this.emitObjective();

    // Spawn ambient wind streams
    this.spawnWindStream();
    this.windStreamTimer = this.time.addEvent({
      delay: 3000,
      callback: () => {
        if (!this.isComplete) this.spawnWindStream();
      },
      loop: true
    });

    this.time.addEvent({
      delay: 1000,
      callback: () => this.onTick(),
      loop: true
    });
  };

  private onTick() {
    if (this.isComplete || !this.gameStarted) return;
    this.timeRemaining--;
    this.game.events.emit(GAME_EVENTS.HUD_TIMER, {
      remaining: this.timeRemaining,
      total: TOTAL_TIME
    } satisfies HUDTimerPayload);
    if (this.timeRemaining <= 0) this.failLevel();
  }

  private emitObjective() {
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: `Round ${this.round}/${ROUNDS_TO_WIN} — fill all H/L slots`,
      progress: this.placedCount,
      target: 6
    } satisfies HUDObjectivePayload);
  }

  private completeLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    playChime(this, 'large');
    const score =
      2000 +
      Math.round((this.timeRemaining / TOTAL_TIME) * 500) +
      this.comboScore +
      this.bestCombo * 100;
    const stars = GameManager.getStars(score, 2500);
    GameManager.getInstance().completeLevel(
      'pressure',
      score,
      stars,
      TOTAL_TIME - this.timeRemaining
    );
    const p = JSON.parse(localStorage.getItem('unos_progress') || '{}');
    p['pressure'] = {
      completed: true,
      bestScore: Math.max(p['pressure']?.bestScore ?? 0, score),
      bestTime: Math.min(
        p['pressure']?.bestTime ?? 999,
        TOTAL_TIME - this.timeRemaining
      ),
      stars: Math.max(p['pressure']?.stars ?? 0, stars),
      attempts: (p['pressure']?.attempts ?? 0) + 1,
      factsUnlocked: ['fact_pressure']
    };
    localStorage.setItem('unos_progress', JSON.stringify(p));

    this.cameras.main.flash(600, 255, 255, 255);
    this.cameras.main.shake(300, 0.003);
    const vt = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 30,
        '🌪️ Cloud Reached Destination!',
        {
          fontFamily: FONTS.DISPLAY,
          fontSize: '28px',
          color: '#FFD166',
          stroke: '#000000',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);
    this.tweens.add({ targets: vt, alpha: 1, duration: 500 });

    // Celebration particles
    for (let i = 0; i < 12; i++)
      this.time.delayedCall(i * 50, () => {
        const p = this.add
          .circle(
            TARGET_X + Phaser.Math.Between(-40, 40),
            TARGET_Y + Phaser.Math.Between(-20, 20),
            Phaser.Math.Between(3, 6),
            0xffd166,
            0.5
          )
          .setDepth(10);
        this.tweens.add({
          targets: p,
          scale: 2,
          alpha: 0,
          duration: 600,
          onComplete: () => p.destroy()
        });
      });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete',
      title: 'Destination Reached!',
      subtitle: 'High & Low pressure guided the cloud across the ocean',
      score,
      stars,
      levelId: 'pressure',
      timeUsed: TOTAL_TIME - this.timeRemaining,
      factsUnlocked: ['fact_pressure']
    } satisfies HUDResultPayload);
  }

  private failLevel() {
    if (this.isComplete) return;
    this.isComplete = true;
    playBuzz(this);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Time's Up!", {
        fontFamily: FONTS.DISPLAY,
        fontSize: '32px',
        color: '#D62828',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'fail',
      title: "Time's Up!",
      subtitle: 'Try again — the ghost letters show the pattern',
      score: 0,
      stars: 0,
      levelId: 'pressure',
      timeUsed: TOTAL_TIME,
      factsUnlocked: []
    } satisfies HUDResultPayload);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private onPatternDismiss = () => {
    if (this.awaitingReview === 'wrong') {
      // Wrong → reset current round for retry
      this.awaitingReview = null;
      this.slots.forEach(s => {
        s.placed = null;
        s.ghostLabel.setAlpha(0.55);
        s.marker = undefined;
        s.markerText = undefined;
        if (s.statusText) { s.statusText.destroy(); s.statusText = undefined; }
      });
      this.placedCount = 0;
      // Destroy placed markers ONLY (ghost labels at depth 1.5 are SAFE)
      this.children.list.slice().forEach(c => {
        const o = c as any;
        if (
          o.type === 'Text' &&
          o.active &&
          o.depth === 4 &&
          (o.text === 'H' || o.text === 'L')
        )
          o.destroy();
      });
      this.children.list.slice().forEach(c => {
        const o = c as any;
        if (
          o.type === 'Arc' &&
          o.active &&
          o.depth === 3 &&
          (o.fillColor === 0xd62828 || o.fillColor === 0x1565c0)
        )
          o.destroy();
      });
      this.roundActive = true;
      this.emitObjective();
      this.updateUI();
      this.emitState();
      this.emitSlots();
      return;
    }

    // Correct → advance to next round or complete
    this.awaitingReview = null;
    if (this.round >= ROUNDS_TO_WIN) {
      this.completeLevel();
    } else {
      this.newRound();
    }
  };

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.game.events.off(GAME_EVENTS.HUD_INTRO_DISMISS, this.startGame);
    this.game.events.off(
      GAME_EVENTS.HUD_PATTERN_DISMISS,
      this.onPatternDismiss
    );
    this.game.events.off(GAME_EVENTS.HUD_PRESSURE_SELECT, this.onReactSelect);
    this.game.events.off(GAME_EVENTS.HUD_PRESSURE_START, this.onReactStart);
    this.destroyHintButton();
    if (this.windStreamTimer) this.windStreamTimer.remove();
  }
}
