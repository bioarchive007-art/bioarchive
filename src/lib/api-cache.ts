// In-memory cache fallback for environments without Cloudflare KV (e.g. local development)
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

export const apiCache = {
  get: async <T = any>(key: string): Promise<T | null> => {
    // 1. Try Cloudflare KV first
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      try {
        const cached = await kv.get(key, { type: 'json' });
        if (cached) return cached as T;
      } catch (err) {
        console.error(`[apiCache] KV get error for key "${key}":`, err);
      }
    }

    // 2. Fallback to in-memory cache
    const item = memoryCache.get(key);
    if (item) {
      if (item.expiresAt > Date.now()) {
        return item.data as T;
      }
      memoryCache.delete(key); // expired
    }
    return null;
  },

  set: async (key: string, data: any, ttlSeconds: number): Promise<void> => {
    // 1. Set in Cloudflare KV
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      try {
        await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
      } catch (err) {
        console.error(`[apiCache] KV put error for key "${key}":`, err);
      }
    }

    // 2. Set in-memory cache
    memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  delete: async (key: string): Promise<void> => {
    // 1. Delete from Cloudflare KV
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      try {
        await kv.delete(key);
      } catch (err) {
        console.error(`[apiCache] KV delete error for key "${key}":`, err);
      }
    }

    // 2. Delete from in-memory cache
    memoryCache.delete(key);
  },

  clearPattern: async (pattern: string): Promise<void> => {
    // 1. Clear from in-memory cache
    memoryCache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        memoryCache.delete(key);
      }
    });

    // 2. Clear from Cloudflare KV
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      try {
        const list = await kv.list({ prefix: pattern });
        if (list?.keys) {
          await Promise.allSettled(
            list.keys.map((k: { name: string }) => kv.delete(k.name))
          );
        }
      } catch (err) {
        console.error(`[apiCache] KV clearPattern error for prefix "${pattern}":`, err);
      }
    }
  }
};
