import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  // Firebase Admin (optional — set to 'true' and provide creds to enable)
  firebase: {
    enabled: process.env.FIREBASE_ENABLED === 'true',
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },

  // MySQL (production persistence). Auto-detects DATABASE_URL or the DB_* vars.
  db: {
    url: process.env.DATABASE_URL ?? '',
    host: process.env.DB_HOST ?? '',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    name: process.env.DB_NAME ?? '',
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT ?? '10', 10),
  },

  // Leaderboard
  leaderboardPageSize: parseInt(process.env.LEADERBOARD_PAGE_SIZE ?? '20', 10),
} as const;
