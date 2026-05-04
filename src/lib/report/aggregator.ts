import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/features/auth/queries";

export type DailyActivity = {
  date: string;
  count: number;
};

export type AnnualReportData = {
  year: number;
  totalCount: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
  avgRating: number | null;
  longestStreakDays: number;
  currentStreakDays: number;
  avgFrequencyPerWeek: number;
  topHour: number;
  topWeekday: number;
  topMonth: number;
  cityCount: number;
  homeCount: number;
  awayCount: number;
  weekdayDistribution: number[];
  hourDistribution: number[];
  monthlyDistribution: number[];
  dailyActivity: DailyActivity[];
};

function getDaysInYear(year: number): number {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

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

export async function getAnnualReportData(
  userId: string,
  year: number
): Promise<AnnualReportData | null> {
  const supabase = createSupabaseAdminClient();

  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate = `${year + 1}-01-01T00:00:00.000Z`;

  const { data: encounters, error } = await supabase
    .from("encounters")
    .select(`
      id,
      started_at,
      ended_at,
      duration_minutes,
      rating,
      city,
      country,
      location_precision
    `)
    .eq("user_id", userId)
    .gte("started_at", startDate)
    .lt("started_at", endDate)
    .order("started_at", { ascending: true });

  if (error || !encounters || encounters.length === 0) {
    return null;
  }

  const totalCount = encounters.length;
  const totalDurationMinutes = encounters.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0
  );
  const avgDurationMinutes = totalDurationMinutes / totalCount;

  const ratings = encounters.filter((e) => e.rating !== null).map((e) => e.rating!);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const encounterDates = encounters.map((e) => {
    const d = new Date(e.started_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const { longest: longestStreakDays, current: currentStreakDays } = calculateStreaks(encounterDates);

  const daysInYear = getDaysInYear(year);
  const avgFrequencyPerWeek = (totalCount / daysInYear) * 7;

  const hourDistribution = new Array(24).fill(0);
  const weekdayDistribution = new Array(7).fill(0);
  const monthlyDistribution = new Array(12).fill(0);
  const cityCounts: Record<string, number> = {};
  let homeCity: string | null = null;

  for (const encounter of encounters) {
    const d = new Date(encounter.started_at);
    const hour = d.getHours();
    const weekday = d.getDay();
    const month = d.getMonth();

    hourDistribution[hour]++;
    weekdayDistribution[weekday]++;
    monthlyDistribution[month]++;

    if (encounter.city && encounter.location_precision !== "exact") {
      cityCounts[encounter.city] = (cityCounts[encounter.city] || 0) + 1;
    }
  }

  const topHour = findMostFrequent(hourDistribution);
  const topWeekday = findMostFrequent(weekdayDistribution);
  const topMonth = findMostFrequent(monthlyDistribution);

  const cityCount = Object.keys(cityCounts).length;

  if (cityCount > 0) {
    let maxCount = 0;
    for (const [city, count] of Object.entries(cityCounts)) {
      if (count > maxCount) {
        maxCount = count;
        homeCity = city;
      }
    }
  }

  let homeCount = 0;
  let awayCount = 0;
  for (const encounter of encounters) {
    if (encounter.city && encounter.location_precision !== "exact") {
      if (encounter.city === homeCity) {
        homeCount++;
      } else {
        awayCount++;
      }
    }
  }

  // Calculate daily activity for heatmap
  const dailyCounts: Record<string, number> = {};
  for (const encounter of encounters) {
    const d = new Date(encounter.started_at);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
  }

  const dailyActivity: DailyActivity[] = [];
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyActivity.push({
      date: dateStr,
      count: dailyCounts[dateStr] || 0,
    });
  }

  return {
    year,
    totalCount,
    totalDurationMinutes,
    avgDurationMinutes,
    avgRating,
    longestStreakDays,
    currentStreakDays,
    avgFrequencyPerWeek,
    topHour,
    topWeekday,
    topMonth,
    cityCount,
    homeCount,
    awayCount,
    weekdayDistribution,
    hourDistribution,
    monthlyDistribution,
    dailyActivity,
  };
}
