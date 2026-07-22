import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, BarChart3, Star, BookOpen, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LevelProgress } from '@shared/types';

export default function DashboardPage() {
  const [progress, setProgress] = useState<Record<string, LevelProgress>>({});

  useEffect(() => {
    const raw = localStorage.getItem('unos_progress');
    if (raw) setProgress(JSON.parse(raw));
  }, []);

  const completedLevels = Object.values(progress).filter(p => p.completed).length;
  const totalScore = Object.values(progress).reduce((a, p) => a + (p.bestScore || 0), 0);
  const totalStars = Object.values(progress).reduce((a, p) => a + (p.stars || 0), 0);

  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <BarChart3 size={28} />
          Dashboard
        </h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="retro-card !bg-ocean-mid text-center">
          <Gamepad2 size={24} className="mx-auto text-ocean-surface mb-1" />
          <div className="font-display text-2xl text-white">{completedLevels}</div>
          <div className="font-body text-xs text-storm-light">Levels Done</div>
        </div>
        <div className="retro-card !bg-ocean-mid text-center">
          <Star size={24} className="mx-auto text-accent-yellow mb-1" />
          <div className="font-display text-2xl text-white">{totalStars} / 21</div>
          <div className="font-body text-xs text-storm-light">Total Stars</div>
        </div>
        <div className="retro-card !bg-ocean-mid text-center">
          <BarChart3 size={24} className="mx-auto text-accent-green mb-1" />
          <div className="font-display text-2xl text-white">{totalScore.toLocaleString()}</div>
          <div className="font-body text-xs text-storm-light">Total Score</div>
        </div>
        <div className="retro-card !bg-ocean-mid text-center">
          <BookOpen size={24} className="mx-auto text-accent-yellow mb-1" />
          <div className="font-display text-2xl text-white">
            {Object.values(progress).filter(p => p.factsUnlocked?.length).length}
          </div>
          <div className="font-body text-xs text-storm-light">Facts Found</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link to="/achievements" className="retro-btn bg-storm-dark text-white text-sm flex items-center gap-1.5">
          <Trophy size={16} />
          Achievements
        </Link>
        <Link to="/encyclopedia" className="retro-btn bg-storm-dark text-white text-sm flex items-center gap-1.5">
          <BookOpen size={16} />
          Encyclopedia
        </Link>
        <Link to="/multiplayer" className="retro-btn bg-storm-dark text-white text-sm flex items-center gap-1.5">
          <Users size={16} />
          Multiplayer
        </Link>
      </div>
    </div>
  );
}
