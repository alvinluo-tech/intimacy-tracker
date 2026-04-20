import { TopBar } from "@/components/layout/TopBar";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { Badge } from "@/components/ui/badge";
import { getAnalyticsStats } from "@/features/analytics/queries";

export default async function AnalyticsPage() {
  const stats = await getAnalyticsStats();

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Analytics" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <AnalyticsCharts data={stats} />

        <AnalyticsCard title="标签频次排名">
          <div className="flex flex-wrap gap-2">
            {stats.tagRanking.length ? (
              stats.tagRanking.map((tag) => (
                <Badge key={tag.label}>
                  {tag.label} · {tag.value}
                </Badge>
              ))
            ) : (
              <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
                还没有标签数据
              </div>
            )}
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
