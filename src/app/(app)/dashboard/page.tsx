import { Clock, Calendar, Activity, Zap, Tags, TrendingUp, Star, Flame } from "lucide-react";

import { QuickStartTimer } from "@/components/analytics/QuickStartTimer";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { ActivityHeatmap } from "@/components/analytics/ActivityHeatmap";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Sparkline } from "@/components/analytics/Sparkline";
import { MapSlice } from "@/components/analytics/MapSlice";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getAnalyticsStats } from "@/features/analytics/queries";
import { listPartners, listTags } from "@/features/records/queries";
import { AddLogModal } from "@/components/forms/AddLogModal";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const stats = await getAnalyticsStats();
  const partners = await listPartners();
  const tags = await listTags();

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Insights" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <QuickStartTimer />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AnalyticsCard title="本周频率" icon={Activity}>
            <div className="flex items-baseline justify-between">
              <div className="privacy-blur-target text-3xl font-semibold text-[var(--app-text)]">{stats.weekCount}</div>
              {stats.weekOverWeekChange !== null && (
                <div className={`text-[13px] font-medium ${stats.weekOverWeekChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.weekOverWeekChange >= 0 ? '+' : ''}{stats.weekOverWeekChange}%
                </div>
              )}
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="平均时长" icon={Clock}>
            <div className="flex items-baseline justify-between">
              <div className="privacy-blur-target flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[var(--app-text)]">{stats.avgDuration ?? "-"}</span>
                {stats.avgDuration && <span className="text-[13px] text-[var(--app-text-muted)]">分钟</span>}
              </div>
              {stats.recent7DaysDurations && stats.recent7DaysDurations.length > 0 && (
                <Sparkline data={stats.recent7DaysDurations} />
              )}
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="平均评分" icon={Star}>
            <div className="flex items-center gap-1.5">
              <div className="privacy-blur-target text-3xl font-semibold text-[var(--app-text)]">{stats.avgRating ?? "-"}</div>
              <Star className="h-5 w-5 fill-[#f59e0b] text-[#f59e0b]" />
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="上次记录" icon={Zap}>
            <div className="privacy-blur-target text-[16px] font-medium text-[var(--app-text-secondary)] mt-1.5">
              {stats.lastEncounterAt ? formatDistanceToNow(new Date(stats.lastEncounterAt), { addSuffix: true, locale: zhCN }) : "-"}
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="年度活跃热力图" icon={Flame} className="col-span-2 lg:col-span-4">
            <ActivityHeatmap data={stats.heatmapData} />
          </AnalyticsCard>

          <AnalyticsCard title="最近 30 天频率趋势" icon={TrendingUp} className="col-span-2 lg:col-span-4">
            <DashboardTrendChart data={stats.recent30Days} />
          </AnalyticsCard>

          <AnalyticsCharts data={stats} />

          <div className="col-span-2 lg:col-span-1 h-56 lg:h-auto">
            <MapSlice cityCount={stats.cityCount} footprintCount={stats.footprintCount} />
          </div>

          <AnalyticsCard title="常用标签" icon={Tags} className="col-span-2 lg:col-span-3">
            <div className="privacy-blur-target flex flex-wrap gap-2">
              {stats.topRecentTags.length ? (
                stats.topRecentTags.map((tag) => (
                  <Badge key={tag.label} className="px-3 py-1 text-[13px] bg-white/[0.04]">
                    {tag.label} <span className="ml-1 opacity-50">· {tag.value}</span>
                  </Badge>
                ))
              ) : (
                <div className="flex flex-wrap gap-2 w-full">
                  {[65, 80, 70, 90, 60].map((width, i) => (
                    <div key={i} className="h-7 rounded-full bg-white/[0.03] animate-pulse" style={{ width: `${width}px` }} />
                  ))}
                  <div className="w-full mt-2 text-[13px] text-[var(--app-text-muted)]">
                    尝试在下一次记录中添加标签，这里将展示你的偏好
                  </div>
                </div>
              )}
            </div>
          </AnalyticsCard>
        </div>

        <AddLogModal
          partners={partners}
          tags={tags}
          defaultLocationMode="off"
        />
      </div>
    </div>
  );
}
