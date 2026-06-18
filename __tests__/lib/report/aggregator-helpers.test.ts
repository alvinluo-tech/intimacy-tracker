import { describe, it, expect } from "vitest";

// Test the pure calculation patterns used in aggregator.ts
// The main getAnnualReportData requires Supabase, so we test the logic patterns directly.

describe("aggregator calculation patterns", () => {
  describe("getDaysInYear", () => {
    function getDaysInYear(year: number): number {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    it("2024 is a leap year (366 days)", () => {
      expect(getDaysInYear(2024)).toBe(366);
    });

    it("2025 is not a leap year (365 days)", () => {
      expect(getDaysInYear(2025)).toBe(365);
    });

    it("2000 is a leap year (366 days)", () => {
      expect(getDaysInYear(2000)).toBe(366);
    });

    it("1900 is not a leap year (365 days)", () => {
      expect(getDaysInYear(1900)).toBe(365);
    });
  });

  describe("calculateStreaks", () => {
    function calculateStreaks(sortedDates: string[]): { longest: number; current: number } {
      if (sortedDates.length === 0) return { longest: 0, current: 0 };

      const uniqueDates = [...new Set(sortedDates)].sort();
      let longest = 1;
      let current = 1;
      let tempStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          longest = Math.max(longest, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      lastDate.setHours(0, 0, 0, 0);
      const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLast <= 1) {
        current = tempStreak;
      } else {
        current = 0;
      }

      return { longest, current };
    }

    it("returns 0 for empty input", () => {
      expect(calculateStreaks([])).toEqual({ longest: 0, current: 0 });
    });

    it("calculates consecutive day streaks", () => {
      const dates = ["2025-06-01", "2025-06-02", "2025-06-03"];
      const result = calculateStreaks(dates);
      expect(result.longest).toBe(3);
    });

    it("handles gaps in dates", () => {
      const dates = ["2025-06-01", "2025-06-02", "2025-06-05", "2025-06-06"];
      const result = calculateStreaks(dates);
      expect(result.longest).toBe(2);
    });

    it("deduplicates dates", () => {
      const dates = ["2025-06-01", "2025-06-01", "2025-06-02"];
      const result = calculateStreaks(dates);
      expect(result.longest).toBe(2);
    });

    it("handles single date", () => {
      const dates = ["2025-06-01"];
      const result = calculateStreaks(dates);
      expect(result.longest).toBe(1);
    });
  });

  describe("findMostFrequent", () => {
    function findMostFrequent(distribution: number[]): number {
      let maxValue = 0;
      let maxIndex = 0;
      for (let i = 0; i < distribution.length; i++) {
        if (distribution[i] > maxValue) {
          maxValue = distribution[i];
          maxIndex = i;
        }
      }
      return maxIndex;
    }

    it("returns index of highest value", () => {
      expect(findMostFrequent([0, 5, 3, 8, 2])).toBe(3);
    });

    it("returns 0 when all zeros", () => {
      expect(findMostFrequent([0, 0, 0])).toBe(0);
    });

    it("returns first index when tied", () => {
      expect(findMostFrequent([5, 5, 3])).toBe(0);
    });

    it("works with single element", () => {
      expect(findMostFrequent([42])).toBe(0);
    });
  });

  describe("avgFrequencyPerWeek", () => {
    it("calculates weekly average from annual count", () => {
      const avg = (52 / 365) * 7;
      expect(avg).toBeCloseTo(1, 0);
    });

    it("returns 0 for 0 encounters", () => {
      const avg = (0 / 365) * 7;
      expect(avg).toBe(0);
    });
  });

  describe("dailyActivity generation", () => {
    it("generates 365 entries for non-leap year", () => {
      const year = 2025;
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      let count = 0;
      for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
        count++;
      }
      expect(count).toBe(365);
    });

    it("generates 366 entries for leap year", () => {
      const year = 2024;
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      let count = 0;
      for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
        count++;
      }
      expect(count).toBe(366);
    });
  });
});
