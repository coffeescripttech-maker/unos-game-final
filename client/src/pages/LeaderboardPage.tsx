import { Link } from 'react-router-dom';
import { ArrowLeft, Medal, Construction } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <div className="leaderboard-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Medal size={26} />
          Leaderboard
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto pb-4 pr-1">
          <div className="retro-card !bg-storm-dark text-center py-10 sm:py-12 flex flex-col items-center gap-3">
            <Construction size={36} className="text-accent-yellow" />
            <p className="font-display text-lg text-storm-light">Coming Soon</p>
            <p className="font-body text-storm-light text-sm max-w-xs">
              Leaderboards will be available when the backend is connected.
              Compete with friends for the highest scores!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
