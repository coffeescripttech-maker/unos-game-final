import { Router } from 'express';
import { store } from '../services/store.js';

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
progressRouter.post('/sync', (req, res) => {
  const body = req.body as SyncProgressBody;
  if (!body.userId || !body.levelId) {
    res.status(400).json({ error: 'userId and levelId are required' });
    return;
  }

  const key = `progress_${body.userId}_${body.levelId}`;
  const existing = store.get<SyncProgressBody>(key);
  const merged: SyncProgressBody = existing
    ? {
        ...existing,
        score: Math.max(existing.score, body.score),
        stars: Math.max(existing.stars, body.stars),
        time: Math.min(existing.time, body.time),
        completed: existing.completed || body.completed,
        factsUnlocked: [
          ...new Set([...existing.factsUnlocked, ...body.factsUnlocked]),
        ],
      }
    : body;

  store.set(key, merged);

  res.json({
    synced: true,
    serverBest: { score: merged.score, stars: merged.stars, time: merged.time },
  } satisfies SyncProgressResponse);
});

// GET /api/progress/:userId — get all progress for a user
progressRouter.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const entries = store.list<SyncProgressBody>(`progress_${userId}`);
  const progress: Record<string, SyncProgressBody> = {};
  for (const e of entries) {
    const levelId = e.key.replace(`progress_${userId}_`, '');
    progress[levelId] = e.value;
  }
  res.json({ userId, progress });
});
