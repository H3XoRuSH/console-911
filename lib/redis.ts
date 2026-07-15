import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'local_cache.json');

// Helper to read local json cache
function readLocalCache(): Record<string, unknown> {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Helper to write local json cache
function writeLocalCache(data: Record<string, unknown>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local filesystem cache:', e);
  }
}

interface LeaderboardMember {
  member: string;
  score: number;
}

// Local mock client implementing Upstash Redis API interfaces
const localRedisMock = {
  async get<T>(key: string): Promise<T | null> {
    const cache = readLocalCache();
    const val = cache[key];
    if (val === undefined) return null;
    return val as T;
  },
  async set(key: string, value: unknown): Promise<'OK'> {
    const cache = readLocalCache();
    cache[key] = value;
    writeLocalCache(cache);
    return 'OK';
  },
  async zadd(key: string, scoreMember: LeaderboardMember): Promise<number> {
    const cache = readLocalCache();
    if (!Array.isArray(cache[key])) {
      cache[key] = [];
    }
    const list = cache[key] as LeaderboardMember[];
    const filtered = list.filter((item) => item.member !== scoreMember.member);
    filtered.push({ member: scoreMember.member, score: scoreMember.score });
    cache[key] = filtered;
    writeLocalCache(cache);
    return 1;
  },
  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; withScores?: boolean }
  ): Promise<unknown[]> {
    const cache = readLocalCache();
    const list = (cache[key] || []) as LeaderboardMember[];
    const sorted = [...list].sort((a, b) => {
      return options?.rev ? b.score - a.score : a.score - b.score;
    });
    const sliced = sorted.slice(start, stop + 1);
    if (options?.withScores) {
      const flat: unknown[] = [];
      for (const item of sliced) {
        flat.push(item.member, item.score);
      }
      return flat;
    }
    return sliced.map((item) => item.member);
  }
};

export interface RedisClientMock {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  zadd(key: string, scoreMember: LeaderboardMember): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; withScores?: boolean }
  ): Promise<unknown[]>;
}

let redis: Redis | RedisClientMock | null = null;

const isDevMode = process.env.DEV_MODE === 'Y';
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (isDevMode) {
  redis = localRedisMock;
  console.log('DEV_MODE is active. Initialized local filesystem Redis cache.');
} else if (url && token) {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
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
      .replace(/[^A-Z0-9_-]/g, '')
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
