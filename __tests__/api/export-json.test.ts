import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();

function createMockQuery(data: unknown[], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then(resolve: (val: { data: unknown[]; error: unknown }) => void) {
      resolve({ data, error });
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === "audit_events") {
        return { insert: mockInsert };
      }
      // encounters table — return empty by default; tests override via mockGetUser
      return createMockQuery([]);
    }),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  })),
}));

const mockData = [
  {
    id: "enc-1",
    started_at: "2026-01-01T12:00:00Z",
    ended_at: "2026-01-01T12:30:00Z",
    duration_minutes: 30,
    city: "Tokyo",
    country: "Japan",
    rating: 4,
    mood: "Happy",
    created_at: "2026-01-01T12:00:00Z",
    partner: { nickname: "Alice" },
    encounter_tags: [{ tag: { id: "tag-1", name: "romantic", color: "#f00" } }],
  },
];

describe("GET /api/export-json", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 401 when not authenticated", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    });

    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("returns 429 when rate limited", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    });

    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many requests");
  });

  it("returns 200 with correct JSON structure on successful export", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === "audit_events") {
          return { insert: mockInsert };
        }
        return createMockQuery(mockData);
      }),
    });

    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Export-Rows")).toBe("1");
    expect(res.headers.get("Content-Disposition")).toContain("intimacy-tracker-export-");

    const body = await res.json();
    expect(body).toHaveProperty("exported_at");
    expect(body.rows).toBe(1);
    expect(body.data).toHaveLength(1);

    const row = body.data[0];
    expect(row.record_id).toBe("enc-1");
    expect(row.tags).toEqual(["romantic"]);
    expect(row.partner_nickname).toBe("Alice");
    expect(row.started_at).toBe("2026-01-01T12:00:00Z");
    expect(row.ended_at).toBe("2026-01-01T12:30:00Z");
    expect(row.duration_minutes).toBe(30);
    expect(row.city).toBe("Tokyo");
    expect(row.country).toBe("Japan");
    expect(row.rating).toBe(4);
    expect(row.mood).toBe("Happy");
  });

  it("logs audit event on export", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === "audit_events") {
          return { insert: mockInsert };
        }
        return createMockQuery(mockData);
      }),
    });

    const { GET } = await import("@/app/api/export-json/route");
    await GET();

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      event_type: "export_json",
      metadata: expect.objectContaining({ rows: 1 }) as object,
    });
  });
});
