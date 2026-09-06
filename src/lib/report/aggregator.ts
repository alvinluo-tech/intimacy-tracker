import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat | null>();

function getZonedFormatter(timeZone: string): Intl.DateTimeFormat | null {
  if (zonedFormatterCache.has(timeZone)) {
    return zonedFormatterCache.get(timeZone) ?? null;
  }
  let formatter: Intl.DateTimeFormat | null = null;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
  } catch {
    formatter = null; // invalid time zone
  }
  zonedFormatterCache.set(timeZone, formatter);
  return formatter;
}

type ZonedParts = { year: number; month: number; day: number; hour: number; weekday: number };

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = getZonedFormatter(timeZone);
  if (!formatter) {
    // Invalid/missing timezone — fall back to UTC
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      weekday: date.getUTCDay(),
    };
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: parseInt(parts.year as string, 10),
    month: parseInt(parts.month as string, 10) - 1,
    day: parseInt(parts.day as string, 10),
    hour: parseInt(parts.hour as string, 10) % 24,
    weekday: Math.max(0, WEEKDAY_SHORT.indexOf((parts.weekday ?? "Sun") as (typeof WEEKDAY_SHORT)[number])),
  };
}

/** "YYYY-MM-DD" for the given instant, in the given timezone. */
function getZonedDateKey(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function getDaysInYear(year: number): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function dateKeyToUtcMs(key: string): number {
  return new Date(`${key}T00:00:00Z`).getTime();
}

function calculateStreaks(sortedDates: string[], todayKey?: string): { longest: number; current: number } {
  if (sortedDates.length === 0) return { longest: 0, current: 0 };

  const uniqueDates = [...new Set(sortedDates)].sort();
  let longest = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diffDays = Math.round(
      (dateKeyToUtcMs(uniqueDates[i]) - dateKeyToUtcMs(uniqueDates[i - 1])) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  let current = 0;
  if (todayKey) {
    const daysSinceLast = Math.round(
      (dateKeyToUtcMs(todayKey) - dateKeyToUtcMs(uniqueDates[uniqueDates.length - 1])) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast <= 1) {
      current = tempStreak;
    }
  } else {
    // No reference "today" provided — treat the most recent day as current.
    current = tempStreak;
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
  year: number,
  partnerId?: string | null
): Promise<AnnualReportData | null> {
  const supabase = createSupabaseAdminClient();

  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate = `${year + 1}-01-01T00:00:00.000Z`;

  let partnerIds: string[] | null = null;

  if (partnerId) {
    // Verify partner ownership using regular server client (RLS-enforced)
    const serverSupabase = await createSupabaseServerClient();
    const { data: ownedPartner } = await serverSupabase
      .from("partners")
      .select("id, source, bound_user_id")
      .eq("id", partnerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!ownedPartner) {
      // Partner does not belong to this user
      return null;
    }

    partnerIds = [partnerId];

    if (ownedPartner.source === "bound" && ownedPartner.bound_user_id) {
      const { data: mirror } = await serverSupabase
        .from("partners")
        .select("id")
        .eq("user_id", ownedPartner.bound_user_id)
        .eq("bound_user_id", userId)
        .eq("source", "bound")
        .maybeSingle();

      if (mirror) {
        partnerIds.push(mirror.id);
      }
    }
  }

  let query = supabase
    .from("encounters")
    .select(`
      id,
      started_at,
      ended_at,
      duration_minutes,
      rating,
      city,
      country,
      location_precision,
      timezone,
      user_id
    `)
    .gte("started_at", startDate)
    .lt("started_at", endDate)
    .limit(10000);

  if (partnerIds) {
    query = query.in("partner_id", partnerIds);
  } else {
    const ownBoundPartners = await supabase
      .from("partners")
      .select("id, bound_user_id")
      .eq("user_id", userId)
      .eq("source", "bound");

    const mirrorRecords = await supabase
      .from("partners")
      .select("id, user_id")
      .eq("bound_user_id", userId)
      .eq("source", "bound");

    const allPartnerIds = new Set<string>();
    for (const p of ownBoundPartners.data ?? []) {
      allPartnerIds.add(p.id);
    }
    for (const m of mirrorRecords.data ?? []) {
      allPartnerIds.add(m.id);
    }

    if (allPartnerIds.size > 0) {
      query = query.or(`user_id.eq.${userId},partner_id.in.(${Array.from(allPartnerIds).join(",")})`);
    } else {
      query = query.eq("user_id", userId);
    }
  }

  const { data: encounters, error } = await query.order("started_at", { ascending: true });

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

  // Bucket everything in the timezone each encounter was recorded in
  // (fallback UTC), not the server's timezone.
  const encounterDates = encounters.map((e) =>
    getZonedDateKey(new Date(e.started_at), e.timezone || "UTC")
  );
  // Use the most recent encounter's timezone as "today" for the current streak
  const todayKey = getZonedDateKey(
    new Date(),
    encounters[encounters.length - 1]?.timezone || "UTC"
  );
  const { longest: longestStreakDays, current: currentStreakDays } = calculateStreaks(
    encounterDates,
    todayKey
  );

  const daysInYear = getDaysInYear(year);
  const avgFrequencyPerWeek = (totalCount / daysInYear) * 7;

  const hourDistribution = new Array(24).fill(0);
  const weekdayDistribution = new Array(7).fill(0);
  const monthlyDistribution = new Array(12).fill(0);
  const cityCounts: Record<string, number> = {};
  let homeCity: string | null = null;

  for (const encounter of encounters) {
    const parts = getZonedParts(new Date(encounter.started_at), encounter.timezone || "UTC");

    hourDistribution[parts.hour]++;
    weekdayDistribution[parts.weekday]++;
    monthlyDistribution[parts.month]++;

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

  // Calculate daily activity for heatmap (in each encounter's timezone)
  const dailyCounts: Record<string, number> = {};
  for (const encounter of encounters) {
    const dateStr = getZonedDateKey(new Date(encounter.started_at), encounter.timezone || "UTC");
    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
  }

  const dailyActivity: DailyActivity[] = [];
  const startMs = Date.UTC(year, 0, 1);
  const endMs = Date.UTC(year, 11, 31);
  for (let ms = startMs; ms <= endMs; ms += 1000 * 60 * 60 * 24) {
    const dateStr = new Date(ms).toISOString().slice(0, 10);
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
