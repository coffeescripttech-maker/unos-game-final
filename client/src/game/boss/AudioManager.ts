/**
 * Procedural audio manager using Web Audio API.
 * Generates wind, rain, engine, thunder, and UI sounds
 * without any external audio files.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Wind
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Rain
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;

  // Engine
  private engineNode: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Thunder
  private lastThunderTime = 0;

  private isInitialized = false;

  /** Initialize the audio context (must be called from user gesture) */
  init() {
    if (this.isInitialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.initWind();
      this.initRain();
      this.initEngine();
      this.isInitialized = true;
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  private createNoiseBuffer(duration: number, sampleRate: number): AudioBuffer {
    const length = sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Weighted noise for more natural sound
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private initWind() {
    if (!this.ctx || !this.masterGain) return;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.5;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    const buffer = this.createNoiseBuffer(4, this.ctx.sampleRate);
    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = buffer;
    this.windNode.loop = true;

    this.windNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windNode.start();
  }

  private initRain() {
    if (!this.ctx || !this.masterGain) return;
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'highpass';
    this.rainFilter.frequency.value = 2000;
    this.rainFilter.Q.value = 0.3;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    const buffer = this.createNoiseBuffer(2, this.ctx.sampleRate);
    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = buffer;
    this.rainNode.loop = true;

    this.rainNode.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    this.rainNode.start();
  }

  private initEngine() {
    if (!this.ctx || !this.masterGain) return;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'bandpass';
    this.engineFilter.frequency.value = 120;
    this.engineFilter.Q.value = 1.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    const buffer = this.createNoiseBuffer(1, this.ctx.sampleRate);
    this.engineNode = this.ctx.createBufferSource();
    this.engineNode.buffer = buffer;
    this.engineNode.loop = true;

    this.engineNode.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineNode.start();
  }

  /** Update wind volume (0-1) based on storm intensity */
  setWindIntensity(intensity: number) {
    if (!this.windGain) return;
    this.windGain.gain.linearRampToValueAtTime(
      intensity * 0.4,
      this.ctx?.currentTime! + 1,
    );
    if (this.windFilter) {
      this.windFilter.frequency.linearRampToValueAtTime(
        200 + intensity * 800,
        this.ctx?.currentTime! + 1,
      );
    }
  }

  /** Update rain volume (0-1) */
  setRainIntensity(intensity: number) {
    if (!this.rainGain) return;
    this.rainGain.gain.linearRampToValueAtTime(
      intensity * 0.35,
      this.ctx?.currentTime! + 1,
    );
  }

  /** Update engine sound based on speed (0-1) */
  setEngineSpeed(speed: number) {
    if (!this.engineGain || !this.engineFilter) return;
    this.engineGain.gain.linearRampToValueAtTime(
      0.02 + speed * 0.15,
      this.ctx?.currentTime! + 0.3,
    );
    this.engineFilter.frequency.linearRampToValueAtTime(
      80 + speed * 200,
      this.ctx?.currentTime! + 0.3,
    );
  }

  /** Play a thunder clap */
  playThunder() {
    const now = Date.now();
    if (now - this.lastThunderTime < 2000) return;
    this.lastThunderTime = now;
    if (!this.ctx || !this.masterGain) return;

    const duration = 1 + Math.random() * 1.5;
    const buffer = this.createNoiseBuffer(duration, this.ctx.sampleRate);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100 + Math.random() * 200;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 + Math.random() * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    source.stop(this.ctx.currentTime + duration + 0.1);
  }

  /** Play a collection chime */
  playCollect() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, this.ctx.currentTime);
    osc.frequency.setValueAtTime(659, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  /** Play engine start sound */
  playEngineStart() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  /** Play mission complete fanfare */
  playComplete() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + i * 0.15 + 0.05);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + i * 0.15);
      osc.stop(this.ctx!.currentTime + i * 0.15 + 0.6);
    });
  }

  /** Dispose and clean up */
  dispose() {
    this.windNode?.stop();
    this.rainNode?.stop();
    this.engineNode?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.isInitialized = false;
  }
}
