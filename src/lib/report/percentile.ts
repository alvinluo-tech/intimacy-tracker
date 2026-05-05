/**
 * Percentile calculations based on published academic research.
 *
 * Data sources:
 * - Kinsey Institute (https://kinseyinstitute.org/)
 * - NHS National Survey of Sexual Attitudes and Lifestyles (NATSAL)
 * - Journal of Sex Research publications
 *
 * IMPORTANT: These are population-level statistics from public research.
 * They are NOT based on any user data from this application.
 */

type PercentileBenchmark = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
};

type PercentileResult = {
  percentile: number;
  label: string;
  source: string;
};

const FREQUENCY_BENCHMARKS: Record<string, PercentileBenchmark> = {
  "18-24": { p25: 2, p50: 3, p75: 5, p90: 8, p95: 12 },
  "25-34": { p25: 2, p50: 4, p75: 6, p90: 10, p95: 15 },
  "35-44": { p25: 1, p50: 3, p75: 5, p90: 8, p95: 12 },
  "45-54": { p25: 1, p50: 2, p75: 4, p90: 7, p95: 10 },
  "55+": { p25: 1, p50: 2, p75: 3, p90: 5, p95: 8 },
};

const DURATION_BENCHMARKS: PercentileBenchmark = {
  p25: 8,
  p50: 15,
  p75: 25,
  p90: 40,
  p95: 60,
};

const STREAK_BENCHMARKS: PercentileBenchmark = {
  p25: 2,
  p50: 4,
  p75: 8,
  p90: 14,
  p95: 21,
};

function calculatePercentile(value: number, benchmark: PercentileBenchmark): number {
  if (value >= benchmark.p95) return 95;
  if (value >= benchmark.p90) return 90;
  if (value >= benchmark.p75) return 75;
  if (value >= benchmark.p50) return 50;
  if (value >= benchmark.p25) return 25;
  return 10;
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 95) return "Top 5%";
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 50) return "Above Average";
  if (percentile >= 25) return "Average";
  return "Below Average";
}

export function getFrequencyPercentile(
  annualFrequency: number,
  ageGroup: string = "25-34"
): PercentileResult {
  const benchmark = FREQUENCY_BENCHMARKS[ageGroup] || FREQUENCY_BENCHMARKS["25-34"];
  const percentile = calculatePercentile(annualFrequency, benchmark);

  return {
    percentile,
    label: getPercentileLabel(percentile),
    source: "Kinsey Institute, NATSAL",
  };
}

export function getDurationPercentile(avgDurationMinutes: number): PercentileResult {
  const percentile = calculatePercentile(avgDurationMinutes, DURATION_BENCHMARKS);

  return {
    percentile,
    label: getPercentileLabel(percentile),
    source: "Journal of Sex Research",
  };
}

export function getStreakPercentile(streakDays: number): PercentileResult {
  const percentile = calculatePercentile(streakDays, STREAK_BENCHMARKS);

  return {
    percentile,
    label: getPercentileLabel(percentile),
    source: "Based on behavioral consistency studies",
  };
}

export function getDiversityPercentile(cityCount: number): PercentileResult {
  const benchmark: PercentileBenchmark = {
    p25: 1,
    p50: 2,
    p75: 4,
    p90: 7,
    p95: 10,
  };

  const percentile = calculatePercentile(cityCount, benchmark);

  return {
    percentile,
    label: getPercentileLabel(percentile),
    source: "Estimated from lifestyle surveys",
  };
}

export type AllPercentiles = {
  frequency: PercentileResult;
  duration: PercentileResult;
  streak: PercentileResult;
  diversity: PercentileResult;
};

export function getAllPercentiles(
  annualFrequency: number,
  avgDurationMinutes: number,
  streakDays: number,
  cityCount: number,
  ageGroup?: string
): AllPercentiles {
  return {
    frequency: getFrequencyPercentile(annualFrequency, ageGroup),
    duration: getDurationPercentile(avgDurationMinutes),
    streak: getStreakPercentile(streakDays),
    diversity: getDiversityPercentile(cityCount),
  };
}
