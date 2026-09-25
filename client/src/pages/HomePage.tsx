import { Link } from 'react-router-dom';
import {
  Gamepad2,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Medal,
  Settings,
  ScrollText,
  HelpCircle
} from 'lucide-react';
import FullscreenButton from '../components/FullscreenButton';
import { LEVEL_ORDER, LEVEL_CONFIGS } from '@shared/constants';

export default function HomePage() {
  return (
    <div
      className="home-page w-full h-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{
        backgroundImage: `url(${new URL('/images/Main Menu BG.png', window.location.origin).href})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
      {/* Darken overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Fullscreen toggle */}
      <FullscreenButton />

      {/* Content — centered */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Title */}
        <h1
          className="font-display text-5xl sm:text-6xl md:text-7xl text-accent-yellow text-center"
          style={{ textShadow: '4px 4px 0px #000000' }}>
          UNOS
        </h1>
        <p
          className="font-display text-lg sm:text-xl text-ocean-surface mt-1 text-center"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          Birth of the Typhoon
        </p>

        {/* Tagline */}
        {/* <p className="font-body text-sm text-storm-light mt-4 text-center max-w-xs leading-relaxed">
          Learn how tropical cyclones form through interactive mini-games.
          Become a Weather Apprentice and master the storm!
        </p> */}

        {/* Main actions */}
        <div className="home-main-actions flex flex-col gap-3 w-full max-w-[260px] mx-auto mt-8">
          <Link
            to="/game"
            className="retro-btn-primary text-center text-base sm:text-lg flex items-center justify-center gap-2">
            <Gamepad2 size={22} className="sm:w-[26px] sm:h-[26px]" />
            Start Game
          </Link>
          <Link
            to="/dashboard"
            className="retro-btn bg-ocean-mid text-white text-center text-base sm:text-lg flex items-center justify-center gap-2">
            <LayoutDashboard size={22} className="sm:w-[26px] sm:h-[26px]" />
            Dashboard
          </Link>
        </div>

        {/* Secondary nav */}
        <div className="home-secondary-nav flex flex-wrap justify-center gap-2 mt-6">
          <Link
            to="/encyclopedia"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <BookOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
            Encyclopedia
          </Link>
          <Link
            to="/achievements"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <Trophy size={16} className="sm:w-[18px] sm:h-[18px]" />
            Achievements
          </Link>
          <Link
            to="/leaderboard"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <Medal size={16} className="sm:w-[18px] sm:h-[18px]" />
            Leaderboard
          </Link>
          <Link
            to="/settings"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
            Settings
          </Link>
          <Link
            to="/credits"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <ScrollText size={16} className="sm:w-[18px] sm:h-[18px]" />
            Credits
          </Link>
          <Link
            to="/walkthrough"
            className="retro-btn bg-storm-dark text-white text-[11px] sm:text-xs !px-2.5 sm:!px-3 !py-1.5 sm:!py-2 flex items-center gap-1.5">
            <HelpCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
            Walkthrough
          </Link>
        </div>

        {/* Footer */}
        {/* <p className="font-body text-xs text-storm-light/60 mt-6">
          A Capstone Project — Built with Phaser 3 + React
        </p> */}

        {/* ── DEBUG: quick level jump (dev only) ── */}
        {/* <div className="mt-6 w-full max-w-[340px]">
          <p className="font-display text-[10px] uppercase tracking-widest text-white/40 text-center mb-2"
            style={{ textShadow: '1px 1px 0px #000000' }}>
            ⚠ Debug · Quick Level Jump
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {LEVEL_ORDER.map(id => (
              <Link
                key={id}
                to={id === 'boss' ? '/boss' : `/game?level=${id}`}
                className="retro-btn bg-storm-mid text-white text-[10px] !px-2.5 !py-1">
                {id === 'boss' ? '🏆 Final Mission' : LEVEL_CONFIGS[id]?.name ?? id}
              </Link>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
}
