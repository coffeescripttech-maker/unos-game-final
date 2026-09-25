import type { RowDataPacket } from 'mysql2';
import { getPool } from './pool.js';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
  levelId: string;
  time: number;
  achievedAt: string;
}

export interface GlobalEntry {
  userId: string;
  displayName: string;
  score: number;
  stars: number;
}

interface LbRow extends RowDataPacket {
  user_id: string;
  display_name: string;
  score: number;
  stars: number;
  level_id: string;
  time_seconds: number;
  achieved_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface GlobalRow extends RowDataPacket {
  user_id: string;
  display_name: string;
  score: number;
  stars: number;
}

function toEntry(r: LbRow): LeaderboardEntry {
  const achieved = r.achieved_at instanceof Date ? r.achieved_at.toISOString() : String(r.achieved_at);
  return {
    userId: r.user_id,
    displayName: r.display_name,
    score: r.score,
    stars: r.stars,
    levelId: r.level_id,
    time: r.time_seconds,
    achievedAt: achieved,
  };
}

/**
 * Atomically keep the best score per (level_id, user_id). A newer score only
 * replaces the row when it strictly beats the stored one (mirrors the old
 * file-store behaviour, but race-safe for concurrent submits).
 */
export async function submitScore(entry: LeaderboardEntry): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      `INSERT INTO leaderboard_entries
         (level_id, user_id, display_name, score, stars, time_seconds, achieved_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         score        = IF(VALUES(score) > score, VALUES(score), score),
         display_name = IF(VALUES(score) > score, VALUES(display_name), display_name),
         stars        = IF(VALUES(score) > score, VALUES(stars), stars),
         time_seconds = IF(VALUES(score) > score, VALUES(time_seconds), time_seconds),
         achieved_at  = IF(VALUES(score) > score, NOW(), achieved_at)`,
      [entry.levelId, entry.userId, entry.displayName, entry.score, entry.stars, entry.time],
    );
  } finally {
    conn.release();
  }
}

export async function getLevelScores(
  levelId: string,
  limit: number,
  offset: number,
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const pool = getPool();
  const [countRows] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS total FROM leaderboard_entries WHERE level_id = ?',
    [levelId],
  );
  const [rows] = await pool.query<LbRow[]>(
    `SELECT user_id, display_name, score, stars, level_id, time_seconds, achieved_at
       FROM leaderboard_entries
      WHERE level_id = ?
      ORDER BY score DESC, achieved_at ASC
      LIMIT ? OFFSET ?`,
    [levelId, limit, offset],
  );
  return { entries: rows.map(toEntry), total: countRows[0]?.total ?? 0 };
}

export async function getGlobalScores(
  limit: number,
  offset: number,
): Promise<{ entries: GlobalEntry[]; total: number }> {
  const pool = getPool();
  const [countRows] = await pool.query<CountRow[]>(
    'SELECT COUNT(DISTINCT user_id) AS total FROM leaderboard_entries',
  );
  const [rows] = await pool.query<GlobalRow[]>(
    `SELECT user_id, MAX(display_name) AS display_name, SUM(score) AS score, SUM(stars) AS stars
       FROM leaderboard_entries
      GROUP BY user_id
      ORDER BY score DESC, user_id ASC
      LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return {
    entries: rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      score: r.score,
      stars: r.stars,
    })),
    total: countRows[0]?.total ?? 0,
  };
}