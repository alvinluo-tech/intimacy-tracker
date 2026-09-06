import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockLimit = vi.fn().mockResolvedValue({ success: true, remaining: 9 });

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimit;
    constructor(_opts: unknown) {}
    static slidingWindow(_max: number, _window: string) {
      return "sliding-window";
    }
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => {
  class MockRedis {
    constructor() {}
  }
  return { Redis: MockRedis };
});

describe("rateLimit without Redis env (in-memory fallback)", () => {
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows the first request under the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 max, 1 used
    expect(result.resetAt).toBeGreaterThan(0);
  });

  it("blocks requests beyond max within the window", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit("burst-key", { max: 5, windowMs: 30_000 });
      if (i < 4) expect(r.allowed).toBe(true);
    }
    const blocked = await rateLimit("burst-key", { max: 5, windowMs: 30_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks keys independently", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    await rateLimit("key-a", { max: 1, windowMs: 30_000 });
    const blocked = await rateLimit("key-a", { max: 1, windowMs: 30_000 });
    const other = await rateLimit("key-b", { max: 1, windowMs: 30_000 });
    expect(blocked.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });

  it("returns resetAt as a rounded future timestamp", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const now = Date.now();
    const result = await rateLimit("test-key");
    expect(result.resetAt).toBeGreaterThanOrEqual(now);
  });
});

describe("rateLimit with Redis env", () => {
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    mockLimit.mockResolvedValue({ success: true, remaining: 9 });
  });

  afterEach(() => {
    if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("uses Redis rate limiter when configured", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockLimit).toHaveBeenCalledWith("test-key");
  });

  it("returns allowed=false when rate limit exceeded", async () => {
    mockLimit.mockResolvedValue({ success: false, remaining: 0 });
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("creates override Ratelimit with custom config", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    await rateLimit("test-key", { max: 20, windowMs: 120000 });
    expect(mockLimit).toHaveBeenCalledWith("test-key");
  });

  it("falls back to in-memory limiting when Redis errors", async () => {
    mockLimit.mockRejectedValue(new Error("connection refused"));
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = await rateLimit("error-key", { max: 2, windowMs: 30_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
