import { cacheLife, cacheTag } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import type { AnalyticsStats, CountPoint, DashboardStats, TagPoint } from "@/features/analytics/types";

// ---- "use cache" functions: only receive serializable args, use admin client ----

async function fetchDashboardStats(userId: string, partnerId: string | null): Promise<DashboardStats> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`dashboard-stats-${userId}${partnerId ? `-partner-${partnerId}` : ""}`);

  const supabase = createSupabaseAdminClient();

  const [statsRes, tagRes] = await Promise.all([
    supabase.rpc("get_dashboard_stats", {
      p_user_id: userId,
      p_partner_id: partnerId,
    }),
    supabase.rpc("get_tag_ranking", {
      p_user_id: userId,
      p_limit: 6,
      p_partner_id: partnerId,
      p_since_days: 30,
    }),
  ]);

  if (statsRes.error) throw statsRes.error;
  const s = statsRes.data as Record<string, unknown>;

  const recent30Days: CountPoint[] = ((s.recent30Days ?? []) as Array<{ label: string; value: number }>).map(
    (d) => ({ label: d.label, value: d.value })
  );

  const topRecentTags: TagPoint[] = ((tagRes.data ?? []) as Array<{ label: string; value: number }>).map(
    (t) => ({ label: t.label, value: t.value })
  );

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
    recent30Days,
    recent7DaysDurations: (s.recent7DaysDurations as number[]) ?? [],
    topRecentTags,
  };
}

async function fetchAnalyticsStats(userId: string, partnerId: string | null): Promise<AnalyticsStats> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`analytics-stats-${userId}${partnerId ? `-partner-${partnerId}` : ""}`);

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

  if (statsRes.error) throw statsRes.error;
  const s = statsRes.data as Record<string, unknown>;

  const mapCounts = (data: unknown): CountPoint[] =>
    ((data ?? []) as Array<{ label: string; value: number }>).map((d) => ({ label: d.label, value: d.value }));

  const mapTags = (data: unknown): TagPoint[] =>
    ((data ?? []) as Array<{ label: string; value: number }>).map((t) => ({ label: t.label, value: t.value }));

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
    topRecentTags: mapTags(tagRecentRes.data),
    weeklyTrend12: mapCounts(weeklyRes.data),
    monthlyTrend12: mapCounts(monthlyRes.data),
    durationDistribution: mapCounts(durationRes.data),
    weekdayDistribution: mapCounts(weekdayRes.data),
    timeOfDayDistribution: mapCounts(timeOfDayRes.data),
    heatmapData: ((heatmapRes.data ?? []) as Array<{ date: string; count: number }>).map((d) => ({
      date: d.date,
      count: d.count,
    })),
    tagRanking: mapTags(tagAllRes.data),
  };
}

// ---- Public entry points: resolve auth outside cache, pass only userId string ----

export async function getDashboardStats(partnerId?: string | null): Promise<DashboardStats> {
  const user = await getServerUser();
  if (!user) return emptyDashboard;
  return fetchDashboardStats(user.id, partnerId ?? null);
}

export async function getAnalyticsStats(partnerId?: string | null): Promise<AnalyticsStats> {
  const user = await getServerUser();
  if (!user) return { ...emptyDashboard, ...emptyAnalytics };
  return fetchAnalyticsStats(user.id, partnerId ?? null);
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
