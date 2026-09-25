/**
 * Seed script: populates leaderboard data with sample players.
 * Writes to MySQL when configured, otherwise the JSON-file store.
 * Run with: npm run seed
 */
import { initDataStore, dataStoreIsDb } from './services/dataStore.js';

const DEMO_USERS = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' },
  { id: 'diana', name: 'Diana' },
  { id: 'elias', name: 'Elias' },
];

const LEVELS = ['tutorial', 'evaporation', 'condensation', 'pressure', 'rotation', 'typhoon', 'boss'];

const MAX_SCORES: Record<string, number> = {
  tutorial: 0,
  evaporation: 2500,
  condensation: 2800,
  pressure: 2800,
  rotation: 3000,
  typhoon: 3500,
  boss: 5000,
};

function randomScore(level: string): number {
  const max = MAX_SCORES[level] ?? 3000;
  return Math.floor(Math.random() * max * 0.8 + max * 0.2);
}

function randomStars(score: number, max: number): number {
  if (max === 0) return 3;
  const ratio = score / max;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
}

async function main(): Promise<void> {
  const dataStore = await initDataStore();

  for (const user of DEMO_USERS) {
    for (const level of LEVELS) {
      const score = randomScore(level);
      const max = MAX_SCORES[level] ?? 3000;
      await dataStore.submitScore({
        userId: user.id,
        displayName: user.name,
        score,
        stars: randomStars(score, max),
        levelId: level,
        time: Math.floor(Math.random() * 60 + 20),
        achievedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
      });
    }
  }

  const target = dataStoreIsDb() ? 'MySQL' : 'file store';
  console.log(`✅ Seeded leaderboard data for ${DEMO_USERS.length} users across ${LEVELS.length} levels (${target}).`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', (err as Error).message);
  process.exit(1);
});