import { Router } from 'express';
import { getDataStore } from '../services/dataStore.js';

export const progressRouter = Router();

export interface SyncProgressBody {
  userId: string;
  levelId: string;
  score: number;
  stars: number;
  time: number;
  completed: boolean;
  factsUnlocked: string[];
}

export interface SyncProgressResponse {
  synced: boolean;
  serverBest: { score: number; stars: number; time: number };
}

// POST /api/progress/sync — save or sync progress
progressRouter.post('/sync', async (req, res) => {
  const body = req.body as SyncProgressBody;
  if (!body.userId || !body.levelId) {
    res.status(400).json({ error: 'userId and levelId are required' });
    return;
  }

  const serverBest = await getDataStore().syncProgress({
    userId: body.userId,
    levelId: String(body.levelId).slice(0, 32),
    score: body.score ?? 0,
    stars: body.stars ?? 0,
    time: body.time ?? 0,
    completed: body.completed ?? false,
    factsUnlocked: Array.isArray(body.factsUnlocked) ? body.factsUnlocked : [],
  });

  res.json({
    synced: true,
    serverBest,
  } satisfies SyncProgressResponse);
});

// GET /api/progress/:userId — get all progress for a user
progressRouter.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const progress = await getDataStore().getUserProgress(userId);
  res.json({ userId, progress });
});