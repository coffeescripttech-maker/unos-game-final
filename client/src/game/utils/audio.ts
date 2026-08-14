import Phaser from 'phaser';

export function getAudioCtx(scene: Phaser.Scene): AudioContext | null {
  const sm = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = sm.context ?? null;
  if (!ctx || ctx.state === 'closed') return null;
  return ctx;
}

export function tone(
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

/** Short pop / bubble sound */
export function playPop(scene: Phaser.Scene, pitch: 'high' | 'mid' | 'low' = 'mid') {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  const base = pitch === 'high' ? 880 : pitch === 'low' ? 330 : 550;
  tone(ctx, base, 0.08, 'sine', 0.12);
  tone(ctx, base * 1.5, 0.06, 'sine', 0.08, 0.02);
}

/** Positive chime for collecting / succeeding */
export function playChime(scene: Phaser.Scene, rating: 'small' | 'medium' | 'large' = 'small') {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  if (rating === 'small') {
    tone(ctx, 880, 0.1, 'sine', 0.12);
    tone(ctx, 1320, 0.12, 'sine', 0.08, 0.05);
  } else if (rating === 'medium') {
    tone(ctx, 660, 0.12, 'triangle', 0.12);
    tone(ctx, 990, 0.14, 'triangle', 0.1, 0.08);
    tone(ctx, 1320, 0.16, 'sine', 0.08, 0.14);
  } else {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => tone(ctx, n, 0.22, 'triangle', 0.12, i * 0.1));
  }
}

/** Whoosh / gust sound */
export function playWhoosh(scene: Phaser.Scene, intensity: number = 0.5) {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  const vol = 0.04 + intensity * 0.08;
  for (let i = 0; i < 5; i++) {
    tone(ctx, 500 - i * 80, 0.1, 'sawtooth', vol, i * 0.04);
  }
}

/** Low buzz / fail sound */
export function playBuzz(scene: Phaser.Scene) {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  tone(ctx, 160, 0.2, 'sawtooth', 0.12);
  tone(ctx, 110, 0.25, 'square', 0.1, 0.06);
}

/** Freeze / cool activation sound */
export function playFreeze(scene: Phaser.Scene) {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  tone(ctx, 660, 0.12, 'sine', 0.1);
  tone(ctx, 990, 0.16, 'triangle', 0.08, 0.06);
  tone(ctx, 1320, 0.2, 'sine', 0.06, 0.12);
}

/** Warm / heat activation sound */
export function playHeat(scene: Phaser.Scene) {
  const ctx = getAudioCtx(scene);
  if (!ctx) return;
  tone(ctx, 330, 0.14, 'triangle', 0.12);
  tone(ctx, 440, 0.16, 'triangle', 0.1, 0.06);
  tone(ctx, 550, 0.18, 'sine', 0.08, 0.1);
}
