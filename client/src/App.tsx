import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import DashboardPage from './pages/DashboardPage';
import AchievementsPage from './pages/AchievementsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MultiplayerLobbyPage from './pages/MultiplayerLobbyPage';
import SettingsPage from './pages/SettingsPage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import CreditsPage from './pages/CreditsPage';
import BossPage from './pages/BossPage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
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
          <Route path="/multiplayer" element={<MultiplayerLobbyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/boss" element={<BossPage />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}
