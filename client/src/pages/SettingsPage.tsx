import { Link } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, Volume2, Eye, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const raw = localStorage.getItem('unos_settings');
  const settings = raw ? JSON.parse(raw) : {};

  const groups = [
    { icon: Volume2, label: 'Audio', items: ['masterVolume', 'sfxVolume', 'musicVolume'] },
    { icon: Eye, label: 'Accessibility', items: ['colorblindMode', 'reducedMotion'] },
    { icon: Monitor, label: 'Display', items: [] },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <SettingsIcon size={28} />
          Settings
        </h1>
      </div>

      <div className="retro-card !bg-ocean-mid text-white max-w-xl">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <h2 className="font-display text-base text-ocean-surface mb-2 flex items-center gap-2">
              <group.icon size={18} />
              {group.label}
            </h2>
            {group.items.length > 0 ? (
              <div className="space-y-1.5 ml-6">
                {group.items.map((key) => (
                  <p key={key} className="font-body text-sm text-storm-light">
                    {key}:{' '}
                    <span className="text-accent-yellow font-display">
                      {String(settings[key] ?? '—')}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="font-body text-sm text-storm-light ml-6 italic">
                Coming in Phase 8
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
