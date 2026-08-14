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
    <div className="encyclopedia-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <BookOpen size={26} />
          Encyclopedia
        </h1>
        <span className="ml-3 sm:ml-4 font-body text-storm-light text-xs sm:text-sm shrink-0">
          {unlockedFacts.length} / {EDUCATIONAL_FACTS.length} facts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-3xl w-full mx-auto space-y-2 sm:space-y-3 pb-4 pr-1">
          {EDUCATIONAL_FACTS.map((fact) => {
            const unlocked = unlockedFacts.includes(fact.id);
            const title = LEVEL_TITLES[fact.id] || fact.levelId;

            return (
              <div
                key={fact.id}
                className={`retro-card !p-3 sm:!p-4 ${
                  unlocked
                    ? 'bg-ocean-mid text-white border-accent-yellow/30'
                    : 'bg-storm-mid text-storm-light opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {unlocked ? <Unlock size={20} className="text-accent-green" /> : <Lock size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base sm:text-lg truncate">{title}</h3>
                      <span className="font-body text-[10px] uppercase tracking-wider text-storm-light shrink-0">
                        {fact.levelId}
                      </span>
                    </div>

                    {unlocked ? (
                      <>
                        <p className="font-body text-sm mt-1 leading-relaxed text-white/90">{fact.text}</p>
                        <p className="font-body text-xs mt-1 text-storm-light">— {fact.source}</p>
                      </>
                    ) : (
                      <p className="font-body text-sm mt-1 italic text-storm-light">
                        Complete the {fact.levelId} level to unlock this fact.
                      </p>
                    )}
                  </div>

                  <div
                    className={`font-display text-[10px] px-2 py-1 rounded flex items-center gap-1 shrink-0 h-fit ${
                      unlocked ? 'bg-accent-green text-storm-dark' : 'bg-storm-dark text-storm-light'
                    }`}
                  >
                    {unlocked ? <Unlock size={10} /> : <Lock size={10} />}
                    {unlocked ? 'OPEN' : 'LOCKED'}
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
