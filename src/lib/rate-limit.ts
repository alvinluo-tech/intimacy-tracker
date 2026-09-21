import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let missingEnvWarned = false;

// In-memory fallback used when Redis is unconfigured or unreachable. It is
// process-local (per server instance), so it is a best-effort guard — much
// safer than failing open and disabling rate limiting entirely.
const memoryBuckets = new Map<string, number[]>();

function memoryLimit(
  key: string,
  windowMs: number,
  max: number,
  now: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const windowStart = now - windowMs;
  const hits = (memoryBuckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= max) {
    memoryBuckets.set(key, hits);
    return { allowed: false, remaining: 0, resetAt: hits[0] + windowMs };
  }

  hits.push(now);
  memoryBuckets.set(key, hits);

  // Opportunistic cleanup so abandoned keys don't accumulate forever
  if (memoryBuckets.size > 10_000) {
    for (const [k, v] of memoryBuckets) {
      if (v.length === 0 || v[v.length - 1] <= windowStart) memoryBuckets.delete(k);
    }
  }

  return { allowed: true, remaining: max - hits.length, resetAt: now + windowMs };
}

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window rate limiter backed by Upstash Redis when configured.
 * When Redis is unconfigured or unreachable, falls back to an in-memory
 * limiter instead of allowing unlimited traffic.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const windowMs = config.windowMs ?? 60_000;
  const max = config.max ?? 10;
  const now = Date.now();
  const resetAt = Math.ceil((now + windowMs) / 1000) * 1000;

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    if (!missingEnvWarned) {
      missingEnvWarned = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured — using in-memory rate limiting (per-instance)"
      );
    }
    return memoryLimit(key, windowMs, max, now);
  }

  if (!redis) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }

  const override = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    analytics: false,
    prefix: "rl",
  });

  try {
    const { success, remaining } = await override.limit(key);
    return { allowed: success, remaining, resetAt };
  } catch (err) {
    console.error("[rate-limit] Redis error — using in-memory fallback", err);
    return memoryLimit(key, windowMs, max, now);
  }
}
