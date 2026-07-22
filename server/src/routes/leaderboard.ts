import { Router } from 'express';
import { store } from '../services/store.js';

export const leaderboardRouter = Router();

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  levelId: string;
  time: number;
  achievedAt: string;
}

interface SubmitScoreBody {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  levelId: string;
  time: number;
}

// POST /api/leaderboard/submit — submit a score
leaderboardRouter.post('/submit', (req, res) => {
  const body = req.body as SubmitScoreBody;
  if (!body.userId || body.score == null || !body.levelId) {
    res.status(400).json({ error: 'userId, score, and levelId are required' });
    return;
  }

  const entry: LeaderboardEntry = {
    userId: body.userId,
    displayName: body.displayName || body.userId,
    score: body.score,
    stars: body.stars ?? 0,
    levelId: body.levelId,
    time: body.time ?? 0,
    achievedAt: new Date().toISOString(),
  };

  // In-memory sorted set via store (keyed by levelId to userId)
  const key = `lb_${body.levelId}`;
  const existing = store.get<Record<string, LeaderboardEntry>>(key) ?? {};
  const prev = existing[body.userId];

  if (!prev || body.score > prev.score) {
    existing[body.userId] = entry;
    store.set(key, existing);
  }

  res.json({ submitted: true });
});

// GET /api/leaderboard/:levelId — get leaderboard for a level
leaderboardRouter.get('/:levelId', (req, res) => {
  const { levelId } = req.params;
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? '20', 10),
    100,
  );

  const key = `lb_${levelId}`;
  const entries = store.get<Record<string, LeaderboardEntry>>(key) ?? {};

  const sorted = Object.values(entries)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  res.json({ levelId, entries: sorted });
});

// GET /api/leaderboard — get global leaderboard (summed across levels)
leaderboardRouter.get('/', (_req, res) => {
  const lbKeys = store.list<Record<string, LeaderboardEntry>>('lb_');

  // Aggregate per user across all levels
  const totals = new Map<string, { displayName: string; score: number; stars: number }>();

  for (const { value: levelEntries } of lbKeys) {
    for (const [uid, entry] of Object.entries(levelEntries)) {
      const existing = totals.get(uid) ?? { displayName: entry.displayName, score: 0, stars: 0 };
      existing.score += entry.score;
      existing.stars += entry.stars;
      totals.set(uid, existing);
    }
  }

  const sorted = [...totals.entries()]
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  res.json({ entries: sorted });
});
