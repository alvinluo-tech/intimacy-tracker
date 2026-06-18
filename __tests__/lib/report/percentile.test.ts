import { describe, it, expect } from "vitest";
import {
  getFrequencyPercentile,
  getDurationPercentile,
  getStreakPercentile,
  getDiversityPercentile,
  getAllPercentiles,
} from "@/lib/report/percentile";

describe("getFrequencyPercentile", () => {
  it("returns Top 5% for very high frequency", () => {
    const result = getFrequencyPercentile(20, "25-34");
    expect(result.percentile).toBe(95);
    expect(result.label).toBe("Top 5%");
  });

  it("returns Top 10% for high frequency", () => {
    const result = getFrequencyPercentile(12, "25-34");
    expect(result.percentile).toBe(90);
  });

  it("returns Top 25% for above-average frequency", () => {
    const result = getFrequencyPercentile(6, "25-34");
    expect(result.percentile).toBe(75);
  });

  it("returns Above Average for median", () => {
    const result = getFrequencyPercentile(4, "25-34");
    expect(result.percentile).toBe(50);
    expect(result.label).toBe("Above Average");
  });

  it("returns Average for p25 range", () => {
    const result = getFrequencyPercentile(2, "25-34");
    expect(result.percentile).toBe(25);
    expect(result.label).toBe("Average");
  });

  it("returns Below Average for very low frequency", () => {
    const result = getFrequencyPercentile(0, "25-34");
    expect(result.percentile).toBe(10);
    expect(result.label).toBe("Below Average");
  });

  it("falls back to 25-34 for unknown age group", () => {
    const result = getFrequencyPercentile(4, "unknown");
    expect(result.percentile).toBe(50);
  });

  it("uses correct benchmarks for 18-24", () => {
    expect(getFrequencyPercentile(12, "18-24").percentile).toBe(95);
    expect(getFrequencyPercentile(3, "18-24").percentile).toBe(50);
  });

  it("uses correct benchmarks for 55+", () => {
    expect(getFrequencyPercentile(8, "55+").percentile).toBe(95);
    expect(getFrequencyPercentile(2, "55+").percentile).toBe(50);
  });
});

describe("getDurationPercentile", () => {
  it("returns Top 5% for 60+ minutes", () => {
    expect(getDurationPercentile(60).percentile).toBe(95);
  });

  it("returns Top 10% for 40+ minutes", () => {
    expect(getDurationPercentile(40).percentile).toBe(90);
  });

  it("returns Top 25% for 25+ minutes", () => {
    expect(getDurationPercentile(25).percentile).toBe(75);
  });

  it("returns Above Average for 15+ minutes", () => {
    expect(getDurationPercentile(15).percentile).toBe(50);
  });

  it("returns Below Average for under 8 minutes", () => {
    expect(getDurationPercentile(5).percentile).toBe(10);
  });
});

describe("getStreakPercentile", () => {
  it("returns Top 5% for 21+ day streak", () => {
    expect(getStreakPercentile(21).percentile).toBe(95);
  });

  it("returns Below Average for 1-day streak", () => {
    expect(getStreakPercentile(1).percentile).toBe(10);
  });
});

describe("getDiversityPercentile", () => {
  it("returns Top 5% for 10+ cities", () => {
    expect(getDiversityPercentile(10).percentile).toBe(95);
  });

  it("returns Below Average for 0 cities", () => {
    expect(getDiversityPercentile(0).percentile).toBe(10);
  });
});

describe("getAllPercentiles", () => {
  it("returns all four percentile categories", () => {
    const result = getAllPercentiles(4, 15, 4, 2);
    expect(result).toHaveProperty("frequency");
    expect(result).toHaveProperty("duration");
    expect(result).toHaveProperty("streak");
    expect(result).toHaveProperty("diversity");
  });

  it("passes age group to frequency percentile", () => {
    const result = getAllPercentiles(8, 15, 4, 2, "55+");
    expect(result.frequency.percentile).toBe(95);
  });
});
