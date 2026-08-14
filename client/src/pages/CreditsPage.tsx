import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Users, Sparkles } from 'lucide-react';

const TEAM = [
  'Estephany Marie M. Anselmo',
  'Francine Abby B. Bautista',
  'Lea N. Orosco',
  'Ardon B. San Joaquin',
];

export default function CreditsPage() {
  return (
    <div className="credits-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
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
          <Heart size={26} className="text-warning-red" />
          Credits
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto space-y-3 sm:space-y-4 pb-4 pr-1">
          {/* Logo card */}
          <div className="retro-card !bg-storm-dark text-center animate-float">
            <div
              className="font-display text-4xl text-accent-yellow mb-1"
              style={{ textShadow: '3px 3px 0px #000000' }}>
              UNOS
            </div>
            <p className="font-display text-base text-ocean-surface">Birth of the Typhoon</p>
          </div>

          {/* Team card */}
          <div className="retro-card !bg-ocean-mid">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Users size={18} className="text-accent-yellow" />
              <h2 className="font-display text-base text-white">Meet the Team</h2>
              <Sparkles size={18} className="text-accent-yellow animate-pulse" />
            </div>
            <div className="space-y-2 sm:space-y-3">
              {TEAM.map((name, index) => (
                <div
                  key={name}
                  className="credits-name-card"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                  <span className="credits-avatar">
                    {name
                      .split(' ')
                      .filter(word => word.length > 1 && word[0] === word[0].toUpperCase())
                      .slice(0, 2)
                      .map(word => word[0])
                      .join('')}
                  </span>
                  <span className="font-body text-sm text-white">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer card */}
          <div className="retro-card !bg-storm-dark text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <p className="font-body text-xs text-storm-light">
              A Capstone Project — {new Date().getFullYear()}
            </p>
            <p className="font-body text-xs text-storm-light mt-1 flex items-center justify-center gap-1">
              Built with <Heart size={12} className="text-warning-red animate-pulse" /> for science education
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
