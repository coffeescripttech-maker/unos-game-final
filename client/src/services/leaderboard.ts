import type { LevelId } from '@shared/types';

/**
 * Leaderboard client service.
 * Talks to the Express backend through the Vite dev proxy (/api → :3001).
 * Scores are submitted fire-and-forget: if the backend is offline the game
 * keeps going (progress/telemetry still save locally) and the leaderboard
 * page shows an offline notice.
 */

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  levelId?: string;
  time?: number;
  achievedAt?: string;
}

export interface GlobalEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
}

const API_BASE = '/api';
const USER_ID_KEY = 'unos_leaderboard_id';
const NAME_KEY = 'unos_leaderboard_name';

let cachedUserId: string | null = null;

/** Stable anonymous id persisted for this browser so scores stay attached. */
export function getUserId(): string {
  if (cachedUserId) return cachedUserId;
  try {
    const saved = localStorage.getItem(USER_ID_KEY);
    if (saved) {
      cachedUserId = saved;
      return saved;
    }
  } catch {
    /* private mode — fall through to in-memory id */
  }
  const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  cachedUserId = id;
  try { localStorage.setItem(USER_ID_KEY, id); } catch { /* ignore */ }
  return id;
}

export function getPlayerName(): string {
  try { return (localStorage.getItem(NAME_KEY) ?? '').trim(); } catch { return ''; }
}

export function setPlayerName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
}

/** Name shown on the board; anonymous players get a short unique handle. */
export function getDisplayName(): string {
  const name = getPlayerName();
  if (name) return name;
  const uid = getUserId();
  return 'Sailor_' + uid.slice(-4).toUpperCase();
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Submit the player's score for a level. Server keeps the per-level best. */
export function submitScore(
  levelId: LevelId,
  score: number,
  stars: number,
  time: number,
): void {
  void request('/leaderboard/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: getUserId(),
      displayName: getDisplayName(),
      score: Math.round(score),
      stars: Math.round(stars),
      levelId,
      time: Math.round(time),
    }),
  });
}

/** Global standings (scores summed across all levels). */
export async function fetchLeaderboardGlobal(): Promise<GlobalEntry[] | null> {
  const data = await request<{ entries: GlobalEntry[] }>('/leaderboard');
  return data?.entries ?? null;
}

/** Standings for a single level. */
export async function fetchLeaderboardLevel(levelId: string): Promise<LeaderboardEntry[] | null> {
  const data = await request<{ entries: LeaderboardEntry[] }>(
    `/leaderboard/${encodeURIComponent(levelId)}`,
  );
  return data?.entries ?? null;
}