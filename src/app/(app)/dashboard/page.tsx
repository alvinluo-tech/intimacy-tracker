import { Clock, Calendar, Activity, Zap, Tags, TrendingUp } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AnalyticsCard title="本周记录" icon={Activity}>
            <div className="privacy-blur-target text-3xl font-semibold text-[var(--app-text)]">{stats.weekCount}</div>
          </AnalyticsCard>
          <AnalyticsCard title="本月记录" icon={Calendar}>
            <div className="privacy-blur-target text-3xl font-semibold text-[var(--app-text)]">{stats.monthCount}</div>
          </AnalyticsCard>
          <AnalyticsCard title="平均时长" icon={Clock}>
            <div className="privacy-blur-target flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-[var(--app-text)]">{stats.avgDuration ?? "-"}</span>
              {stats.avgDuration && <span className="text-[13px] text-[var(--app-text-muted)]">分钟</span>}
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="最近一次" icon={Zap}>
            <div className="privacy-blur-target text-[14px] font-medium text-[var(--app-text-secondary)] mt-1.5">
              {formatDateTime(stats.lastEncounterAt)}
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="最近 30 天频率趋势" icon={TrendingUp} className="col-span-2 lg:col-span-4">
            <DashboardTrendChart data={stats.recent30Days} />
          </AnalyticsCard>

          <AnalyticsCharts data={stats} />

          <AnalyticsCard title="常用标签" icon={Tags} className="col-span-2 lg:col-span-2">
            <div className="privacy-blur-target flex flex-wrap gap-2">
              {stats.topRecentTags.length ? (
                stats.topRecentTags.map((tag) => (
                  <Badge key={tag.label} className="px-3 py-1 text-[13px] bg-white/[0.04]">
                    {tag.label} <span className="ml-1 opacity-50">· {tag.value}</span>
                  </Badge>
                ))
              ) : (
                <div className="flex h-20 w-full items-center justify-center rounded-[12px] border border-dashed border-white/[0.1] bg-white/[0.01]">
                  <span className="text-[13px] text-[var(--app-text-muted)]">还没有可统计的标签数据</span>
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
