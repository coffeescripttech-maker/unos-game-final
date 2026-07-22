import Phaser from 'phaser';
import { COLORS, FONTS } from '../constants';

/**
 * Reusable RetroUI progress bar (meter).
 * Used for heat meters, spin meters, health bars, etc.
 */
export class Meter extends Phaser.GameObjects.Container {
  private track!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private fillColor: number;
  private maxWidth: number;
  private currentProgress = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number = COLORS.OCEAN_LIGHT,
    labelText: string = '',
  ) {
    super(scene, x, y);
    this.fillColor = fillColor;
    this.maxWidth = width;

    // Label
    if (labelText) {
      this.label = scene.add.text(-width / 2, -height - 4, labelText, {
        fontFamily: FONTS.BODY,
        fontSize: '12px',
        color: '#FFFFFF',
      });
      this.add(this.label);
    }

    // Track (background)
    this.track = scene.add.rectangle(0, 0, width, height, COLORS.STORM_LIGHT);
    this.track.setStrokeStyle(2, COLORS.UI_BLACK, 1);
    this.add(this.track);

    // Fill (progress)
    this.fill = scene.add.rectangle(-width / 2 + 3, 0, 0, height - 6, fillColor);
    this.fill.setOrigin(0, 0.5);
    this.add(this.fill);

    scene.add.existing(this);
  }

  setProgress(value: number) {
    this.currentProgress = Phaser.Math.Clamp(value, 0, 1);
    const newWidth = (this.maxWidth - 6) * this.currentProgress;

    // Animate fill width
    if (this.scene) {
      this.scene.tweens.add({
        targets: this.fill,
        width: newWidth,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    } else {
      this.fill.width = newWidth;
    }

    // Color shift based on progress
    let color = this.fillColor;
    if (this.currentProgress > 0.8) {
      color = COLORS.WARNING_RED;
    } else if (this.currentProgress > 0.5) {
      color = COLORS.WARNING_ORANGE;
    } else if (this.currentProgress > 0.2) {
      color = COLORS.ACCENT_YELLOW;
    }
    this.fill.setFillStyle(color);
  }

  getProgress(): number {
    return this.currentProgress;
  }
}
