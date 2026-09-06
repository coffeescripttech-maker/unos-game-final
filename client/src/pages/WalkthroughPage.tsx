import { useNavigate } from 'react-router-dom';
import { LEVEL_ORDER, LEVEL_CONFIGS } from '@shared/constants';
import type { LevelId } from '@shared/types';
import { EDUCATIONAL_FACTS } from '@shared/constants';

const LEVEL_DETAILS: Record<LevelId, {
  emoji: string;
  icon: string;
  science: string;
  mechanics: string;
  researchGap: string;
}> = {
  tutorial: {
    emoji: '🔬',
    icon: '🔍',
    science: 'Introduces the research vessel and basic navigation. Students learn to pilot their vessel and understand the basic interface before entering the typhoon.',
    mechanics: 'WASD/Arrows to move, E to interact, Space to deploy buoy. Basic movement and collection mechanics.',
    researchGap: 'Addresses the need for an accessible onboarding experience that scaffolds complex meteorological concepts for Grade 8 learners.',
  },
  evaporation: {
    emoji: '🌊',
    icon: '☀️',
    science: 'Evaporation is the first stage of the water cycle. Heat from warm ocean water (26°C+) causes seawater to evaporate, forming water vapor — the energy source that fuels tropical cyclones.',
    mechanics: 'Click the sun to heat the ocean surface. Collect vapor bubbles that rise into the sky. The more heat applied, the more vapor forms — demonstrating the direct relationship between ocean temperature and storm fuel.',
    researchGap: 'Connects abstract evaporation concepts to real typhoon formation, helping learners visualize how warm ocean water becomes the storm\'s energy source.',
  },
  condensation: {
    emoji: '☁️',
    icon: '💧',
    science: 'As water vapor rises, it cools and condenses into clouds. This release of latent heat is what powers the storm\'s upward growth — the engine that transforms a warm ocean patch into towering cumulonimbus clouds.',
    mechanics: 'Guide vapor particles upward to form cloud clusters. Connect evaporation (bottom) to condensation (top) to complete the water cycle flow. Droplets merge as they cool.',
    researchGap: 'Visualizes the invisible condensation process — critical for understanding how heat release drives cloud development and storm intensification.',
  },
  pressure: {
    emoji: '🌬️',
    icon: '🌡️',
    science: 'Air pressure differences create wind. In a typhoon, warm air rises at the center creating a low-pressure zone, drawing in cooler air from the surroundings. The greater the pressure gradient, the stronger the winds.',
    mechanics: 'Place HIGH pressure (red) and LOW pressure (blue) systems. Watch as wind flows from HIGH → LOW. The pressure gradient determines wind speed — steeper gradient = stronger winds.',
    researchGap: 'Demonstrates the pressure-wind relationship that drives all weather systems, directly addressing how pressure differentials create the rotating wind field of a typhoon.',
  },
  rotation: {
    emoji: '🌀',
    icon: '🌀',
    science: 'The Coriolis effect — caused by Earth\'s rotation — gives typhoons their spin. In the Northern Hemisphere, air spirals COUNTER-CLOCKWISE (↺). In the Southern Hemisphere, it spirals CLOCKWISE (↻). Without this spin, typhoons cannot organize.',
    mechanics: 'Swipe/drag to create rotation. Answer hemisphere quiz questions: Northern Hemisphere = CCW, Southern Hemisphere = CW. Correct answers strengthen the storm\'s rotation.',
    researchGap: 'Directly teaches the Coriolis effect — a concept many learners struggle to visualize — by connecting Earth\'s rotation to cyclonic spin direction in each hemisphere.',
  },
  typhoon: {
    emoji: '⚡',
    icon: '🌪️',
    science: 'Typhoons form when five conditions align: (1) Warm ocean water ≥26.5°C, (2) Moist mid-troposphere, (3) Low wind shear, (4) Pre-existing disturbance, (5) Sufficient Coriolis force. Combining all four previous elements triggers formation. Stage pop-ups also show the PAGASA Tropical Cyclone Wind Signal (TCWS No. 1-5) equivalent of each intensity — the same warning system Filipino learners see in real PAGASA severe weather bulletins.',
    mechanics: 'Unlock elements one at a time: hold Ocean Heat in its target zone to trigger a science question — answer correctly to unlock Water Vapor, then Low Pressure, then Coriolis Spin (wrong answers reshuffle and let you retry; the timer pauses while reading). Balance all four elements in the green zone. When all thresholds are met simultaneously, the typhoon forms and intensifies through 5 stages.',
    researchGap: 'Integrates all previous level concepts into a cohesive typhoon formation model, directly addressing how individual scientific factors combine to create a real-world phenomenon.',
  },
  boss: {
    emoji: '🏆',
    icon: '🚤',
    science: 'The Assemble the Storm boss level combines all elements from Levels 1-5 into a complete, living typhoon. Players pilot a research vessel into the fully formed eyewall, experiencing the integrated effects of warm ocean evaporation, condensation-latent heat release, pressure-gradient winds, Coriolis-driven rotation, and the five-stage intensification — all assembled into one immersive 3D storm. This directly addresses the research question: how typhoons are affected by land masses and bodies of water. The storm intensifies over warm ocean water (Phases 1–4) but weakens as it approaches land — players experience this interactively when their vessel navigates near islands. Wind speed, wave height, and cloud density all decrease as land proximity increases, directly modeling the scientific fact that warm ocean fuel is cut off over land.',
    mechanics: 'Navigate through 4 storm phases of increasing intensity. Collect 4 weather buoys (Temperature, Humidity, Pressure, Wind Speed) by approaching and holding E. Deploy a weather buoy. Reach the Eye of the Typhoon. Each phase adds new hazards: waves → debris → lightning. Steer clear of islands — the storm weakens over land as warm ocean fuel is cut off.',
    researchGap: 'Directly answers the study\'s central research question — how typhoons are affected by land masses and bodies of water — by assembling all five scientific stages (evaporation, condensation, pressure, rotation, formation) into a single experiential boss fight. Players feel the storm intensify over warm water as it assembles into a complete typhoon, then witness and control the rapid weakening when the vessel nears land masses.',
  },
};

const SCIENCE_ICONS = {
  evaporation: '☀️💧',
  condensation: '💧☁️',
  pressure: '🌡️🌬️',
  rotation: '🌀🌍',
  typhoon: '🌪️⚡',
  boss: '🚤⛈️',
  tutorial: '🔍🔬',
};

export default function WalkthroughPage() {
  const navigate = useNavigate();

  return (
    <div className="walkthrough-page w-full h-screen bg-[#F2F7FC] text-storm-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 z-50 hud-topbar flex items-center justify-between px-5 py-3 bg-white border-b-3 border-black">
        <h1 className="font-display text-2xl text-ocean-deep">
          UNOS — Game Walkthrough
        </h1>
        <button
          onClick={() => navigate('/')}
          className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-warning-red/90 text-white shadow-retro transition-transform hover:bg-warning-red active:scale-95"
          title="Back to Home"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="pt-4 pb-12 px-4 max-w-4xl mx-auto">
          {/* Intro */}
          <div className="retro-card !p-6 mb-8">
            <h2 className="font-display text-2xl text-ocean-deep mb-3">
              UNOS: Birth of the Typhoon
            </h2>
            <p className="font-body text-sm text-storm-mid leading-relaxed">
              This walkthrough explains each level of the game, the science behind it, the gameplay mechanics,
              and how each level addresses the research gaps identified in the study:
              <em className="text-ocean-mid font-semibold"> "How typhoons develop and how they are affected by land masses and bodies of water."</em>
            </p>
          </div>

          {/* Level-by-level walkthrough */}
          <div className="space-y-6">
            {LEVEL_ORDER.map((levelId, idx) => {
              const config = LEVEL_CONFIGS[levelId];
              const details = LEVEL_DETAILS[levelId];
              const fact = EDUCATIONAL_FACTS.find(f => f.id === config.educationalFactId);

              return (
                <div key={levelId} className="retro-card !p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-ocean-surface/25 border-2 border-accent-yellow">
                      <span className="text-2xl">{details.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-ocean-mid">
                          Stage {idx + 1}
                        </span>
                        <span className="font-display text-xl text-ui-black">
                          {config.name}
                        </span>
                        <span className="text-2xl">{details.emoji}</span>
                      </div>
                      <div className="font-body text-xs text-storm-mid uppercase tracking-wider">
                        {details.science.split('.')[0]}...
                      </div>
                    </div>
                  </div>

                  {/* Science Explanation */}
                  <div className="mb-3">
                    <h3 className={`font-display text-sm text-ocean-mid mb-1`}>🔬 Science</h3>
                    <p className="font-body text-sm text-storm-dark leading-relaxed">
                      {details.science}
                    </p>
                  </div>

                  {/* Game Mechanics */}
                  <div className="mb-3">
                    <h3 className={`font-display text-sm text-[#0D9488] mb-1`}>🎮 Mechanics</h3>
                    <p className="font-body text-sm text-storm-dark leading-relaxed">
                      {details.mechanics}
                    </p>
                  </div>

                  {/* Research Gap */}
                  <div className="mb-3">
                    <h3 className={`font-display text-sm text-warning-red mb-1`}>🎯 Research Gap Addressed</h3>
                    <p className="font-body text-sm text-storm-dark leading-relaxed">
                      {details.researchGap}
                    </p>
                  </div>

                  {/* Educational Fact */}
                  {fact && (
                    <div className="bg-amber-50 border-l-3 border-accent-yellow rounded p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs text-[#B45309]">💡 {fact.id.replace('fact_', '').toUpperCase()}</span>
                      </div>
                      <p className="font-body text-xs text-storm-mid mt-1 leading-relaxed">
                        {fact.text}
                      </p>
                      <p className="font-body text-[10px] text-slate-500 mt-1">
                        — {fact.source}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* How the Water Cycle Flows */}
          <div className="retro-card !p-5 mt-8">
            <h2 className="font-display text-xl text-ocean-deep mb-4">
              🔁 The Water Cycle — Level Progression
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl">☀️</span>
                <span className="font-display text-sm text-ui-black">Evaporation</span>
                <span className="font-body text-xs text-storm-mid">Warm ocean → water vapor</span>
              </div>
              <div className="text-2xl text-ocean-mid">→</div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl">💧</span>
                <span className="font-display text-sm text-ui-black">Condensation</span>
                <span className="font-body text-xs text-storm-mid">Vapor → clouds</span>
              </div>
              <div className="text-2xl text-ocean-mid">→</div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl">🌡️</span>
                <span className="font-display text-sm text-ui-black">Pressure</span>
                <span className="font-body text-xs text-storm-mid">High → Low creates wind</span>
              </div>
              <div className="text-2xl text-ocean-mid">→</div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl">🌀</span>
                <span className="font-display text-sm text-ui-black">Rotation</span>
                <span className="font-body text-xs text-storm-mid">Coriolis effect → spin</span>
              </div>
              <div className="text-2xl text-ocean-mid">→</div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-3xl">🌪️</span>
                <span className="font-display text-sm text-ui-black">Typhoon</span>
                <span className="font-body text-xs text-storm-mid">All elements combine</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-ocean-surface/15 rounded border border-ocean-mid/25">
              <p className="font-body text-xs text-storm-dark leading-relaxed">
                <strong>Key Insight:</strong> Each level builds on the previous one, showing how individual weather elements
                (heat, moisture, pressure, rotation) combine to create a typhoon. The final boss level — "Ride the Storm" —
                puts players inside the storm to experience firsthand how typhoons intensify over warm ocean water and
                weaken over land — the storm visibly loses strength as the vessel nears the islands — directly addressing
                the research question about land masses and bodies of water.
              </p>
            </div>
          </div>

          {/* How to Play Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/game')}
              className="retro-btn-primary text-lg px-8 py-3"
            >
              ▶ Play the Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}