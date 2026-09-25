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

// GET /api/leaderboard/:levelId — get leaderboard for a level
leaderboardRouter.get('/:levelId', async (req, res) => {
  const { levelId } = req.params;
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? String(config.leaderboardPageSize), 10),
    100,
  );

  const entries = await getDataStore().getLevel(levelId, limit);
  res.json({ levelId, entries });
});

// GET /api/leaderboard — get global leaderboard (summed across levels)
leaderboardRouter.get('/', async (_req, res) => {
  const entries = await getDataStore().getGlobal(100);
  res.json({ entries });
});