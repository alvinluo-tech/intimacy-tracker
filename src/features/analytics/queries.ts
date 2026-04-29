import { cache } from "react";
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalyticsStats, CountPoint, DashboardStats, TagPoint } from "@/features/analytics/types";
import type { Tag } from "@/features/records/types";

type EncounterAnalyticsRow = {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  rating: number | null;
  city: string | null;
  location_label: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  partner_id: string | null;
  encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
};

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function extractTags(row: EncounterAnalyticsRow) {
  return row.encounter_tags
    .map((et) => normalizeRelOne(et.tag))
    .filter((t): t is Tag => Boolean(t));
}

const getAnalyticsRows = cache(async (partnerId?: string | null) => {
  const supabase = await createSupabaseServerClient();

  const partnerIds: string[] = [];
  if (partnerId) {
    partnerIds.push(partnerId);
    const { data: partner } = await supabase
      .from("partners")
      .select("source,bound_user_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (partner?.source === "bound" && partner.bound_user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: mirror } = await supabase
          .from("partners")
          .select("id")
          .eq("user_id", partner.bound_user_id)
          .eq("bound_user_id", user.id)
          .eq("source", "bound")
          .maybeSingle();
        if (mirror) partnerIds.push(mirror.id);
      }
    }
  }

  let query = supabase
    .from("encounters")
    .select("id,started_at,duration_minutes,rating,city,location_label,location_country,latitude,longitude,partner_id,encounter_tags(tag:tags(id,name,color))")
    .order("started_at", { ascending: true })
    .limit(2000);

  if (partnerIds.length > 0) {
    query = query.in("partner_id", partnerIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return ((data ?? []) as unknown as EncounterAnalyticsRow[]).map((row) => ({
    ...row,
    encounter_tags: row.encounter_tags ?? [],
  }));
});

function countTags(rows: EncounterAnalyticsRow[]): Map<string, number> {
  const byTag = new Map<string, number>();
  for (const row of rows) {
    for (const tag of extractTags(row)) {
      byTag.set(tag.name, (byTag.get(tag.name) ?? 0) + 1);
    }
  }
  return byTag;
}

function mapToSortedTagPoints(byTag: Map<string, number>, topN: number): TagPoint[] {
  return [...byTag.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, value]) => ({ label, value }));
}

export async function getDashboardStats(partnerId?: string | null): Promise<DashboardStats> {
  const rows = await getAnalyticsRows(partnerId);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = subDays(weekStart, 7);
  const prevWeekEnd = subDays(weekEnd, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: weekStart, end: weekEnd })
  ).length;

  const prevWeekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: prevWeekStart, end: prevWeekEnd })
  ).length;

  const weekOverWeekChange =
    prevWeekCount === 0
      ? weekCount > 0 ? 100 : 0
      : Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100);

  const monthCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: monthStart, end: monthEnd })
  ).length;

  const durations = rows
    .map((r) => r.duration_minutes)
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length)
      : null;

  const ratings = rows
    .map((r) => r.rating)
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(1))
      : null;

  const lastEncounterAt = rows.length > 0 ? rows[rows.length - 1].started_at : null;

  const rangeStart = startOfDay(subDays(now, 29));
  const rangeEnd = endOfDay(now);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const dailyMap = new Map<string, number>();
  for (const day of days) {
    dailyMap.set(format(day, "MM-dd"), 0);
  }
  for (const row of rows) {
    const d = new Date(row.started_at);
    if (!isWithinInterval(d, { start: rangeStart, end: rangeEnd })) continue;
    const key = format(d, "MM-dd");
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const recent30Days: CountPoint[] = [...dailyMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const recentRows = rows.filter((r) => {
    const d = new Date(r.started_at);
    return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
  });
  const recent7DaysDurations = rows
    .filter((r) => isWithinInterval(new Date(r.started_at), { start: subDays(now, 7), end: now }))
    .map((r) => r.duration_minutes)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  const topRecentTags = mapToSortedTagPoints(countTags(recentRows), 6);

  const citySet = new Set<string>();
  const footprintSet = new Set<string>();
  const countrySet = new Set<string>();

  // Country name normalization map to prevent Chinese-English mixing
  const countryNormalizationMap: Record<string, string> = {
    "china": "China",
    "中国": "China",
    "united states": "United States",
    "美国": "United States",
    "usa": "United States",
    "japan": "Japan",
    "日本": "Japan",
    "united kingdom": "United Kingdom",
    "英国": "United Kingdom",
    "uk": "United Kingdom",
    "france": "France",
    "法国": "France",
    "germany": "Germany",
    "德国": "Germany",
    "canada": "Canada",
    "加拿大": "Canada",
    "australia": "Australia",
    "澳大利亚": "Australia",
    "italy": "Italy",
    "意大利": "Italy",
    "spain": "Spain",
    "西班牙": "Spain",
    "korea": "South Korea",
    "韩国": "South Korea",
    "south korea": "South Korea",
    "新加坡": "Singapore",
    "singapore": "Singapore",
    "泰国": "Thailand",
    "thailand": "Thailand",
    "越南": "Vietnam",
    "vietnam": "Vietnam",
    "印度": "India",
    "india": "India",
    "印尼": "Indonesia",
    "indonesia": "Indonesia",
    "马来西亚": "Malaysia",
    "malaysia": "Malaysia",
    "菲律宾": "Philippines",
    "philippines": "Philippines",
    "香港": "Hong Kong",
    "hong kong": "Hong Kong",
    "台湾": "Taiwan",
    "taiwan": "Taiwan",
    "澳门": "Macau",
    "macau": "Macau",
  };

  function normalizeCountryName(name: string): string {
    const normalized = name.trim().toLowerCase();
    return countryNormalizationMap[normalized] || name;
  }

  for (const row of rows) {
    if (row.city) citySet.add(row.city.trim().toLowerCase());

    if (row.location_country) {
      const normalizedCountry = normalizeCountryName(row.location_country);
      countrySet.add(normalizedCountry.toLowerCase());
    }

    if (row.location_label) {
      footprintSet.add(row.location_label.trim().toLowerCase());
    } else if (row.latitude !== null && row.longitude !== null) {
      // precision limit to combine very close points into one footprint
      footprintSet.add(`${row.latitude.toFixed(3)},${row.longitude.toFixed(3)}`);
    }
  }

  const cityCount = citySet.size;
  const footprintCount = footprintSet.size;
  const countryCount = countrySet.size;

  return {
    totalCount: rows.length,
    weekCount,
    weekOverWeekChange,
    monthCount,
    avgDuration,
    avgRating,
    lastEncounterAt,
    cityCount,
    footprintCount,
    countryCount,
    recent30Days,
    recent7DaysDurations,
    topRecentTags,
  };
}

export async function getAnalyticsStats(partnerId?: string | null): Promise<AnalyticsStats> {
  const rows = await getAnalyticsRows(partnerId);
  const now = new Date();

  // Combine Dashboard Stats
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = subDays(weekStart, 7);
  const prevWeekEnd = subDays(weekEnd, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: weekStart, end: weekEnd })
  ).length;

  const prevWeekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: prevWeekStart, end: prevWeekEnd })
  ).length;

  const weekOverWeekChange =
    prevWeekCount === 0
      ? weekCount > 0 ? 100 : 0
      : Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100);

  const monthCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: monthStart, end: monthEnd })
  ).length;

  const durations = rows
    .map((r) => r.duration_minutes)
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length)
      : null;

  const ratings = rows
    .map((r) => r.rating)
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(1))
      : null;

  const lastEncounterAt = rows.length > 0 ? rows[rows.length - 1].started_at : null;

  const rangeStart = startOfDay(subDays(now, 29));
  const rangeEnd = endOfDay(now);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const dailyMap = new Map<string, number>();
  for (const day of days) {
    dailyMap.set(format(day, "MM-dd"), 0);
  }
  for (const row of rows) {
    const d = new Date(row.started_at);
    if (!isWithinInterval(d, { start: rangeStart, end: rangeEnd })) continue;
    const key = format(d, "MM-dd");
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const recent30Days: CountPoint[] = [...dailyMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const recentRows = rows.filter((r) => {
    const d = new Date(r.started_at);
    return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
  });

  const recent7DaysDurations = rows
    .filter((r) => isWithinInterval(new Date(r.started_at), { start: subDays(now, 7), end: now }))
    .map((r) => r.duration_minutes)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  const topRecentTags = mapToSortedTagPoints(countTags(recentRows), 6);

  const weeklyTrend12: CountPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const end = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const count = rows.filter((r) =>
      isWithinInterval(new Date(r.started_at), { start, end })
    ).length;
    weeklyTrend12.push({
      label: format(start, "MM/dd"),
      value: count,
    });
  }

  const monthlyTrend12: CountPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(subMonths(now, i));
    const count = rows.filter((r) =>
      isWithinInterval(new Date(r.started_at), { start, end })
    ).length;
    monthlyTrend12.push({
      label: format(start, "yy-MM"),
      value: count,
    });
  }

  const durationBuckets = {
    "0-15m": 0,
    "15-30m": 0,
    "30-45m": 0,
    "45m+": 0,
  };
  for (const row of rows) {
    const v = row.duration_minutes;
    if (typeof v !== "number" || v < 0) continue;
    if (v < 15) durationBuckets["0-15m"] += 1;
    else if (v < 30) durationBuckets["15-30m"] += 1;
    else if (v < 45) durationBuckets["30-45m"] += 1;
    else durationBuckets["45m+"] += 1;
  }
  const durationDistribution: CountPoint[] = Object.entries(durationBuckets).map(
    ([label, value]) => ({ label, value })
  );

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdayMap = new Map<string, number>(weekdays.map((d) => [d, 0]));
  for (const row of rows) {
    const jsDay = new Date(row.started_at).getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    const key = weekdays[idx];
    weekdayMap.set(key, (weekdayMap.get(key) ?? 0) + 1);
  }
  const weekdayDistribution: CountPoint[] = weekdays.map((d) => ({
    label: d,
    value: weekdayMap.get(d) ?? 0,
  }));

  const timeOfDayBuckets = {
    "Morning": 0,
    "Afternoon": 0,
    "Evening": 0,
    "Night": 0,
  };
  for (const row of rows) {
    const hour = new Date(row.started_at).getHours();
    if (hour >= 6 && hour < 12) timeOfDayBuckets["Morning"] += 1;
    else if (hour >= 12 && hour < 18) timeOfDayBuckets["Afternoon"] += 1;
    else if (hour >= 18 && hour < 24) timeOfDayBuckets["Evening"] += 1;
    else timeOfDayBuckets["Night"] += 1;
  }
  const timeOfDayDistribution: CountPoint[] = Object.entries(timeOfDayBuckets).map(
    ([label, value]) => ({ label, value })
  );

  const heatmapStart = startOfDay(subDays(now, 364));
  const heatmapEnd = endOfDay(now);
  const heatmapDays = eachDayOfInterval({ start: heatmapStart, end: heatmapEnd });
  const heatmapMap = new Map<string, number>();
  for (const day of heatmapDays) {
    heatmapMap.set(format(day, "yyyy-MM-dd"), 0);
  }
  for (const row of rows) {
    const d = new Date(row.started_at);
    if (!isWithinInterval(d, { start: heatmapStart, end: heatmapEnd })) continue;
    const key = format(d, "yyyy-MM-dd");
    heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
  }
  const heatmapData = [...heatmapMap.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  const citySet = new Set<string>();
  const footprintSet = new Set<string>();
  const countrySet = new Set<string>();

  // Country name normalization map to prevent Chinese-English mixing
  const countryNormalizationMap: Record<string, string> = {
    "china": "China",
    "中国": "China",
    "united states": "United States",
    "美国": "United States",
    "usa": "United States",
    "japan": "Japan",
    "日本": "Japan",
    "united kingdom": "United Kingdom",
    "英国": "United Kingdom",
    "uk": "United Kingdom",
    "france": "France",
    "法国": "France",
    "germany": "Germany",
    "德国": "Germany",
    "canada": "Canada",
    "加拿大": "Canada",
    "australia": "Australia",
    "澳大利亚": "Australia",
    "italy": "Italy",
    "意大利": "Italy",
    "spain": "Spain",
    "西班牙": "Spain",
    "korea": "South Korea",
    "韩国": "South Korea",
    "south korea": "South Korea",
    "新加坡": "Singapore",
    "singapore": "Singapore",
    "泰国": "Thailand",
    "thailand": "Thailand",
    "越南": "Vietnam",
    "vietnam": "Vietnam",
    "印度": "India",
    "india": "India",
    "印尼": "Indonesia",
    "indonesia": "Indonesia",
    "马来西亚": "Malaysia",
    "malaysia": "Malaysia",
    "菲律宾": "Philippines",
    "philippines": "Philippines",
    "香港": "Hong Kong",
    "hong kong": "Hong Kong",
    "台湾": "Taiwan",
    "taiwan": "Taiwan",
    "澳门": "Macau",
    "macau": "Macau",
  };

  function normalizeCountryName(name: string): string {
    const normalized = name.trim().toLowerCase();
    return countryNormalizationMap[normalized] || name;
  }

  for (const row of rows) {
    if (row.city) citySet.add(row.city.trim().toLowerCase());

    if (row.location_country) {
      const normalizedCountry = normalizeCountryName(row.location_country);
      countrySet.add(normalizedCountry.toLowerCase());
    }

    if (row.location_label) {
      footprintSet.add(row.location_label.trim().toLowerCase());
    } else if (row.latitude !== null && row.longitude !== null) {
      // precision limit to combine very close points into one footprint
      footprintSet.add(`${row.latitude.toFixed(3)},${row.longitude.toFixed(3)}`);
    }
  }

  const cityCount = citySet.size;
  const footprintCount = footprintSet.size;
  const countryCount = countrySet.size;

  const tagRanking = mapToSortedTagPoints(countTags(rows), 10);

  return {
    totalCount: rows.length,
    weekCount,
    weekOverWeekChange,
    monthCount,
    avgDuration,
    avgRating,
    lastEncounterAt,
    cityCount,
    footprintCount,
    countryCount,
    recent30Days,
    recent7DaysDurations,
    topRecentTags,
    weeklyTrend12,
    monthlyTrend12,
    durationDistribution,
    weekdayDistribution,
    timeOfDayDistribution,
    heatmapData,
    tagRanking,
  };
}
