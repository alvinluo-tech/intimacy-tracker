import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/features/auth/queries";
import type { AnalyticsStats, CountPoint, DashboardStats, TagPoint } from "@/features/analytics/types";

// ---- helpers ----

const mapCounts = (data: unknown): CountPoint[] =>
  ((data ?? []) as Array<{ label: string; value: number }>).map((d) => ({ label: d.label, value: d.value }));

const mapTags = (data: unknown): TagPoint[] =>
  ((data ?? []) as Array<{ label: string; value: number }>).map((t) => ({ label: t.label, value: t.value }));

function checkRpc(res: { data: unknown; error: unknown }, name: string): unknown {
  if (res.error) {
    console.error(`[analytics] RPC ${name} failed:`, res.error);
    return null;
  }
  return res.data;
}

// ---- Raw data fetchers (no caching — RPCs are fast DB-side aggregations) ----

async function fetchDashboardStatsRaw(userId: string, partnerId: string | null): Promise<DashboardStats> {
  const supabase = createSupabaseAdminClient();

  const [statsRes, tagRes] = await Promise.all([
    supabase.rpc("get_dashboard_stats", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_tag_ranking", { p_user_id: userId, p_limit: 6, p_partner_id: partnerId, p_since_days: 30 }),
  ]);

  const s = checkRpc(statsRes, "get_dashboard_stats") as Record<string, unknown> | null;
  if (!s) return emptyDashboard;

  const topRecentTags = mapTags(checkRpc(tagRes, "get_tag_ranking"));

  return {
    totalCount: (s.totalCount as number) ?? 0,
    weekCount: (s.weekCount as number) ?? 0,
    weekOverWeekChange: (s.weekOverWeekChange as number) ?? null,
    monthCount: (s.monthCount as number) ?? 0,
    avgDuration: (s.avgDuration as number) ?? null,
    avgRating: (s.avgRating as number) ?? null,
    lastEncounterAt: (s.lastEncounterAt as string) ?? null,
    cityCount: (s.cityCount as number) ?? 0,
    footprintCount: (s.footprintCount as number) ?? 0,
    countryCount: (s.countryCount as number) ?? 0,
    recent30Days: mapCounts(s.recent30Days),
    recent7DaysDurations: (s.recent7DaysDurations as number[]) ?? [],
    topRecentTags,
  };
}

async function fetchAnalyticsStatsRaw(userId: string, partnerId: string | null): Promise<AnalyticsStats> {
  const supabase = createSupabaseAdminClient();

  const [
    statsRes,
    weeklyRes,
    monthlyRes,
    durationRes,
    weekdayRes,
    timeOfDayRes,
    heatmapRes,
    tagAllRes,
    tagRecentRes,
  ] = await Promise.all([
    supabase.rpc("get_dashboard_stats", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_weekly_trend12", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_monthly_trend12", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_duration_distribution", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_weekday_distribution", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_timeofday_distribution", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_heatmap_data", { p_user_id: userId, p_partner_id: partnerId }),
    supabase.rpc("get_tag_ranking", { p_user_id: userId, p_limit: 10, p_partner_id: partnerId, p_since_days: null }),
    supabase.rpc("get_tag_ranking", { p_user_id: userId, p_limit: 6, p_partner_id: partnerId, p_since_days: 30 }),
  ]);

  const s = checkRpc(statsRes, "get_dashboard_stats") as Record<string, unknown> | null;
  if (!s) return { ...emptyDashboard, ...emptyAnalytics };

  return {
    totalCount: (s.totalCount as number) ?? 0,
    weekCount: (s.weekCount as number) ?? 0,
    weekOverWeekChange: (s.weekOverWeekChange as number) ?? null,
    monthCount: (s.monthCount as number) ?? 0,
    avgDuration: (s.avgDuration as number) ?? null,
    avgRating: (s.avgRating as number) ?? null,
    lastEncounterAt: (s.lastEncounterAt as string) ?? null,
    cityCount: (s.cityCount as number) ?? 0,
    footprintCount: (s.footprintCount as number) ?? 0,
    countryCount: (s.countryCount as number) ?? 0,
    recent30Days: mapCounts(s.recent30Days),
    recent7DaysDurations: (s.recent7DaysDurations as number[]) ?? [],
    topRecentTags: mapTags(checkRpc(tagRecentRes, "get_tag_ranking (recent)")),
    weeklyTrend12: mapCounts(checkRpc(weeklyRes, "get_weekly_trend12")),
    monthlyTrend12: mapCounts(checkRpc(monthlyRes, "get_monthly_trend12")),
    durationDistribution: mapCounts(checkRpc(durationRes, "get_duration_distribution")),
    weekdayDistribution: mapCounts(checkRpc(weekdayRes, "get_weekday_distribution")),
    timeOfDayDistribution: mapCounts(checkRpc(timeOfDayRes, "get_timeofday_distribution")),
    heatmapData: ((checkRpc(heatmapRes, "get_heatmap_data") ?? []) as Array<{ date: string; count: number }>).map(
      (d) => ({ date: d.date, count: d.count })
    ),
    tagRanking: mapTags(checkRpc(tagAllRes, "get_tag_ranking (all)")),
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
    tags: [`analytics-${user.id}`],
  })();
}

export async function getAnalyticsStats(partnerId?: string | null): Promise<AnalyticsStats> {
  const user = await getServerUser();
  if (!user) return { ...emptyDashboard, ...emptyAnalytics };
  const key = `${ANALYTICS_CACHE_KEY}:${user.id}:${partnerId ?? ""}`;
  return unstable_cache(() => fetchAnalyticsStatsRaw(user.id, partnerId ?? null), [key], {
    revalidate: 30,
    tags: [`analytics-${user.id}`],
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
