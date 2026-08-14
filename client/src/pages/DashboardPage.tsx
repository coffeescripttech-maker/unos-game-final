import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, BarChart3, Star, BookOpen, Trophy } from 'lucide-react';
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
    <div className="dashboard-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link to="/" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <BarChart3 size={26} />
          Dashboard
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto space-y-3 sm:space-y-4 pb-4 pr-1">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <Gamepad2 size={22} className="mx-auto text-ocean-surface mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{completedLevels}</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Levels Done</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <Star size={22} className="mx-auto text-accent-yellow mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{totalStars} / 21</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Total Stars</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <BarChart3 size={22} className="mx-auto text-accent-green mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{totalScore.toLocaleString()}</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Total Score</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <BookOpen size={22} className="mx-auto text-accent-yellow mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">
                {Object.values(progress).filter(p => p.factsUnlocked?.length).length}
              </div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Facts Found</div>
            </div>
          </div>

          {/* Quick links */}
          <div className="retro-card !bg-storm-dark">
            <h2 className="font-display text-base text-ocean-surface mb-3 flex items-center gap-2">
              <Trophy size={18} />
              Quick Links
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/achievements" className="retro-btn bg-ocean-mid text-white text-xs sm:text-sm flex items-center gap-1.5">
                <Trophy size={14} />
                Achievements
              </Link>
              <Link to="/encyclopedia" className="retro-btn bg-ocean-mid text-white text-xs sm:text-sm flex items-center gap-1.5">
                <BookOpen size={14} />
                Encyclopedia
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
