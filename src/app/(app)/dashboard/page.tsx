import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { getDashboardStats } from "@/features/analytics/queries";
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
  const stats = await getDashboardStats();
  const partners = await listPartners();
  const tags = await listTags();

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Dashboard" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AnalyticsCard title="本周记录次数">
            <div className="text-2xl font-semibold text-[var(--app-text)]">{stats.weekCount}</div>
          </AnalyticsCard>
          <AnalyticsCard title="本月记录次数">
            <div className="text-2xl font-semibold text-[var(--app-text)]">{stats.monthCount}</div>
          </AnalyticsCard>
          <AnalyticsCard title="平均时长（分钟）">
            <div className="text-2xl font-semibold text-[var(--app-text)]">
              {stats.avgDuration ?? "-"}
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="最近一次记录">
            <div className="text-[13px] leading-5 text-[var(--app-text-secondary)]">
              {formatDateTime(stats.lastEncounterAt)}
            </div>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="最近 30 天趋势">
          <DashboardTrendChart data={stats.recent30Days} />
        </AnalyticsCard>

        <AnalyticsCard title="最近常用标签" className="col-span-2 lg:col-span-4">
          <div className="flex flex-wrap gap-2">
            {stats.topRecentTags.length ? (
              stats.topRecentTags.map((tag) => (
                <Badge key={tag.label}>
                  {tag.label} · {tag.value}
                </Badge>
              ))
            ) : (
              <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
                还没有可统计的标签数据
              </div>
            )}
          </div>
        </AnalyticsCard>

        <AddLogModal
          partners={partners}
          tags={tags}
          defaultLocationMode="off"
        />
      </div>
    </div>
  );
}
