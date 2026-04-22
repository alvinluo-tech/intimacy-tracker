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

const getAnalyticsRows = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("id,started_at,duration_minutes,encounter_tags(tag:tags(id,name,color))")
    .order("started_at", { ascending: true })
    .limit(2000);

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

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await getAnalyticsRows();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: weekStart, end: weekEnd })
  ).length;

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
  const topRecentTags = mapToSortedTagPoints(countTags(recentRows), 6);

  return {
    weekCount,
    monthCount,
    avgDuration,
    lastEncounterAt,
    recent30Days,
    topRecentTags,
  };
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const rows = await getAnalyticsRows();
  const now = new Date();

  // Combine Dashboard Stats
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekCount = rows.filter((r) =>
    isWithinInterval(new Date(r.started_at), { start: weekStart, end: weekEnd })
  ).length;

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
    "30-60m": 0,
    "60m+": 0,
  };
  for (const row of rows) {
    const v = row.duration_minutes;
    if (typeof v !== "number" || v < 0) continue;
    if (v < 15) durationBuckets["0-15m"] += 1;
    else if (v < 30) durationBuckets["15-30m"] += 1;
    else if (v < 60) durationBuckets["30-60m"] += 1;
    else durationBuckets["60m+"] += 1;
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

  const tagRanking = mapToSortedTagPoints(countTags(rows), 10);

  return {
    weekCount,
    monthCount,
    avgDuration,
    lastEncounterAt,
    recent30Days,
    topRecentTags,
    weeklyTrend12,
    monthlyTrend12,
    durationDistribution,
    weekdayDistribution,
    tagRanking,
  };
}
