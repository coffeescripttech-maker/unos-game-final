import { Link } from 'react-router-dom';
import {
  Gamepad2,
  Users,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Medal,
  Settings,
  ScrollText
} from 'lucide-react';

export default function HomePage() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{
        backgroundImage: `url(${new URL('/images/Main Menu BG.png', window.location.origin).href})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
      {/* Darken overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content — centered */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Title */}
        <h1
          className="font-display text-6xl md:text-7xl text-accent-yellow text-center"
          style={{ textShadow: '4px 4px 0px #000000' }}>
          UNOS
        </h1>
        <p
          className="font-display text-xl text-ocean-surface mt-1 text-center"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          Birth of the Typhoon
        </p>

        {/* Tagline */}
        {/* <p className="font-body text-sm text-storm-light mt-4 text-center max-w-xs leading-relaxed">
          Learn how tropical cyclones form through interactive mini-games.
          Become a Weather Apprentice and master the storm!
        </p> */}

        {/* Main actions */}
        <div className="flex flex-col gap-3 w-full mt-8">
          <Link
            to="/game"
            className="retro-btn-primary text-center text-lg flex items-center justify-center gap-2">
            <Gamepad2 size={26} />
            Start Game
          </Link>
          {/* <Link
            to="/multiplayer"
            className="retro-btn bg-storm-mid text-white text-center flex items-center justify-center gap-2">
            <Users size={26} />
            Multiplayer
          </Link> */}
          <Link
            to="/dashboard"
            className="retro-btn bg-ocean-mid text-white text-center flex items-center justify-center gap-2">
            <LayoutDashboard size={26} />
            Dashboard
          </Link>
        </div>

        {/* Secondary nav */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Link
            to="/encyclopedia"
            className="retro-btn bg-storm-dark text-white text-xs !px-3 !py-2 flex items-center gap-1.5">
            <BookOpen size={18} />
            Encyclopedia
          </Link>
          <Link
            to="/achievements"
            className="retro-btn bg-storm-dark text-white text-xs !px-3 !py-2 flex items-center gap-1.5">
            <Trophy size={18} />
            Achievements
          </Link>
          <Link
            to="/leaderboard"
            className="retro-btn bg-storm-dark text-white text-xs !px-3 !py-2 flex items-center gap-1.5">
            <Medal size={18} />
            Leaderboard
          </Link>
          <Link
            to="/settings"
            className="retro-btn bg-storm-dark text-white text-xs !px-3 !py-2 flex items-center gap-1.5">
            <Settings size={18} />
            Settings
          </Link>
          <Link
            to="/credits"
            className="retro-btn bg-storm-dark text-white text-xs !px-3 !py-2 flex items-center gap-1.5">
            <ScrollText size={18} />
            Credits
          </Link>
        </div>

        {/* Footer */}
        {/* <p className="font-body text-xs text-storm-light/60 mt-6">
          A Capstone Project — Built with Phaser 3 + React
        </p> */}
      </div>
    </div>
  );
}
