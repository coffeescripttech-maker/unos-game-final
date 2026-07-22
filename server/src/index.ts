import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { healthRouter } from './routes/health.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { progressRouter } from './routes/progress.js';
import { setupSocketHandlers } from './socket/handler.js';

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

// ── Socket.IO ────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

setupSocketHandlers(io);

// ── Start ────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`[UNOS Server] Running on http://localhost:${config.port} (${config.nodeEnv})`);
});

export { app, httpServer, io };
