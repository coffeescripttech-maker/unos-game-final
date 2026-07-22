import { Link } from 'react-router-dom';
import { ArrowLeft, Medal, Construction } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/dashboard" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Medal size={28} />
          Leaderboard
        </h1>
      </div>

      <div className="retro-card !bg-storm-dark text-center py-12 flex flex-col items-center gap-3">
        <Construction size={40} className="text-accent-yellow" />
        <p className="font-display text-lg text-storm-light">Coming Soon</p>
        <p className="font-body text-storm-light text-sm max-w-xs">
          Leaderboards will be available when the backend is connected.
          Compete with friends for the highest scores!
        </p>
      </div>
    </div>
  );
}
