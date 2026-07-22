/**
 * Seed script: populates the in-memory store with sample leaderboard data.
 * Run with: npm run seed
 */
import { store } from './services/store.js';
import type { LeaderboardEntry } from './routes/leaderboard.js';

const DEMO_USERS = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' },
  { id: 'diana', name: 'Diana' },
  { id: 'elias', name: 'Elias' },
];

const LEVELS = ['tutorial', 'evaporation', 'condensation', 'pressure', 'rotation', 'typhoon', 'boss'];

function randomScore(level: string): number {
  const maxScores: Record<string, number> = {
    tutorial: 0,
    evaporation: 2500,
    condensation: 2800,
    pressure: 2800,
    rotation: 3000,
    typhoon: 3500,
    boss: 5000,
  };
  const max = maxScores[level] ?? 3000;
  return Math.floor(Math.random() * max * 0.8 + max * 0.2);
}

function randomStars(score: number, max: number): number {
  if (max === 0) return 3;
  const ratio = score / max;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
}

for (const user of DEMO_USERS) {
  for (const level of LEVELS) {
    const key = `lb_${level}`;
    const existing = store.get<Record<string, LeaderboardEntry>>(key) ?? {};

    const score = randomScore(level);
    const maxScores: Record<string, number> = {
      tutorial: 0, evaporation: 2500, condensation: 2800,
      pressure: 2800, rotation: 3000, typhoon: 3500, boss: 5000,
    };

    existing[user.id] = {
      userId: user.id,
      displayName: user.name,
      score,
      stars: randomStars(score, maxScores[level] ?? 3000),
      levelId: level,
      time: Math.floor(Math.random() * 60 + 20),
      achievedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
    };

    store.set(key, existing);
  }
}

console.log(`✅ Seeded leaderboard data for ${DEMO_USERS.length} users across ${LEVELS.length} levels.`);
