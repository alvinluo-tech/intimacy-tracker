import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRatelimit() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: false,
      prefix: "rl",
    });
  }
  return ratelimit;
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
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 * Falls back to allowing all requests if Redis is not configured.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const windowMs = config.windowMs ?? 60_000;
  const max = config.max ?? 10;
  const now = Date.now();
  const resetAt = Math.ceil((now + windowMs) / 1000) * 1000;

  const instance = getRatelimit();
  if (!instance) {
    return { allowed: true, remaining: max, resetAt };
  }

  const override = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    analytics: false,
    prefix: "rl",
  });

  const { success, remaining } = await override.limit(key);
  return { allowed: success, remaining, resetAt };
}
