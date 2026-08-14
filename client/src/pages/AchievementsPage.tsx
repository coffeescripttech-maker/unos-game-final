import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock, Star } from 'lucide-react';
import { ACHIEVEMENT_DEFS, EDUCATIONAL_FACTS, LEVEL_CONFIGS, LEVEL_ORDER } from '@shared/constants';
import type { LevelProgress } from '@shared/types';

export default function AchievementsPage() {
  const raw = localStorage.getItem('unos_progress');
  const progress: Record<string, LevelProgress> = raw ? JSON.parse(raw) : {};

  const completedLevels = LEVEL_ORDER.filter(id => progress[id]?.completed);
  const allCompleted = completedLevels.length === LEVEL_ORDER.length;
  const allThreeStar = LEVEL_ORDER.every(
    id => progress[id]?.completed && (progress[id]?.stars ?? 0) >= 3
  );

  const unlockedFacts = new Set<string>();
  for (const levelId of LEVEL_ORDER) {
    const lp = progress[levelId];
    if (lp?.factsUnlocked) {
      lp.factsUnlocked.forEach(f => unlockedFacts.add(f));
    }
  }
  const allFactsUnlocked = EDUCATIONAL_FACTS.every(f => unlockedFacts.has(f.id));

  const speedDemon = LEVEL_ORDER.some(id => {
    const lp = progress[id];
    const limit = LEVEL_CONFIGS[id]?.timeLimit ?? 0;
    if (!lp?.completed || !limit) return false;
    return (lp.bestTime ?? Infinity) < limit * 0.5;
  });

  const achievementStatus: Record<string, boolean> = {
    FIRST_STEPS: !!progress.tutorial?.completed,
    OCEAN_WARMER: !!progress.evaporation?.completed,
    CLOUD_ARCHITECT: !!progress.condensation?.completed,
    PRESSURE_MASTER: !!progress.pressure?.completed,
    SPIN_DOCTOR: !!progress.rotation?.completed,
    STORM_BIRTH: !!progress.typhoon?.completed,
    STORM_RIDER: !!progress.boss?.completed,
    FULL_CAMPAIGN: allCompleted,
    PERFECTIONIST: allThreeStar,
    SPEED_DEMON: speedDemon,
    NO_MISTAKES: false,
    FACT_COLLECTOR: allFactsUnlocked,
    STORM_SURVIVOR: false,
    SOCIAL_BUTTERFLY: false,
  };

  const unlockedCount = Object.values(achievementStatus).filter(Boolean).length;

  return (
    <div className="achievements-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Trophy size={26} />
          Achievements
        </h1>
        <span className="ml-3 sm:ml-4 font-body text-storm-light flex items-center gap-1 text-sm shrink-0">
          <Star size={14} />
          {unlockedCount} / {ACHIEVEMENT_DEFS.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-3xl w-full mx-auto space-y-2 sm:space-y-3 pb-4 pr-1">
          {ACHIEVEMENT_DEFS.map(ach => {
            const unlocked = achievementStatus[ach.id] ?? false;
            return (
              <div
                key={ach.id}
                className={`retro-card !p-3 sm:!p-4 ${
                  unlocked ? 'bg-ocean-mid text-white' : 'bg-storm-mid text-storm-light opacity-60'
                }`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {unlocked ? <Trophy size={22} className="text-accent-yellow" /> : <Lock size={22} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg">{ach.title}</h3>
                    <p className="font-body text-sm mt-0.5">{ach.description}</p>
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
    </div>
  );
}
