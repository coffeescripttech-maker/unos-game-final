import Phaser from 'phaser';
import { SCENES } from '@shared/constants';
import { GAME_EVENTS } from '@shared/events';
import type { HUDTimerPayload, HUDObjectivePayload, HUDResultPayload, HUDLevelInfoPayload, HUDScorePayload, HUDWeatherPayload } from '@shared/events';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../constants';
import { GameManager } from '../managers/GameManager';

interface PressureCell {
  sprite: Phaser.GameObjects.Container;
  type: 'high' | 'low';
  gridX: number;
  gridY: number;
  placed: boolean;
  correct: boolean;
}

interface GridCell {
  x: number;
  y: number;
  correctType: 'high' | 'low' | null;
}

export class PressureScene extends Phaser.Scene {
  private gridCells: GridCell[][] = [];
  private cells: PressureCell[] = [];
  private dragCell: PressureCell | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private originalX = 0;
  private originalY = 0;
  private timeRemaining = 60;
  private totalTime = 60;
  private isComplete = false;
  private correctPlacements = 0;
  private totalPlacements = 0;
  private isobarGfx!: Phaser.GameObjects.Graphics;
  private windArrows: Phaser.GameObjects.Text[] = [];
  private feedbackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.PRESSURE });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    this.isComplete = false;
    this.cells = [];
    this.correctPlacements = 0;
    this.windArrows = [];
    this.dragCell = null;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(GAME_WIDTH / 2, 20, 'Air Pressure', {
      fontFamily: FONTS.DISPLAY,
      fontSize: '28px',
      color: '#FFD166',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 48, 'Place pressure cells onto the weather map', {
      fontFamily: FONTS.BODY,
      fontSize: '13px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Emit level info
    this.game.events.emit(GAME_EVENTS.HUD_LEVEL_INFO, {
      name: 'Air Pressure',
      description: 'Place pressure cells to create wind',
    } satisfies HUDLevelInfoPayload);
    this.emitObjective();

    // Feedback text (stays in-game)
    this.feedbackText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, '', {
      fontFamily: FONTS.BODY,
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Weather map
    this.createWeatherMap();

    // Isobar graphics
    this.isobarGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS);

    // Spawn draggable cells
    this.spawnCells();

    // Timer
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
        const placed = this.cells.filter(c => c.placed).length;
        const windSpeed = Math.round(5 + placed * 8 + this.correctPlacements * 3);
        this.game.events.emit(GAME_EVENTS.HUD_WEATHER, {
          temperature: 25,
          humidity: 60 + placed * 5,
          windSpeed,
          stormLevel: placed > 3 ? 2 : 1,
        } satisfies HUDWeatherPayload);

        if (this.timeRemaining <= 0) this.failLevel();
      },
      loop: true,
    });

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onDragStart(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onDragMove(pointer));
    this.input.on('pointerup', () => this.onDragEnd());

    this.game.events.on(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }

  private onContinue = () => {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
    this.scene.start(SCENES.WORLD_MAP);
  };

  private emitObjective() {
    const placed = this.cells.filter(c => c.placed).length;
    this.game.events.emit(GAME_EVENTS.HUD_OBJECTIVE, {
      text: 'Place pressure cells correctly',
      progress: placed,
      target: this.totalPlacements,
    } satisfies HUDObjectivePayload);
  }

  private createWeatherMap() {
    const mapX = 120;
    const mapY = 130;
    const cellW = 140;
    const cellH = 90;
    const rows = 3;
    const cols = 4;
    const mapGfx = this.add.graphics();

    const pattern: ('high' | 'low' | null)[][] = [
      ['high', 'high', null, 'low'],
      [null, 'high', 'low', 'low'],
      ['high', null, 'low', null],
    ];

    for (let r = 0; r < rows; r++) {
      this.gridCells[r] = [];
      for (let c = 0; c < cols; c++) {
        const cx = mapX + c * cellW + cellW / 2;
        const cy = mapY + r * cellH + cellH / 2;

        mapGfx.lineStyle(2, 0x4a6fa5, 0.6);
        mapGfx.strokeRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH);

        if (pattern[r][c] === 'high') mapGfx.fillStyle(0x8b0000, 0.15);
        else if (pattern[r][c] === 'low') mapGfx.fillStyle(0x00008b, 0.15);
        mapGfx.fillRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH);

        this.gridCells[r][c] = { x: cx, y: cy, correctType: pattern[r][c] };
      }
    }

    this.totalPlacements = pattern.flat().filter(p => p !== null).length;
  }

  private spawnCells() {
    const cellTypes: ('high' | 'low')[] = ['high', 'high', 'high', 'low', 'low', 'low'];
    Phaser.Utils.Array.Shuffle(cellTypes);

    const startX = 80;
    const startY = GAME_HEIGHT - 100;

    cellTypes.forEach((type, i) => {
      const cx = startX + i * 110 + 55;
      const cy = startY;

      const container = this.add.container(cx, cy);
      const bg = this.add.circle(0, 0, 24, type === 'high' ? 0x8b0000 : 0x00008b, 0.9);
      bg.setStrokeStyle(3, 0xffffff, 0.8);
      const label = this.add.text(0, 0, type === 'high' ? 'H' : 'L', {
        fontFamily: FONTS.DISPLAY,
        fontSize: '22px',
        color: '#FFFFFF',
      }).setOrigin(0.5);

      container.add([bg, label]);
      container.setSize(50, 50);
      container.setInteractive({ useHandCursor: true, draggable: false });
      container.setDepth(DEPTH.OVERLAY);

      this.cells.push({
        sprite: container,
        type,
        gridX: -1,
        gridY: -1,
        placed: false,
        correct: false,
      });
    });
  }

  private onDragStart(pointer: Phaser.Input.Pointer) {
    for (const cell of this.cells) {
      if (!cell.placed) continue;
      const bounds = cell.sprite.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.dragCell = cell;
        this.dragOffsetX = pointer.x - cell.sprite.x;
        this.dragOffsetY = pointer.y - cell.sprite.y;
        this.originalX = cell.sprite.x;
        this.originalY = cell.sprite.y;
        cell.placed = false;
        cell.sprite.setDepth(DEPTH.OVERLAY + 10);
        cell.sprite.setScale(1.2);
        this.emitObjective();
        return;
      }
    }

    for (const cell of this.cells) {
      if (cell.placed) continue;
      const bounds = cell.sprite.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.dragCell = cell;
        this.dragOffsetX = pointer.x - cell.sprite.x;
        this.dragOffsetY = pointer.y - cell.sprite.y;
        this.originalX = cell.sprite.x;
        this.originalY = cell.sprite.y;
        cell.sprite.setDepth(DEPTH.OVERLAY + 10);
        cell.sprite.setScale(1.2);
        return;
      }
    }
  }

  private onDragMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragCell) return;
    this.dragCell.sprite.x = pointer.x - this.dragOffsetX;
    this.dragCell.sprite.y = pointer.y - this.dragOffsetY;
  }

  private onDragEnd() {
    if (!this.dragCell) return;
    this.dragCell.sprite.setScale(1);
    this.dragCell.sprite.setDepth(DEPTH.OVERLAY);

    let snapped = false;
    for (let r = 0; r < this.gridCells.length; r++) {
      for (let c = 0; c < this.gridCells[r].length; c++) {
        const grid = this.gridCells[r][c];
        if (grid.correctType === null) continue;
        const dist = Phaser.Math.Distance.Between(
          this.dragCell!.sprite.x, this.dragCell!.sprite.y, grid.x, grid.y,
        );
        if (dist < 50) {
          const taken = this.cells.some(
            other => other !== this.dragCell && other.placed && other.gridX === c && other.gridY === r,
          );
          if (taken) continue;

          this.dragCell.sprite.x = grid.x;
          this.dragCell.sprite.y = grid.y;
          this.dragCell.gridX = c;
          this.dragCell.gridY = r;
          this.dragCell.placed = true;

          if (this.dragCell.type === grid.correctType) {
            this.correctPlacements++;
            this.feedbackText.setText('✓ Correct placement!').setColor('#06D6A0');
            for (let i = 0; i < 6; i++) {
              const p = this.add.circle(grid.x, grid.y, 3, 0x06d6a0, 0.8).setDepth(DEPTH.PARTICLES);
              this.tweens.add({
                targets: p, x: grid.x + Phaser.Math.Between(-20, 20),
                y: grid.y + Phaser.Math.Between(-40, -10), alpha: 0, duration: 600,
                onComplete: () => p.destroy(),
              });
            }
          } else {
            this.feedbackText.setText('✗ Wrong pressure type').setColor('#D62828');
            this.tweens.add({
              targets: this.dragCell.sprite, x: this.originalX, y: this.originalY,
              duration: 400, ease: 'Bounce',
              onComplete: () => { if (this.dragCell) { this.dragCell.placed = false; this.dragCell.gridX = -1; this.dragCell.gridY = -1; } },
            });
            snapped = true;
          }

          this.updateIsobars();
          this.emitObjective();
          this.checkCompletion();
          snapped = true;
          break;
        }
      }
    }

    if (!snapped) {
      this.tweens.add({ targets: this.dragCell.sprite, x: this.originalX, y: this.originalY, duration: 300 });
    }
    this.dragCell = null;
  }

  private updateIsobars() {
    this.isobarGfx.clear();
    const placedH = this.cells.filter(c => c.placed && c.type === 'high');
    const placedL = this.cells.filter(c => c.placed && c.type === 'low');
    if (placedH.length < 1 || placedL.length < 1) return;

    placedH.forEach(cell => {
      this.isobarGfx.lineStyle(2, 0xff6b6b, 0.3);
      this.isobarGfx.strokeCircle(cell.sprite.x, cell.sprite.y, 40);
      this.isobarGfx.strokeCircle(cell.sprite.x, cell.sprite.y, 60);
    });
    placedL.forEach(cell => {
      this.isobarGfx.lineStyle(2, 0x6db3e6, 0.3);
      this.isobarGfx.strokeCircle(cell.sprite.x, cell.sprite.y, 40);
      this.isobarGfx.strokeCircle(cell.sprite.x, cell.sprite.y, 60);
    });

    this.windArrows.forEach(a => a.destroy());
    this.windArrows = [];
    for (const h of placedH) {
      for (const l of placedL) {
        const angle = Phaser.Math.Angle.Between(h.sprite.x, h.sprite.y, l.sprite.x, l.sprite.y);
        const midX = (h.sprite.x + l.sprite.x) / 2;
        const midY = (h.sprite.y + l.sprite.y) / 2;
        const arrow = this.add.text(midX, midY, '→', {
          fontFamily: FONTS.BODY, fontSize: '20px', color: '#ffffff',
        }).setOrigin(0.5).setRotation(angle);
        this.windArrows.push(arrow);
      }
    }
  }

  private checkCompletion() {
    const allPlaced = this.cells.filter(c => c.placed).length;
    if (allPlaced >= this.totalPlacements) {
      const accuracy = this.correctPlacements / this.totalPlacements;
      if (accuracy >= 0.6) this.completeLevel(accuracy);
      else {
        this.feedbackText.setText('Too many wrong! Try adjusting placements.').setColor('#FFD166');
      }
    }
  }

  private completeLevel(accuracy: number) {
    if (this.isComplete) return;
    this.isComplete = true;

    const score = Math.round(2000 * accuracy) + Math.round(this.timeRemaining / this.totalTime * 300);
    const stars = GameManager.getStars(score, 2800);

    GameManager.getInstance().completeLevel('pressure', score, stars, this.totalTime - this.timeRemaining);
    const saved = localStorage.getItem('unos_progress');
    const progress = saved ? JSON.parse(saved) : {};
    const existing = progress['pressure'] || {};
    progress['pressure'] = {
      completed: true,
      bestScore: Math.max(existing.bestScore ?? 0, score),
      bestTime: Math.min(existing.bestTime ?? 999, this.totalTime - this.timeRemaining),
      stars: Math.max(existing.stars ?? 0, stars),
      attempts: (existing.attempts ?? 0) + 1,
      factsUnlocked: ['fact_pressure'],
    };
    localStorage.setItem('unos_progress', JSON.stringify(progress));

    this.cameras.main.flash(500, 255, 255, 255);

    const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Pressure Patterns Set!', {
      fontFamily: FONTS.DISPLAY, fontSize: '32px', color: '#06D6A0',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setAlpha(0);
    this.tweens.add({ targets: victoryText, alpha: 1, duration: 500 });

    this.game.events.emit(GAME_EVENTS.HUD_RESULT, {
      type: 'complete', title: 'Pressure Patterns Set!',
      subtitle: 'Wind is now flowing',
      score, stars, levelId: 'pressure',
      timeUsed: this.totalTime - this.timeRemaining,
      factsUnlocked: ['fact_pressure'],
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
      type: 'fail', title: 'Time\'s Up!', subtitle: 'Pressure cells not placed',
      score: 0, stars: 0, levelId: 'pressure',
      timeUsed: this.totalTime, factsUnlocked: [],
    });
  }

  shutdown() {
    this.game.events.off(GAME_EVENTS.HUD_CONTINUE, this.onContinue);
  }
}
