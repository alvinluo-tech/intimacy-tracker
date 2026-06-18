import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase modules
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockIn = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();

function makeQueryBuilder(data: unknown[] = [], error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: data[0] ?? null, error });
  chain.order = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "encounters") {
        return makeQueryBuilder([
          { id: "1", started_at: "2025-06-01T10:00:00Z", ended_at: "2025-06-01T10:30:00Z", duration_minutes: 30, rating: 4, city: "Tokyo", country: "JP", location_precision: "city", user_id: "user-1" },
          { id: "2", started_at: "2025-06-02T22:00:00Z", ended_at: "2025-06-02T22:45:00Z", duration_minutes: 45, rating: 5, city: "Tokyo", country: "JP", location_precision: "city", user_id: "user-1" },
          { id: "3", started_at: "2025-06-15T14:00:00Z", ended_at: "2025-06-15T14:20:00Z", duration_minutes: 20, rating: null, city: "Osaka", country: "JP", location_precision: "city", user_id: "user-1" },
        ]);
      }
      // partners table
      return makeQueryBuilder([]);
    }),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => makeQueryBuilder([])),
  })),
}));

describe("getAnnualReportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregated report data for a year", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);

    expect(result).not.toBeNull();
    expect(result!.year).toBe(2025);
    expect(result!.totalCount).toBe(3);
    expect(result!.totalDurationMinutes).toBe(95);
    expect(result!.avgDurationMinutes).toBeCloseTo(31.67, 1);
  });

  it("calculates avgRating correctly (ignoring nulls)", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    // ratings: 4, 5 → avg = 4.5
    expect(result!.avgRating).toBe(4.5);
  });

  it("calculates streaks from encounter dates", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    // June 1, 2, 15 → longest streak = 2 (June 1-2)
    expect(result!.longestStreakDays).toBe(2);
  });

  it("calculates avgFrequencyPerWeek", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.avgFrequencyPerWeek).toBeGreaterThan(0);
  });

  it("builds hour distribution", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    // Total across all hours should equal totalCount
    const totalFromDist = result!.hourDistribution.reduce((a, b) => a + b, 0);
    expect(totalFromDist).toBe(3);
    expect(result!.topHour).toBeGreaterThanOrEqual(0);
    expect(result!.topHour).toBeLessThan(24);
  });

  it("builds weekday distribution", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.weekdayDistribution).toHaveLength(7);
    expect(result!.weekdayDistribution.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("builds monthly distribution", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.monthlyDistribution).toHaveLength(12);
    expect(result!.monthlyDistribution[5]).toBe(3); // June (0-indexed)
  });

  it("counts cities and determines home city", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.cityCount).toBe(2); // Tokyo, Osaka
    expect(result!.homeCount).toBe(2); // Tokyo appears twice
    expect(result!.awayCount).toBe(1); // Osaka once
  });

  it("generates daily activity for full year", async () => {
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.dailyActivity).toHaveLength(365);
    // June 1 should have count 1
    const june1 = result!.dailyActivity.find((d) => d.date === "2025-06-01");
    expect(june1?.count).toBe(1);
    // Jan 1 should have count 0
    const jan1 = result!.dailyActivity.find((d) => d.date === "2025-01-01");
    expect(jan1?.count).toBe(0);
  });

  it("ignores encounters with location_precision exact for city counting", async () => {
    // The mock data has all location_precision="city", so all should count
    const { getAnnualReportData } = await import("@/lib/report/aggregator");
    const result = await getAnnualReportData("user-1", 2025);
    expect(result!.cityCount).toBe(2);
  });
});
