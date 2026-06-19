/**
 * KV-based IP rate limiter for Cloudflare edge API routes.
 *
 * Uses the BIOARCHIVE_CACHE KV namespace (same as apiCache) with short TTLs.
 * Falls back to a per-process in-memory counter when KV is unavailable (local dev).
 *
 * Usage:
 *   const result = await rateLimit(request, 'contact', 5, 60);
 *   if (!result.allowed) return NextResponse.json({ error: result.error }, { status: 429 });
 */

const memRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

/**
 * @param request  - The incoming NextRequest (used to extract IP)
 * @param endpoint - A short identifier for the endpoint (e.g. 'contact', 'login')
 * @param limit    - Max allowed requests per window
 * @param windowSecs - Time window in seconds
 */
export async function rateLimit(
  request: Request,
  endpoint: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  // Determine the caller's IP from Cloudflare headers
  const ip =
    (request.headers as any).get?.('cf-connecting-ip') ||
    (request.headers as any).get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  const key = `rl:${endpoint}:${ip}`;
  const now = Date.now();
  const resetAt = now + windowSecs * 1000;

  const kv = (globalThis as any).BIOARCHIVE_CACHE;

  if (kv) {
    try {
      const raw = await kv.get(key, { type: 'json' }) as { count: number; resetAt: number } | null;

      if (raw && raw.resetAt > now) {
        // Window still active
        const newCount = raw.count + 1;
        await kv.put(key, JSON.stringify({ count: newCount, resetAt: raw.resetAt }), {
          expirationTtl: Math.ceil((raw.resetAt - now) / 1000),
        });
        if (newCount > limit) {
          return {
            allowed: false,
            remaining: 0,
            error: `Too many requests. Please wait ${Math.ceil((raw.resetAt - now) / 1000)} seconds.`,
          };
        }
        return { allowed: true, remaining: limit - newCount };
      } else {
        // New window
        await kv.put(key, JSON.stringify({ count: 1, resetAt }), { expirationTtl: windowSecs });
        return { allowed: true, remaining: limit - 1 };
      }
    } catch (err) {
      // KV error — fail open (don't block users due to infra issues)
      console.error('[rateLimit] KV error:', err);
      return { allowed: true, remaining: limit };
    }
  }

  // In-memory fallback (local dev / no KV)
  const entry = memRateLimitStore.get(key);
  if (entry && entry.resetAt > now) {
    entry.count += 1;
    if (entry.count > limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Too many requests. Please wait ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
      };
    }
    return { allowed: true, remaining: limit - entry.count };
  } else {
    memRateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1 };
  }
}
