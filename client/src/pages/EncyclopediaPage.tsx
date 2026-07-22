import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Lock, Unlock } from 'lucide-react';
import { EDUCATIONAL_FACTS } from '@shared/constants';

const LEVEL_TITLES: Record<string, string> = {
  fact_tutorial: 'What is a Typhoon?',
  fact_evaporation: 'Ocean Heat & Evaporation',
  fact_condensation: 'Cloud Formation & Latent Heat',
  fact_pressure: 'Pressure Systems & Wind',
  fact_rotation: 'The Coriolis Effect',
  fact_typhoon: 'Typhoon Anatomy',
  fact_boss: 'Category 5 Storms',
};

export default function EncyclopediaPage() {
  const raw = localStorage.getItem('unos_progress');
  const progress = raw ? JSON.parse(raw) : {};

  const unlockedFacts: string[] = [];
  for (const levelId of ['tutorial', 'evaporation', 'condensation', 'pressure', 'rotation', 'typhoon', 'boss']) {
    if (progress[levelId]?.completed) {
      const config = progress[levelId];
      if (config.factsUnlocked) unlockedFacts.push(...config.factsUnlocked);
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <BookOpen size={28} />
          Encyclopedia
        </h1>
        <span className="ml-4 font-body text-storm-light text-sm">
          {unlockedFacts.length} / {EDUCATIONAL_FACTS.length} facts
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {EDUCATIONAL_FACTS.map((fact) => {
          const unlocked = unlockedFacts.includes(fact.id);
          const title = LEVEL_TITLES[fact.id] || fact.levelId;

          return (
            <div
              key={fact.id}
              className={`retro-card ${
                unlocked
                  ? 'bg-ocean-mid text-white border-accent-yellow/30'
                  : 'bg-storm-mid text-storm-light opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {unlocked ? <Unlock size={24} className="text-accent-green" /> : <Lock size={24} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg">{title}</h3>
                    <span className="font-body text-[10px] uppercase tracking-wider text-storm-light">
                      {fact.levelId}
                    </span>
                  </div>

                  {unlocked ? (
                    <>
                      <p className="font-body text-sm mt-2 leading-relaxed text-white/90">{fact.text}</p>
                      <p className="font-body text-xs mt-2 text-storm-light">— {fact.source}</p>
                    </>
                  ) : (
                    <p className="font-body text-sm mt-2 italic text-storm-light">
                      Complete the {fact.levelId} level to unlock this fact.
                    </p>
                  )}
                </div>

                <div
                  className={`font-display text-xs px-2 py-1 rounded flex items-center gap-1 ${
                    unlocked ? 'bg-accent-green text-storm-dark' : 'bg-storm-dark text-storm-light'
                  }`}
                >
                  {unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                  {unlocked ? 'UNLOCKED' : 'LOCKED'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
