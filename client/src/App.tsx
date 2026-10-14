import { Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import { audioService } from './services/audio';
import { loadSettings, applySettings } from './services/settings';

// Route-level code splitting: pages (and the Phaser/Three.js engines behind
// them) load only when their route is opened, keeping the first screen fast.
const GamePage = lazy(() => import('./pages/GamePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const EncyclopediaPage = lazy(() => import('./pages/EncyclopediaPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const BossPage = lazy(() => import('./pages/BossPage'));
const WalkthroughPage = lazy(() => import('./pages/WalkthroughPage'));

function PageLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-ocean-deep">
      <p className="font-display text-accent-yellow text-lg animate-pulse">
        Loading…
      </p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Initialize audio on first user interaction (browsers require a gesture)
  useEffect(() => {
    const unlockAudio = () => {
      audioService.init();
      setAudioUnlocked(true);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Load and apply saved settings on app start
  useEffect(() => {
    const settings = loadSettings();
    applySettings(settings);
  }, []);

  // Route-based background music
  useEffect(() => {
    if (!audioUnlocked) return;
    audioService.stopBgm();
    if (location.pathname === '/') {
      audioService.playMenuBgm();
    } else if (location.pathname === '/game' || location.pathname === '/boss') {
      audioService.playLevelBgm();
    }
  }, [location.pathname, audioUnlocked]);

  // Global button / link click sound
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"], .retro-btn')) {
        audioService.playClick();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <ErrorBoundary>
      <div className="w-full h-full bg-ocean-deep overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/encyclopedia" element={<EncyclopediaPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/boss" element={<BossPage />} />
            <Route path="/walkthrough" element={<WalkthroughPage />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
