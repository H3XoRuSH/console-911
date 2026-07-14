import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  try {
    redis = new Redis({
      url,
      token
    });
    console.log('Upstash Redis client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Upstash Redis client:', error);
  }
} else {
  console.warn(
    'Upstash Redis environment variables are missing. Using in-memory fallback for leaderboard and dialogue caching.'
  );
}

export { redis };

// Simple in-memory fallback database for local testing
interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

const localLeaderboard: LeaderboardEntry[] = [
  { name: 'DESK_CHIEF_911', score: 1350, date: '2026-07-14' },
  { name: 'PRO_DISPATCHER', score: 1100, date: '2026-07-14' },
  { name: 'ROOKIE_HEAVY_LINE', score: 850, date: '2026-07-14' }
];

/**
 * Retrieves the global high scores leaderboard.
 * Queries Upstash Redis Sorted Set 'global_leaderboard' (descending order).
 */
export async function getLeaderboard(): Promise<{ name: string; score: number }[]> {
  if (redis) {
    try {
      // zrange global_leaderboard 0 9 rev withscores
      const data = await redis.zrange('global_leaderboard', 0, 9, {
        rev: true,
        withScores: true
      });

      const result: { name: string; score: number }[] = [];
      // Upstash returns elements in flat arrays like [member1, score1, member2, score2, ...]
      for (let i = 0; i < data.length; i += 2) {
        result.push({
          name: String(data[i]),
          score: Number(data[i + 1])
        });
      }
      return result;
    } catch (error) {
      console.error('Failed to fetch leaderboard from Upstash Redis, falling back:', error);
    }
  }

  // Local fallback sorting
  return localLeaderboard
    .map((entry) => ({ name: entry.name, score: entry.score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Submits a new player score to the leaderboard.
 * Adds/updates entry in Upstash Redis Sorted Set 'global_leaderboard'.
 */
export async function submitScore(name: string, score: number): Promise<void> {
  const cleanName =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 15) || 'DISPATCHER';

  if (redis) {
    try {
      // Add or update the member score
      await redis.zadd('global_leaderboard', { score, member: cleanName });
      console.log(`Leaderboard updated: ${cleanName} = ${score}`);
      return;
    } catch (error) {
      console.error('Failed to submit score to Upstash Redis, falling back:', error);
    }
  }

  // Local fallback write
  localLeaderboard.push({
    name: cleanName,
    score,
    date: new Date().toISOString().split('T')[0]
  });
}
