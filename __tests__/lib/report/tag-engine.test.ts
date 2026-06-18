import { describe, it, expect } from "vitest";
import { generatePersonalTags } from "@/lib/report/tag-engine";
import type { AnnualReportData } from "@/lib/report/aggregator";

function makeData(overrides: Partial<AnnualReportData> = {}): AnnualReportData {
  return {
    year: 2025,
    totalCount: 50,
    totalDurationMinutes: 750,
    avgDurationMinutes: 15,
    avgRating: 3.5,
    longestStreakDays: 3,
    currentStreakDays: 1,
    avgFrequencyPerWeek: 1,
    topHour: 22,
    topWeekday: 5,
    topMonth: 6,
    cityCount: 1,
    homeCount: 40,
    awayCount: 10,
    weekdayDistribution: [5, 5, 5, 5, 5, 10, 10],
    hourDistribution: new Array(24).fill(2),
    monthlyDistribution: new Array(12).fill(4),
    dailyActivity: [],
    ...overrides,
  };
}

describe("generatePersonalTags", () => {
  it("returns at most 6 tags", () => {
    const data = makeData({
      totalCount: 200,
      avgFrequencyPerWeek: 4,
      avgDurationMinutes: 35,
      avgRating: 4.5,
      longestStreakDays: 30,
      cityCount: 10,
      homeCount: 50,
      awayCount: 50,
    });
    const tags = generatePersonalTags(data);
    expect(tags.length).toBeLessThanOrEqual(6);
  });

  it("returns homebody for zero-count data (cityCount 0 <= 1)", () => {
    // The homebody condition checks cityCount <= 1, which is true even for 0.
    // This is expected behavior — no cities recorded = homebody.
    const data = makeData({
      totalCount: 0,
      cityCount: 0,
      homeCount: 0,
      awayCount: 0,
      weekdayDistribution: new Array(7).fill(0),
      hourDistribution: new Array(24).fill(0),
      monthlyDistribution: new Array(12).fill(0),
    });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "homebody")).toBeTruthy();
  });

  it("includes night-owl when >40% encounters at night", () => {
    const hourDist = new Array(24).fill(0);
    hourDist[22] = 5;
    hourDist[23] = 5;
    hourDist[0] = 5;
    const data = makeData({ totalCount: 20, hourDistribution: hourDist });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "night-owl")).toBeTruthy();
  });

  it("includes weekend-warrior when >60% on weekends", () => {
    const weekdayDist = [15, 1, 1, 1, 1, 1, 15];
    const data = makeData({ totalCount: 35, weekdayDistribution: weekdayDist });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "weekend-warrior")).toBeTruthy();
  });

  it("includes consistent-dater when avgFrequency >= 3", () => {
    const data = makeData({ avgFrequencyPerWeek: 3.5 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "consistent-dater")).toBeTruthy();
  });

  it("includes quality-seeker when duration >= 30 and rating >= 4", () => {
    const data = makeData({ avgDurationMinutes: 35, avgRating: 4.2 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "quality-seeker")).toBeTruthy();
  });

  it("includes speed-runner when duration <= 10 and count >= 10", () => {
    const data = makeData({ avgDurationMinutes: 8, totalCount: 20 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "speed-runner")).toBeTruthy();
  });

  it("includes centurion when totalCount >= 100", () => {
    const data = makeData({ totalCount: 150 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "centurion")).toBeTruthy();
  });

  it("includes city-explorer when cityCount >= 3", () => {
    const data = makeData({ cityCount: 4 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "city-explorer")).toBeTruthy();
  });

  it("includes jet-setter when cityCount >= 5", () => {
    const data = makeData({ cityCount: 6 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "jet-setter")).toBeTruthy();
  });

  it("includes homebody when cityCount <= 1", () => {
    const data = makeData({ cityCount: 1 });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "homebody")).toBeTruthy();
  });

  it("includes summer-passion when >35% in summer months", () => {
    const monthlyDist = new Array(12).fill(1);
    monthlyDist[5] = 10; // June
    monthlyDist[6] = 10; // July
    monthlyDist[7] = 10; // August
    const data = makeData({ totalCount: 40, monthlyDistribution: monthlyDist });
    const tags = generatePersonalTags(data);
    expect(tags.find((t) => t.id === "summer-passion")).toBeTruthy();
  });

  it("sorts tags by category order", () => {
    const data = makeData({
      totalCount: 150,
      avgFrequencyPerWeek: 4,
      avgDurationMinutes: 35,
      avgRating: 4.5,
      longestStreakDays: 30,
      cityCount: 10,
    });
    const tags = generatePersonalTags(data);
    const categoryOrder = { time: 0, frequency: 1, persistence: 2, location: 3, season: 4 };
    for (let i = 1; i < tags.length; i++) {
      expect(categoryOrder[tags[i].category]).toBeGreaterThanOrEqual(
        categoryOrder[tags[i - 1].category]
      );
    }
  });
});
