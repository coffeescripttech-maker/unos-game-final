import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Eye,
  Monitor,
  Music,
  Gamepad2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, applySettings, type GameSettings } from '../services/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
    applySettings(settings);
  }, [settings]);

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleMute = () => update('muted', !settings.muted);

  const resetToDefaults = () => {
    const defaults: GameSettings = {
      masterVolume: 1,
      sfxVolume: 1,
      musicVolume: 1,
      muted: false,
      reducedMotion: false,
      colorblindMode: false,
    };
    setSettings(defaults);
  };

  const volumeGroups = [
    { key: 'masterVolume' as const, icon: Volume2, label: 'Master Volume' },
    { key: 'musicVolume' as const, icon: Music, label: 'Music Volume' },
    { key: 'sfxVolume' as const, icon: Gamepad2, label: 'SFX Volume' },
  ];

  return (
    <div className="settings-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link
          to="/"
          className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <SettingsIcon size={26} />
          Settings
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto space-y-3 sm:space-y-4 pb-4 pr-1">
          {/* Audio */}
          <section className="retro-card !bg-ocean-mid text-white !p-3 sm:!p-4">
            <h2 className="font-display text-base text-ocean-surface mb-3 flex items-center gap-2">
              <Volume2 size={18} />
              Audio
            </h2>

            <div className="space-y-3">
              {volumeGroups.map(({ key, icon: Icon, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-body text-sm flex items-center gap-1.5">
                      <Icon size={14} />
                      {label}
                    </label>
                    <span className="font-display text-xs text-accent-yellow w-10 text-right">
                      {Math.round(settings[key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings[key]}
                    onChange={e => update(key, parseFloat(e.target.value))}
                    className="settings-slider w-full"
                  />
                </div>
              ))}

              <button
                onClick={toggleMute}
                className={`retro-btn w-full mt-1 flex items-center justify-center gap-2 ${
                  settings.muted ? 'bg-warning-red' : 'bg-storm-dark'
                } text-white`}>
                {settings.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {settings.muted ? 'Unmute All Audio' : 'Mute All Audio'}
              </button>
            </div>
          </section>

          {/* Accessibility */}
          <section className="retro-card !bg-ocean-mid text-white !p-3 sm:!p-4">
            <h2 className="font-display text-base text-ocean-surface mb-3 flex items-center gap-2">
              <Eye size={18} />
              Accessibility
            </h2>

            <div className="space-y-2 sm:space-y-3">
              <Toggle
                label="Reduced Motion"
                description="Disable screen shake and heavy animations."
                checked={settings.reducedMotion}
                onChange={v => update('reducedMotion', v)}
              />
              <Toggle
                label="Colorblind Mode"
                description="Use higher-contrast colors for key UI elements."
                checked={settings.colorblindMode}
                onChange={v => update('colorblindMode', v)}
              />
            </div>
          </section>

          {/* Display */}
          <section className="retro-card !bg-ocean-mid text-white !p-3 sm:!p-4">
            <h2 className="font-display text-base text-ocean-surface mb-1 flex items-center gap-2">
              <Monitor size={18} />
              Display
            </h2>
            <p className="font-body text-sm text-storm-light ml-6">
              Fullscreen toggle is available on the main menu and in-game HUD.
            </p>
          </section>

          {/* Reset */}
          <div className="flex justify-end">
            <button
              onClick={resetToDefaults}
              className="retro-btn bg-storm-dark text-white text-xs">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-storm-dark border-2 border-black rounded-full transition-colors peer-checked:bg-accent-green" />
        <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </div>
      <div>
        <div className="font-body text-sm font-bold text-white group-hover:text-ocean-surface transition-colors">
          {label}
        </div>
        <div className="font-body text-xs text-storm-light">{description}</div>
      </div>
    </label>
  );
}
