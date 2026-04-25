import { TopBar } from "@/components/layout/TopBar";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";

export default function DashboardLoading() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Dashboard" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 animate-pulse">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AnalyticsCard title="本周记录次数">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="本月记录次数">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="平均时长（分钟）">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="最近一次记录">
            <div className="h-5 w-24 mt-1 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="最近 30 天趋势">
          <div className="h-56 w-full rounded bg-white/[0.02]"></div>
        </AnalyticsCard>

        <AnalyticsCard title="最近常用标签">
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-white/[0.05]"></div>
            <div className="h-6 w-20 rounded-full bg-white/[0.05]"></div>
            <div className="h-6 w-14 rounded-full bg-white/[0.05]"></div>
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}