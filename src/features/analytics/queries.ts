import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/features/auth/queries";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { AnalyticsStats, CountPoint, DashboardStats, TagPoint } from "@/features/analytics/types";

// ---- helpers ----

const mapCounts = (data: unknown): CountPoint[] =>
  ((data ?? []) as Array<{ label: string; value: number }>).map((d) => ({ label: d.label, value: d.value }));

const mapTags = (data: unknown): TagPoint[] =>
  ((data ?? []) as Array<{ label: string; value: number }>).map((t) => ({ label: t.label, value: t.value }));

function checkRpc(res: { data: unknown; error: unknown }, name: string): unknown {
  if (res.error) {
    const err = res.error as Record<string, unknown>;
    console.error(
      `[analytics] RPC ${name} failed:`,
      err?.message ?? err?.details ?? err?.hint ?? JSON.stringify(res.error)
    );
    return null;
  }
  return res.data;
}

// ---- Raw data fetchers ----

// Dashboard: uses unified RPC but only reads dashboard fields
async function fetchDashboardStatsRaw(userId: string, partnerId: string | null): Promise<DashboardStats> {
  const supabase = createSupabaseAdminClient();
  const res = await supabase.rpc("get_analytics_stats", { p_user_id: userId, p_partner_id: partnerId });
  const data = checkRpc(res, "get_analytics_stats") as Record<string, unknown> | null;
  if (!data) return emptyDashboard;

  return {
    totalCount: (data.totalCount as number) ?? 0,
    weekCount: (data.weekCount as number) ?? 0,
    weekOverWeekChange: (data.weekOverWeekChange as number) ?? null,
    monthCount: (data.monthCount as number) ?? 0,
    avgDuration: (data.avgDuration as number) ?? null,
    avgRating: (data.avgRating as number) ?? null,
    lastEncounterAt: (data.lastEncounterAt as string) ?? null,
    cityCount: (data.cityCount as number) ?? 0,
    footprintCount: (data.footprintCount as number) ?? 0,
    countryCount: (data.countryCount as number) ?? 0,
    recent30Days: mapCounts(data.recent30Days),
    recent7DaysDurations: (data.recent7DaysDurations as number[]) ?? [],
    topRecentTags: mapTags(data.topRecentTags),
  };
}

// Analytics: single RPC call returns all chart data
async function fetchAnalyticsStatsRaw(userId: string, partnerId: string | null): Promise<AnalyticsStats> {
  const supabase = createSupabaseAdminClient();
  const res = await supabase.rpc("get_analytics_stats", { p_user_id: userId, p_partner_id: partnerId });
  const data = checkRpc(res, "get_analytics_stats") as Record<string, unknown> | null;
  if (!data) return { ...emptyDashboard, ...emptyAnalytics };

  return {
    totalCount: (data.totalCount as number) ?? 0,
    weekCount: (data.weekCount as number) ?? 0,
    weekOverWeekChange: (data.weekOverWeekChange as number) ?? null,
    monthCount: (data.monthCount as number) ?? 0,
    avgDuration: (data.avgDuration as number) ?? null,
    avgRating: (data.avgRating as number) ?? null,
    lastEncounterAt: (data.lastEncounterAt as string) ?? null,
    cityCount: (data.cityCount as number) ?? 0,
    footprintCount: (data.footprintCount as number) ?? 0,
    countryCount: (data.countryCount as number) ?? 0,
    recent30Days: mapCounts(data.recent30Days),
    recent7DaysDurations: (data.recent7DaysDurations as number[]) ?? [],
    topRecentTags: mapTags(data.topRecentTags),
    weeklyTrend12: mapCounts(data.weeklyTrend12),
    monthlyTrend12: mapCounts(data.monthlyTrend12),
    durationDistribution: mapCounts(data.durationDistribution),
    weekdayDistribution: mapCounts(data.weekdayDistribution),
    timeOfDayDistribution: mapCounts(data.timeOfDayDistribution),
    heatmapData: ((data.heatmapData ?? []) as Array<{ date: string; count: number }>).map(
      (d) => ({ date: d.date, count: d.count })
    ),
    tagRanking: mapTags(data.tagRanking),
  };
}

// ---- Cached wrappers: short TTL, invalidated on data writes via revalidateTag ----

const DASHBOARD_CACHE_KEY = "dashboard-stats";
const ANALYTICS_CACHE_KEY = "analytics-stats";

export async function getDashboardStats(partnerId?: string | null): Promise<DashboardStats> {
  const user = await getServerUser();
  if (!user) return emptyDashboard;
  const key = `${DASHBOARD_CACHE_KEY}:${user.id}:${partnerId ?? ""}`;
  return unstable_cache(() => fetchDashboardStatsRaw(user.id, partnerId ?? null), [key], {
    revalidate: 30,
    tags: [CACHE_TAGS.dashboard(user.id)],
  })();
}

export async function getAnalyticsStats(partnerId?: string | null): Promise<AnalyticsStats> {
  const user = await getServerUser();
  if (!user) return { ...emptyDashboard, ...emptyAnalytics };
  const key = `${ANALYTICS_CACHE_KEY}:${user.id}:${partnerId ?? ""}`;
  return unstable_cache(() => fetchAnalyticsStatsRaw(user.id, partnerId ?? null), [key], {
    revalidate: 30,
    tags: [CACHE_TAGS.analytics(user.id)],
  })();
}

const emptyDashboard: DashboardStats = {
  totalCount: 0,
  weekCount: 0,
  weekOverWeekChange: null,
  monthCount: 0,
  avgDuration: null,
  avgRating: null,
  lastEncounterAt: null,
  cityCount: 0,
  footprintCount: 0,
  countryCount: 0,
  recent30Days: [],
  recent7DaysDurations: [],
  topRecentTags: [],
};

const emptyAnalytics = {
  weeklyTrend12: [] as CountPoint[],
  monthlyTrend12: [] as CountPoint[],
  durationDistribution: [] as CountPoint[],
  weekdayDistribution: [] as CountPoint[],
  timeOfDayDistribution: [] as CountPoint[],
  heatmapData: [] as { date: string; count: number }[],
  tagRanking: [] as TagPoint[],
};
