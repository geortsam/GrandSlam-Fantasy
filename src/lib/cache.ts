// Small cache layer for hot reads (leaderboards, live tournament views).
// Uses Redis / Vercel KV when REDIS_URL (or KV_URL) is set, else process memory.
import Redis from "ioredis";

interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  incr(key: string): Promise<number>;
}

class MemoryStore implements CacheStore {
  private data = new Map<string, { value: string; expires: number }>();
  async get(key: string) {
    const hit = this.data.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.data.delete(key);
      return null;
    }
    return hit.value;
  }
  async set(key: string, value: string, ttlSeconds: number) {
    this.data.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
  async incr(key: string) {
    const next = Number((await this.get(key)) ?? "0") + 1;
    await this.set(key, String(next), 60 * 60 * 24 * 30);
    return next;
  }
}

class RedisStore implements CacheStore {
  constructor(private client: Redis) {}
  async get(key: string) {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, "EX", ttlSeconds);
  }
  async incr(key: string) {
    return this.client.incr(key);
  }
}

const globalForCache = globalThis as unknown as { cacheStore?: CacheStore };

function store(): CacheStore {
  if (globalForCache.cacheStore) return globalForCache.cacheStore;
  const url = process.env.REDIS_URL ?? process.env.KV_URL;
  globalForCache.cacheStore = url
    ? new RedisStore(new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false }))
    : new MemoryStore();
  return globalForCache.cacheStore;
}

/**
 * Cached read keyed by a "generation" counter. Score polls bump the
 * generation, which invalidates every derived view at once.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const gen = (await store().get("scores:generation")) ?? "0";
    const fullKey = `${key}:g${gen}`;
    const hit = await store().get(fullKey);
    if (hit) return JSON.parse(hit) as T;
    const value = await load();
    await store().set(fullKey, JSON.stringify(value), ttlSeconds);
    return value;
  } catch (err) {
    // The cache is an optimisation; never fail a request because it is down.
    console.warn("cache unavailable", err);
    return load();
  }
}

export async function bumpScoresGeneration(): Promise<void> {
  try {
    await store().incr("scores:generation");
  } catch (err) {
    console.warn("cache unavailable", err);
  }
}
