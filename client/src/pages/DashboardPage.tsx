import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, BarChart3, Star, BookOpen, Trophy, HelpCircle, FlaskConical, RefreshCw, FileSpreadsheet, FileJson, Trash2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LevelProgress } from '@shared/types';
import { telemetry, type TelemetryStats } from '../services/telemetry';

export default function DashboardPage() {
  const [progress, setProgress] = useState<Record<string, LevelProgress>>({});

  useEffect(() => {
    const raw = localStorage.getItem('unos_progress');
    if (raw) setProgress(JSON.parse(raw));
  }, []);

  // Research data capture (learning telemetry)
  const [participantId, setParticipantId] = useState('');
  const [stats, setStats] = useState<TelemetryStats>({ runCount: 0, eventCount: 0, lastActiveAt: null, participantId: '' });

  useEffect(() => {
    const s = telemetry.getStats();
    setStats(s);
    setParticipantId(s.participantId);
  }, []);

  const refreshStats = () => setStats(telemetry.getStats());
  const handleSaveParticipant = () => {
    telemetry.setParticipant(participantId);
    refreshStats();
  };
  const handleNewSession = () => {
    telemetry.startNewRun();
    setParticipantId('');
    refreshStats();
  };
  const handleClear = () => {
    if (window.confirm('Delete ALL recorded research data on this device?')) {
      telemetry.clear();
      setParticipantId('');
      refreshStats();
    }
  };

  const completedLevels = Object.values(progress).filter(p => p.completed).length;
  const totalScore = Object.values(progress).reduce((a, p) => a + (p.bestScore || 0), 0);
  const totalStars = Object.values(progress).reduce((a, p) => a + (p.stars || 0), 0);

  return (
    <div className="dashboard-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link to="/" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <BarChart3 size={26} />
          Dashboard
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto space-y-3 sm:space-y-4 pb-4 pr-1">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <Gamepad2 size={22} className="mx-auto text-ocean-surface mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{completedLevels}</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Levels Done</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <Star size={22} className="mx-auto text-accent-yellow mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{totalStars} / 21</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Total Stars</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <BarChart3 size={22} className="mx-auto text-accent-green mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">{totalScore.toLocaleString()}</div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Total Score</div>
            </div>
            <div className="retro-card !bg-ocean-mid text-center !p-3">
              <BookOpen size={22} className="mx-auto text-accent-yellow mb-1" />
              <div className="font-display text-xl sm:text-2xl text-white">
                {Object.values(progress).filter(p => p.factsUnlocked?.length).length}
              </div>
              <div className="font-body text-[10px] sm:text-xs text-storm-light">Facts Found</div>
            </div>
          </div>

          {/* Quick links */}
          <div className="retro-card !bg-storm-dark">
            <h2 className="font-display text-base text-ocean-surface mb-3 flex items-center gap-2">
              <Trophy size={18} />
              Quick Links
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/achievements" className="retro-btn bg-ocean-mid text-white text-xs sm:text-sm flex items-center gap-1.5">
                <Trophy size={14} />
                Achievements
              </Link>
              <Link to="/encyclopedia" className="retro-btn bg-ocean-mid text-white text-xs sm:text-sm flex items-center gap-1.5">
                <BookOpen size={14} />
                Encyclopedia
              </Link>
              <Link to="/walkthrough" className="retro-btn bg-ocean-mid text-white text-xs sm:text-sm flex items-center gap-1.5">
                <HelpCircle size={14} />
                Game Walkthrough
              </Link>
            </div>
          </div>

          {/* Research data capture — learning telemetry for the study */}
          <div className="retro-card !bg-storm-dark">
            <h2 className="font-display text-base text-ocean-surface mb-3 flex items-center gap-2">
              <FlaskConical size={18} />
              Research Data
            </h2>
            <p className="font-body text-[10px] sm:text-xs text-storm-light mb-3">
              Play sessions on this device are recorded for the study. Enter a participant ID, then export the data after each session.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Participant ID (e.g. S01)"
                className="retro-input flex-1 min-w-0 text-xs !py-1.5"
              />
              <button onClick={handleSaveParticipant} className="retro-btn bg-accent-green text-white text-xs shrink-0 flex items-center gap-1.5">
                <Save size={14} />
                Save
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleNewSession} className="retro-btn bg-ocean-mid text-white text-xs flex items-center gap-1.5">
                <RefreshCw size={14} />
                New Session
              </button>
              <button onClick={() => telemetry.downloadCSV()} className="retro-btn bg-accent-yellow text-storm-dark text-xs flex items-center gap-1.5">
                <FileSpreadsheet size={14} />
                Export CSV
              </button>
              <button onClick={() => telemetry.downloadJSON()} className="retro-btn bg-ocean-mid text-white text-xs flex items-center gap-1.5">
                <FileJson size={14} />
                Export JSON
              </button>
              <button onClick={handleClear} className="retro-btn bg-warning-red text-white text-xs flex items-center gap-1.5">
                <Trash2 size={14} />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-black/25 border border-white/10 rounded-md p-2 text-center">
                <div className="font-display text-lg text-white">{stats.runCount}</div>
                <div className="font-body text-[9px] uppercase tracking-wide text-storm-light">Sessions</div>
              </div>
              <div className="bg-black/25 border border-white/10 rounded-md p-2 text-center">
                <div className="font-display text-lg text-white">{stats.eventCount}</div>
                <div className="font-body text-[9px] uppercase tracking-wide text-storm-light">Events</div>
              </div>
              <div className="bg-black/25 border border-white/10 rounded-md p-2 text-center">
                <div className="font-display text-lg text-white">
                  {stats.lastActiveAt ? new Date(stats.lastActiveAt).toLocaleTimeString() : '—'}
                </div>
                <div className="font-body text-[9px] uppercase tracking-wide text-storm-light">Last Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
