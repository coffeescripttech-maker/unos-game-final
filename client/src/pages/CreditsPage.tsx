import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Code2, BookOpen, Music, Users } from 'lucide-react';

const CREDITS = [
  { role: 'Project Lead', name: 'Team UNOS', icon: Users },
  { role: 'Game Design', name: 'Capstone Development Team', icon: Code2 },
  { role: 'Development', name: 'Phaser 3 + React + TypeScript', icon: Code2 }
  // { role: 'Art Direction', name: 'Neo-Brutalist RetroUI', icon: Code2 },
  // { role: 'Educational Content', name: 'NOAA, NASA Earth Observatory, UCAR', icon: BookOpen },
  // { role: 'Sound Design', name: 'Howler.js', icon: Music },
  // { role: 'Special Thanks', name: 'Instructors & Advisors', icon: Heart },
];

export default function CreditsPage() {
  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto items-center justify-center">
      <div className="retro-card max-w-md w-full text-center !bg-storm-dark relative">
        {/* Back button */}
        <Link
          to="/"
          className="absolute top-3 left-3 retro-btn bg-storm-mid text-white text-xs !px-2 !py-1 flex items-center gap-1">
          <ArrowLeft size={14} />
          Back
        </Link>

        {/* Logo */}
        <div
          className="font-display text-4xl text-accent-yellow mb-1 mt-4"
          style={{ textShadow: '3px 3px 0px #000000' }}>
          UNOS
        </div>
        <p className="font-display text-base text-ocean-surface mb-6">
          Birth of the Typhoon
        </p>

        <div className="space-y-4 mb-8">
          {CREDITS.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className="flex items-center gap-3 justify-center">
                <Icon size={16} className="text-accent-yellow shrink-0" />
                <div>
                  <p className="font-body text-xs text-storm-light uppercase tracking-wider text-left">
                    {item.role}
                  </p>
                  <p className="font-body text-sm text-white text-left">
                    {item.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-3 border-black/30 pt-4 mb-6">
          <p className="font-body text-xs text-storm-light">
            A Capstone Project — {new Date().getFullYear()}
          </p>
          <p className="font-body text-xs text-storm-light mt-1 flex items-center justify-center gap-1">
            Built with <Heart size={12} className="text-warning-red" /> for
            science education
          </p>
        </div>
      </div>
    </div>
  );
}
