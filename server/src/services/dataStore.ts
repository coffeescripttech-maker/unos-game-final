import { isDbConfigured, ensureSchema } from '../db/pool.js';
import {
  submitScore as dbSubmitScore,
  getLevelScores as dbGetLevelScores,
  getGlobalScores as dbGetGlobalScores,
  type LeaderboardEntry,
  type GlobalEntry,
} from '../db/leaderboard.js';
import {
  getStoredProgress,
  upsertProgress,
  getUserProgress as dbGetUserProgress,
  type SyncProgressBody,
} from '../db/progress.js';
import { store } from './store.js';

/**
 * Single data-access facade used by the REST routes and the seed script.
 *
 * - MySQL when configured (production) — see server/.env / .env.example
 * - JSON-file store otherwise (local dev without a database)
 *
 * Initialized once at server boot via initDataStore().
 */

export interface ProgressServerBest {
  score: number;
  stars: number;
  time: number;
}

export interface DataStore {
  submitScore(entry: LeaderboardEntry): Promise<void>;
  getLevel(levelId: string, limit: number): Promise<LeaderboardEntry[]>;
  getGlobal(limit: number): Promise<GlobalEntry[]>;
  syncProgress(body: SyncProgressBody): Promise<ProgressServerBest>;
  getUserProgress(userId: string): Promise<Record<string, SyncProgressBody>>;
}

function mergeProgress(existing: SyncProgressBody | null, incoming: SyncProgressBody): SyncProgressBody {
  if (!existing) return incoming;
  return {
    ...existing,
    score: Math.max(existing.score, incoming.score),
    stars: Math.max(existing.stars, incoming.stars),
    time: Math.min(existing.time, incoming.time),
    completed: existing.completed || incoming.completed,
    factsUnlocked: [
      ...new Set([...existing.factsUnlocked, ...incoming.factsUnlocked]),
    ],
  };
}

function makeFileStore(): DataStore {
  return {
    async submitScore(entry) {
      const key = `lb_${entry.levelId}`;
      const existing = store.get<Record<string, LeaderboardEntry>>(key) ?? {};
      const prev = existing[entry.userId];
      if (!prev || entry.score > prev.score) {
        existing[entry.userId] = entry;
        store.set(key, existing);
      }
    },

    async getLevel(levelId, limit) {
      const entries = Object.values(
        store.get<Record<string, LeaderboardEntry>>(`lb_${levelId}`) ?? {},
      );
      return entries.sort((a, b) => b.score - a.score).slice(0, limit);
    },

    async getGlobal(limit) {
      const lbKeys = store.list<Record<string, LeaderboardEntry>>('lb_');
      const totals = new Map<string, { displayName: string; score: number; stars: number }>();
      for (const { value: levelEntries } of lbKeys) {
        for (const entry of Object.values(levelEntries)) {
          const existing = totals.get(entry.userId) ?? {
            displayName: entry.displayName,
            score: 0,
            stars: 0,
          };
          existing.score += entry.score;
          existing.stars += entry.stars;
          totals.set(entry.userId, existing);
        }
      }
      return [...totals.entries()]
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },

    async syncProgress(body) {
      const key = `progress_${body.userId}_${body.levelId}`;
      const existing = store.get<SyncProgressBody>(key);
      const merged = mergeProgress(existing, body);
      store.set(key, merged);
      return { score: merged.score, stars: merged.stars, time: merged.time };
    },

    async getUserProgress(userId) {
      const entries = store.list<SyncProgressBody>(`progress_${userId}`);
      const progress: Record<string, SyncProgressBody> = {};
      for (const e of entries) {
        progress[e.key.replace(`progress_${userId}_`, '')] = e.value;
      }
      return progress;
    },
  };
}

function makeDbStore(): DataStore {
  return {
    async submitScore(entry) {
      await dbSubmitScore(entry);
    },

    async getLevel(levelId, limit) {
      return dbGetLevelScores(levelId, limit);
    },

    async getGlobal(limit) {
      return dbGetGlobalScores(limit);
    },

    async syncProgress(body) {
      const existing = await getStoredProgress(body.userId, body.levelId);
      const merged = mergeProgress(existing, body);
      await upsertProgress(merged);
      return { score: merged.score, stars: merged.stars, time: merged.time };
    },

    async getUserProgress(userId) {
      return dbGetUserProgress(userId);
    },
  };
}

let dataStore: DataStore | null = null;
let usingDb = false;

/** Resolve MySQL vs file store once at boot. Always succeeds (falls back). */
export async function initDataStore(): Promise<DataStore> {
  if (dataStore) return dataStore;
  if (isDbConfigured()) {
    try {
      await ensureSchema();
      dataStore = makeDbStore();
      usingDb = true;
      console.log('[db] MySQL connected — using database persistence.');
      return dataStore;
    } catch (err) {
      console.warn('[db] MySQL init failed — using file store:', (err as Error).message);
    }
  }
  dataStore = makeFileStore();
  usingDb = false;
  return dataStore;
}

export function getDataStore(): DataStore {
  if (!dataStore) {
    throw new Error('DataStore not initialized — call initDataStore() at startup first.');
  }
  return dataStore;
}

export const dataStoreIsDb = (): boolean => usingDb;