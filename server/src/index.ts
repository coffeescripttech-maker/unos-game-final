import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { healthRouter } from './routes/health.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { progressRouter } from './routes/progress.js';
import { setupSocketHandlers } from './socket/handler.js';
import { initDataStore } from './services/dataStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// ── Middleware ────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// ── REST Routes ──────────────────────────────────────────────

app.use('/api', healthRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/progress', progressRouter);

// ── Static client (production single-service deploy) ─────────
// Serves the built Vite app from client/dist when present. The SPA
// fallback must NOT catch /api or /socket.io (the socket server owns that
// path), only page routes like /dashboard, /leaderboard, /boss.

const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');

function setupStaticHosting() {
  if (!fs.existsSync(clientDist)) {
    console.log('[static] client/dist not found — serving API only (dev mode).');
    return;
  }
  app.use(express.static(clientDist, { index: 'index.html' }));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`[static] Serving client from ${clientDist}`);
}

// ── Socket.IO ────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

setupSocketHandlers(io);

// ── Start ────────────────────────────────────────────────────

initDataStore()
  .then(() => {
    setupStaticHosting();
    httpServer.listen(config.port, () => {
      console.log(`[UNOS Server] Running on http://localhost:${config.port} (${config.nodeEnv})`);
    });
  })
  .catch((err) => {
    console.error('[startup] Failed to start:', (err as Error).message);
    process.exit(1);
  });

export { app, httpServer, io };
