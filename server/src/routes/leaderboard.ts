import { Router } from 'express';
import { getDataStore } from '../services/dataStore.js';
import { config } from '../config/index.js';

export type { LeaderboardEntry, GlobalEntry } from '../db/leaderboard.js';

export const leaderboardRouter = Router();

interface SubmitScoreBody {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  levelId: string;
  time: number;
}

// POST /api/leaderboard/submit — submit a score
leaderboardRouter.post('/submit', async (req, res) => {
  const body = req.body as SubmitScoreBody;
  if (!body.userId || body.score == null || !body.levelId) {
    res.status(400).json({ error: 'userId, score, and levelId are required' });
    return;
  }

  const entry = {
    userId: body.userId,
    displayName: body.displayName || body.userId,
    score: body.score,
    stars: body.stars ?? 0,
    levelId: String(body.levelId).slice(0, 32),
    time: body.time ?? 0,
    achievedAt: new Date().toISOString(),
  };

  await getDataStore().submitScore(entry);
  res.json({ submitted: true });
});

// GET /api/leaderboard/:levelId?page=1&limit=20 — get leaderboard for a level
leaderboardRouter.get('/:levelId', async (req, res) => {
  const { levelId } = req.params;
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? String(config.leaderboardPageSize), 10),
    100,
  );
  const page = Math.max(parseInt((req.query.page as string) ?? '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  const { entries, total } = await getDataStore().getLevel(levelId, limit, offset);
  res.json({
    levelId,
    entries,
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/leaderboard?page=1&limit=20 — get global leaderboard (summed across levels)
leaderboardRouter.get('/', async (req, res) => {
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? String(config.leaderboardPageSize), 10),
    100,
  );
  const page = Math.max(parseInt((req.query.page as string) ?? '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  const { entries, total } = await getDataStore().getGlobal(limit, offset);
  res.json({ entries, page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});