import type { RowDataPacket } from 'mysql2';
import { getPool } from './pool.js';

export interface SyncProgressBody {
  userId: string;
  levelId: string;
  score: number;
  stars: number;
  time: number;
  completed: boolean;
  factsUnlocked: string[];
}

interface ProgressRow extends RowDataPacket {
  user_id: string;
  level_id: string;
  score: number;
  stars: number;
  time_seconds: number;
  completed: number;
  facts_unlocked: string;
}

function toBody(r: ProgressRow): SyncProgressBody {
  return {
    userId: r.user_id,
    levelId: r.level_id,
    score: r.score,
    stars: r.stars,
    time: r.time_seconds,
    completed: r.completed === 1,
    factsUnlocked: r.facts_unlocked ? r.facts_unlocked.split(',') : [],
  };
}

export async function getStoredProgress(
  userId: string,
  levelId: string,
): Promise<SyncProgressBody | null> {
  const [rows] = await getPool().query<ProgressRow[]>(
    `SELECT user_id, level_id, score, stars, time_seconds, completed, facts_unlocked
       FROM player_progress
      WHERE user_id = ? AND level_id = ?
      LIMIT 1`,
    [userId, levelId],
  );
  return rows[0] ? toBody(rows[0]) : null;
}

export async function upsertProgress(body: SyncProgressBody): Promise<void> {
  await getPool().query(
    `INSERT INTO player_progress
       (user_id, level_id, score, stars, time_seconds, completed, facts_unlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       score        = VALUES(score),
       stars        = VALUES(stars),
       time_seconds = VALUES(time_seconds),
       completed    = VALUES(completed),
       facts_unlocked = VALUES(facts_unlocked),
       updated_at   = NOW()`,
    [
      body.userId,
      body.levelId,
      body.score,
      body.stars,
      body.time,
      body.completed ? 1 : 0,
      body.factsUnlocked.join(','),
    ],
  );
}

export async function getUserProgress(userId: string): Promise<Record<string, SyncProgressBody>> {
  const [rows] = await getPool().query<ProgressRow[]>(
    `SELECT user_id, level_id, score, stars, time_seconds, completed, facts_unlocked
       FROM player_progress
      WHERE user_id = ?`,
    [userId],
  );
  const progress: Record<string, SyncProgressBody> = {};
  for (const r of rows) {
    progress[r.level_id] = toBody(r);
  }
  return progress;
}