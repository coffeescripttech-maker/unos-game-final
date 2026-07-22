import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock, Star } from 'lucide-react';
import { ACHIEVEMENT_DEFS } from '@shared/constants';

export default function AchievementsPage() {
  const raw = localStorage.getItem('unos_progress');
  const progress = raw ? JSON.parse(raw) : {};

  const unlockedAchievements: string[] = [];
  if (progress.tutorial?.completed) unlockedAchievements.push('FIRST_STEPS');
  if (progress.evaporation?.completed) unlockedAchievements.push('OCEAN_WARMER');
  if (progress.condensation?.completed) unlockedAchievements.push('CLOUD_ARCHITECT');
  if (progress.pressure?.completed) unlockedAchievements.push('PRESSURE_MASTER');
  if (progress.rotation?.completed) unlockedAchievements.push('SPIN_DOCTOR');

  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Trophy size={28} />
          Achievements
        </h1>
        <span className="ml-4 font-body text-storm-light flex items-center gap-1">
          <Star size={14} />
          {unlockedAchievements.length} / {ACHIEVEMENT_DEFS.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ACHIEVEMENT_DEFS.map((ach) => {
          const unlocked = unlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`retro-card ${unlocked ? 'bg-ocean-mid text-white' : 'bg-storm-mid text-storm-light opacity-60'}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5">
                  {unlocked ? <Trophy size={24} className="text-accent-yellow" /> : <Lock size={24} />}
                </span>
                <div>
                  <h3 className="font-display text-lg">{ach.title}</h3>
                  <p className="font-body text-sm mt-1">{ach.description}</p>
                  <p className="font-body text-xs mt-1 text-storm-light">
                    {unlocked ? '✓ Unlocked' : ach.condition} · {ach.rewardXP} XP
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
