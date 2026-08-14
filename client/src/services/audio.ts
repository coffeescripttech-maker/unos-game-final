import { Howl, Howler } from 'howler';

type SoundId = 'click' | 'bgm_menu' | 'bgm_level';

interface SoundDef {
  src: string;
  volume?: number;
  loop?: boolean;
}

const SOUND_MAP: Record<SoundId, SoundDef> = {
  click: { src: '/assets/audio/button-click.mp3', volume: 0.6 },
  bgm_menu: { src: '/assets/audio/menu-theme.mp3', volume: 0.35, loop: true },
  bgm_level: { src: '/assets/audio/all-level-background-music.wav', volume: 0.3, loop: true },
};

class AudioService {
  private sounds = new Map<SoundId, Howl>();
  private currentBgm: SoundId | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private muted = false;
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;
    Howler.autoUnlock = true;

    for (const [id, def] of Object.entries(SOUND_MAP)) {
      const howl = new Howl({
        src: [def.src],
        volume: def.volume ?? 1,
        loop: def.loop ?? false,
        preload: def.loop ?? false,
        html5: true,
        onloaderror: (_id: number, err: unknown) => {
          console.warn(`[Audio] Failed to load "${id}":`, err);
        },
      });
      this.sounds.set(id as SoundId, howl);
    }
  }

  play(id: SoundId) {
    if (this.muted) return;
    this.init();
    const howl = this.sounds.get(id);
    if (!howl) return;

    const def = SOUND_MAP[id];
    if (def?.loop) {
      if (this.currentBgm && this.currentBgm !== id) {
        this.stop(this.currentBgm);
      }
      this.currentBgm = id;
      howl.volume(this.musicVolume * this.masterVolume);
      if (!howl.playing()) howl.play();
    } else {
      howl.volume(this.sfxVolume * this.masterVolume);
      howl.play();
    }
  }

  stop(id: SoundId) {
    const howl = this.sounds.get(id);
    if (!howl) return;
    howl.stop();
    if (this.currentBgm === id) this.currentBgm = null;
  }

  stopBgm() {
    if (this.currentBgm) {
      this.stop(this.currentBgm);
    }
  }

  stopAll() {
    for (const [id] of this.sounds) {
      this.stop(id as SoundId);
    }
    this.currentBgm = null;
  }

  playClick() {
    this.play('click');
  }

  playMenuBgm() {
    this.play('bgm_menu');
  }

  playLevelBgm() {
    this.play('bgm_level');
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.updateVolumes();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.updateVolumes();
  }

  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.updateVolumes();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private updateVolumes() {
    for (const [id, howl] of this.sounds) {
      const def = SOUND_MAP[id as SoundId];
      if (def?.loop) {
        howl.volume(this.musicVolume * this.masterVolume);
      } else {
        howl.volume(this.sfxVolume * this.masterVolume);
      }
    }
  }
}

export const audioService = new AudioService();
