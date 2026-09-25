import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Medal,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { LEVEL_ORDER, LEVEL_CONFIGS } from '@shared/constants';
import type { LevelId } from '@shared/types';
import {
  fetchLeaderboardGlobal,
  fetchLeaderboardLevel,
  getDisplayName,
  getPlayerName,
  getUserId,
  setPlayerName,
  type GlobalEntry,
  type LeaderboardEntry,
  type LeaderboardPage as LbPage,
} from '../services/leaderboard';

type TabId = 'global' | LevelId;

const TAB_ORDER: TabId[] = ['global', ...LEVEL_ORDER];

const PAGE_SIZE = 20;

const levelLabel = (id: TabId): string =>
  id === 'global' ? 'All Levels' : (LEVEL_CONFIGS[id]?.name ?? id);

const starText = (stars: number): string =>
  '★'.repeat(Math.min(Math.max(stars, 0), 3)) +
  '☆'.repeat(3 - Math.min(Math.max(stars, 0), 3));

const formatTime = (seconds?: number): string => {
  if (seconds === undefined || !isFinite(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg leading-none">🥇</span>;
  if (rank === 2) return <span className="text-lg leading-none">🥈</span>;
  if (rank === 3) return <span className="text-lg leading-none">🥉</span>;
  return (
    <span className="font-display text-sm text-storm-light w-6 text-center">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<TabId>('global');
  const [page, setPage] = useState(1);
  const [globalData, setGlobalData] = useState<LbPage<GlobalEntry> | null>(null);
  const [levelData, setLevelData] = useState<LbPage<LeaderboardEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [nameInput, setNameInput] = useState(getPlayerName());

  const myId = useMemo(() => getUserId(), []);

  const load = useCallback(async (target: TabId, p: number) => {
    setLoading(true);
    try {
      if (target === 'global') {
        setGlobalData(await fetchLeaderboardGlobal(p, PAGE_SIZE));
      } else {
        setLevelData(await fetchLeaderboardLevel(target, p, PAGE_SIZE));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setGlobalData(null);
    setLevelData(null);
  }, [tab]);

  useEffect(() => {
    void load(tab, page);
  }, [tab, page, load]);

  useEffect(() => {
    setNameInput(getPlayerName());
  }, []);

  const saveName = useCallback(() => {
    setPlayerName(nameInput);
    void load(tab, page);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('leaderboard:name-updated'));
    }
  }, [nameInput, tab, page, load]);

  const data = tab === 'global' ? globalData : levelData;
  const entries = data?.entries ?? null;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const offline = !loading && entries === null;

  const highlightRow = (userId: string): boolean => userId === myId;

  const pageWindow = useMemo(() => {
    const nums: number[] = [];
    for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
      nums.push(p);
    }
    return nums;
  }, [page, totalPages]);

  const shownStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const shownEnd = Math.min(page * pageSize, total);

  return (
    <div className="leaderboard-page w-full h-full flex flex-col bg-ocean-deep p-4 sm:p-6">
      <div className="flex items-center mb-4 sm:mb-6 shrink-0">
        <Link
          to="/dashboard"
          className="retro-btn bg-storm-mid text-white text-sm mr-3 flex items-center gap-1.5 shrink-0">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1
          className="flex-1 min-w-0 text-2xl sm:text-3xl font-display text-accent-yellow flex items-center gap-2 truncate"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Medal size={26} className="shrink-0" />
          <span className="truncate">Leaderboard</span>
        </h1>
        <button
          onClick={() => void load(tab, page)}
          className="retro-btn bg-storm-mid text-white text-sm ml-2 flex items-center gap-1.5 shrink-0"
          title="Refresh">
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="lboard-name-row shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <label
          htmlFor="lboard-name"
          className="font-display text-sm text-accent-yellow shrink-0">
          Your name:
        </label>
        <input
          id="lboard-name"
          value={nameInput}
          maxLength={20}
          placeholder={getDisplayName()}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveName();
          }}
          onBlur={saveName}
          className="retro-card !p-1.5 !px-2 !bg-storm-dark text-white font-body text-sm flex-1 min-w-[8rem] max-w-[16rem]"
        />
        <button
          onClick={saveName}
          className="retro-btn bg-storm-mid text-white text-xs">
          Save
        </button>
        <span className="font-body text-storm-light text-xs">
          You play as{' '}
          <span className="text-accent-yellow font-semibold">
            {getDisplayName()}
          </span>
        </span>
      </div>

      <div className="shrink-0 mb-3 flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {TAB_ORDER.filter(i => i !== 'tutorial').map(id => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`retro-btn text-xs shrink-0 ${
              tab === id
                ? 'bg-accent-yellow text-black'
                : 'bg-storm-mid text-white'
            }`}>
            {levelLabel(id)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-xl w-full mx-auto pb-4 pr-1">
          {offline ? (
            <div className="retro-card !bg-storm-dark text-center py-10 px-4 flex flex-col items-center gap-3">
              <WifiOff size={32} className="text-accent-yellow" />
              <p className="font-display text-lg text-accent-yellow">
                Backend offline
              </p>
              <p className="font-body text-storm-light text-sm max-w-xs">
                The leaderboard server isn't reachable. Your scores are still
                saved locally — start the backend (see README) and refresh to
                see them.
              </p>
            </div>
          ) : entries && entries.length === 0 ? (
            <div className="retro-card !bg-storm-dark text-center py-10 flex flex-col items-center gap-3">
              <Medal size={32} className="text-accent-yellow" />
              <p className="font-display text-lg text-storm-light">
                No scores yet in {levelLabel(tab)}
              </p>
              <p className="font-body text-storm-light text-sm max-w-xs">
                Play the level and your best score will show up here!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {loading && (
                <p className="font-body text-storm-light text-xs text-center py-1">
                  Loading…
                </p>
              )}
              {entries?.map((entry, i) => {
                const mine = highlightRow(entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className={`retro-card !p-1.5 !px-3 flex items-center gap-2 ${
                      mine
                        ? '!bg-accent-yellow/15 border-accent-yellow/50'
                        : '!bg-storm-dark/80 border-white/10'
                    }`}>
                    <RankBadge rank={(page - 1) * pageSize + i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm text-white truncate flex items-center gap-1.5">
                        {entry.displayName}
                        {mine && (
                          <span className="font-body text-[10px] text-accent-yellow border border-accent-yellow/50 px-1 rounded">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="font-body text-xs text-storm-light flex items-center gap-1">
                        <span className="text-accent-yellow text-[11px]">
                          {starText(entry.stars)}
                        </span>
                      </p>
                    </div>
                    {tab !== 'global' && (
                      <span className="font-body text-xs text-storm-light shrink-0">
                        {formatTime((entry as LeaderboardEntry).time)}
                      </span>
                    )}
                    <p className="font-display text-base text-accent-yellow shrink-0 tabular-nums">
                      {entry.score.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {total > 0 && (
        <p className="shrink-0 text-center font-body text-storm-light text-xs mt-2">
          Showing {shownStart}–{shownEnd} of {total} scores
        </p>
      )}

      {totalPages > 1 && (
        <div className="shrink-0 mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="retro-btn bg-storm-mid text-white text-xs flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={14} />
            Prev
          </button>
          {pageWindow.map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`retro-btn text-xs w-8 ${
                p === page
                  ? 'bg-accent-yellow text-black'
                  : 'bg-storm-mid text-white'
              }`}>
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="retro-btn bg-storm-mid text-white text-xs flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed">
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
