import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import DashboardPage from './pages/DashboardPage';
import AchievementsPage from './pages/AchievementsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import CreditsPage from './pages/CreditsPage';
import BossPage from './pages/BossPage';
import WalkthroughPage from './pages/WalkthroughPage';
import ErrorBoundary from './components/ErrorBoundary';
import { audioService } from './services/audio';
import { loadSettings, applySettings } from './services/settings';

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
      </div>
    </ErrorBoundary>
  );
}
