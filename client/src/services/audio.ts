import { Howl, Howler } from 'howler';

type SoundId = 'click' | 'hover' | 'success' | 'fail' | 'vapor' | 'thunder' | 'wave_crash' | 'complete' | 'bgm_menu' | 'bgm_game';

interface SoundDef {
  src: string;
  volume?: number;
  loop?: boolean;
  sprite?: Record<string, [number, number]>;
}

const SOUND_MAP: Record<SoundId, SoundDef> = {
  click: { src: '/audio/click.mp3', volume: 0.5 },
  hover: { src: '/audio/hover.mp3', volume: 0.3 },
  success: { src: '/audio/success.mp3', volume: 0.7 },
  fail: { src: '/audio/fail.mp3', volume: 0.6 },
  vapor: { src: '/audio/vapor.mp3', volume: 0.5 },
  thunder: { src: '/audio/thunder.mp3', volume: 0.8 },
  wave_crash: { src: '/audio/wave-crash.mp3', volume: 0.6 },
  complete: { src: '/audio/complete.mp3', volume: 0.7 },
  bgm_menu: { src: '/audio/bgm-menu.mp3', volume: 0.3, loop: true },
  bgm_game: { src: '/audio/bgm-game.mp3', volume: 0.25, loop: true },
};

class AudioService {
  private sounds = new Map<SoundId, Howl>();
  private currentBgm: SoundId | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private muted = false;

  init() {
    Howler.autoUnlock = true;

    for (const [id, def] of Object.entries(SOUND_MAP)) {
      const howl = new Howl({
        src: [def.src],
        volume: def.volume ?? 1,
        loop: def.loop ?? false,
        preload: false,
        onloaderror: (_id: number, err: unknown) => {
          console.warn(`[Audio] Failed to load "${id}":`, err);
        },
      });
      this.sounds.set(id as SoundId, howl);
    }
  }

  play(id: SoundId) {
    if (this.muted) return;
    const howl = this.sounds.get(id);
    if (!howl) return;

    // Check if it's BGM (loop)
    const def = SOUND_MAP[id];
    if (def?.loop) {
      // Stop current BGM
      if (this.currentBgm && this.currentBgm !== id) {
        this.stop(this.currentBgm);
      }
      this.currentBgm = id;
      howl.volume(this.musicVolume * this.masterVolume);
    } else {
      howl.volume(this.sfxVolume * this.masterVolume);
    }

    howl.play();
  }

  stop(id: SoundId) {
    const howl = this.sounds.get(id);
    if (!howl) return;
    howl.stop();
  }

  stopAll() {
    for (const [id] of this.sounds) {
      this.stop(id);
    }
    this.currentBgm = null;
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    this.updateVolumes();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    this.updateVolumes();
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    this.updateVolumes();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private updateVolumes() {
    for (const [id, howl] of this.sounds) {
      const def = SOUND_MAP[id];
      if (def?.loop) {
        howl.volume(this.musicVolume * this.masterVolume);
      } else {
        howl.volume(this.sfxVolume * this.masterVolume);
      }
    }
  }
}

export const audioService = new AudioService();
