import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

/**
 * MySQL connection pool for the UNOS server.
 *
 * Enabled when a DATABASE_URL or the DB_* environment vars are present
 * (see server/.env). When the DB is unavailable the server gracefully
 * falls back to the JSON-file store so local dev keeps working.
 */

const db = config.db;
const configured =
  !!db.url || (!!db.host && !!db.name && !!db.user);

let pool: mysql.Pool | null = null;
let failureLogged = false;

export function isDbConfigured(): boolean {
  return configured;
}

export function getPool(): mysql.Pool {
  if (pool) return pool;
  if (!configured) {
    throw new Error('MySQL is not configured (set DATABASE_URL or DB_* vars)');
  }

  pool = db.url
    ? mysql.createPool({ uri: db.url, connectionLimit: db.connectionLimit })
    : mysql.createPool({
        host: db.host,
        port: db.port,
        database: db.name,
        user: db.user,
        password: db.password,
        connectionLimit: db.connectionLimit,
      });

  return pool;
}

let schemaReady = false;

/** Create missing tables on boot. Idempotent. */
export async function ensureSchema(): Promise<void> {
  if (schemaReady || !configured) return;
  const conn = await getPool().getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        level_id VARCHAR(32) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        display_name VARCHAR(64) NOT NULL,
        score INT NOT NULL DEFAULT 0,
        stars TINYINT NOT NULL DEFAULT 0,
        time_seconds INT NOT NULL DEFAULT 0,
        achieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (level_id, user_id),
        KEY idx_lb_score (level_id, score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS player_progress (
        user_id VARCHAR(64) NOT NULL,
        level_id VARCHAR(32) NOT NULL,
        score INT NOT NULL DEFAULT 0,
        stars TINYINT NOT NULL DEFAULT 0,
        time_seconds INT NOT NULL DEFAULT 0,
        completed TINYINT(1) NOT NULL DEFAULT 0,
        facts_unlocked VARCHAR(512) NOT NULL DEFAULT '',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, level_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    schemaReady = true;
  } finally {
    conn.release();
  }
}

/** Probe connectivity; logs (once) and returns false when the DB is down. */
export async function testConnection(): Promise<boolean> {
  if (!configured) return false;
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch (err) {
    if (!failureLogged) {
      console.warn('[db] MySQL unreachable — falling back to file store:', (err as Error).message);
      failureLogged = true;
    }
    return false;
  }
}