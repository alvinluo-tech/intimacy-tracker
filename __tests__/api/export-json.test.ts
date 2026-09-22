import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      expect(table).toBe("audit_events");
      return { insert: mockInsert };
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

const mockCollect = vi.fn();
vi.mock("@/lib/export/collector", () => ({
  collectFullExport: (...args: unknown[]) => mockCollect(...args),
  MAX_EXPORT_ROWS: 10_000,
}));

function fullExportFixture() {
  return {
    ok: true as const,
    data: {
      schema_version: 1,
      app: "encounter",
      exported_at: "2026-09-22T12:00:00.000Z",
      rows: 1,
      truncated: false,
      profile: { timezone: "Asia/Shanghai" },
      partners: [{ id: "p-1", nickname: "Alice", color: null, avatar_url: null, is_default: null, source: "local", bound_user_id: null, status: "active" }],
      tags: [{ id: "t-1", name: "romantic", color: null }],
      encounters: [
        {
          id: "enc-1",
          started_at: "2026-01-01T12:00:00Z",
          ended_at: "2026-01-01T12:30:00Z",
          duration_minutes: 30,
          timezone: "Asia/Shanghai",
          rating: 4,
          mood: "Happy",
          climaxed: true,
          location_enabled: false,
          location_precision: "off",
          latitude: null,
          longitude: null,
          location_label: null,
          location_notes: null,
          city: "Tokyo",
          country: "Japan",
          partner_id: "p-1",
          partner_nickname: "Alice",
          share_notes_with_partner: false,
          notes: "secret",
          notes_unavailable: false,
          tags: ["romantic"],
          photos: [],
        },
      ],
    },
  };
}

describe("GET /api/export-json", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockCollect.mockResolvedValue(fullExportFixture());
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
    expect(mockCollect).not.toHaveBeenCalled();
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
    expect(mockCollect).not.toHaveBeenCalled();
  });

  it("returns the schema-versioned full export with row headers", async () => {
    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Export-Rows")).toBe("1");
    expect(res.headers.get("X-Export-Truncated")).toBe("false");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Disposition")).toContain("intimacy-tracker-export-");

    const body = await res.json();
    expect(body.schema_version).toBe(1);
    expect(body.app).toBe("encounter");
    expect(body.rows).toBe(1);
    expect(body.truncated).toBe(false);
    expect(body.profile).toEqual({ timezone: "Asia/Shanghai" });
    expect(body.partners).toHaveLength(1);
    expect(body.tags).toHaveLength(1);

    const encounter = body.encounters[0];
    expect(encounter.id).toBe("enc-1");
    expect(encounter.partner_nickname).toBe("Alice");
    expect(encounter.notes).toBe("secret");
    expect(encounter.tags).toEqual(["romantic"]);
    expect(encounter.climaxed).toBe(true);
  });

  it("returns 500 when collection fails", async () => {
    mockCollect.mockResolvedValueOnce({ ok: false, error: "database exploded" });

    const { GET } = await import("@/app/api/export-json/route");
    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    // The internal error text must not leak to the client.
    expect(body.error).not.toContain("database exploded");
  });

  it("logs an audit event with the row count", async () => {
    const { GET } = await import("@/app/api/export-json/route");
    await GET();

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      event_type: "export_json",
      metadata: expect.objectContaining({ rows: 1 }) as object,
    });
  });
});
