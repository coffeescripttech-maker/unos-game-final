import { audioService } from './audio';

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  colorblindMode: boolean;
}

const SETTINGS_KEY = 'unos_settings';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1,
  sfxVolume: 1,
  musicVolume: 1,
  muted: false,
  reducedMotion: false,
  colorblindMode: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore corrupt settings */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage errors */
  }
}

export function applySettings(settings: GameSettings) {
  audioService.setMasterVolume(settings.masterVolume);
  audioService.setSfxVolume(settings.sfxVolume);
  audioService.setMusicVolume(settings.musicVolume);

  if (audioService.isMuted() !== settings.muted) {
    audioService.toggleMute();
  }

  if (settings.reducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  } else {
    document.documentElement.classList.remove('reduced-motion');
  }

  if (settings.colorblindMode) {
    document.documentElement.classList.add('colorblind-mode');
  } else {
    document.documentElement.classList.remove('colorblind-mode');
  }
}
