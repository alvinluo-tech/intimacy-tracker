import { TopBar } from "@/components/layout/TopBar";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";

export default function DashboardLoading() {
  return (
    <div className="min-h-[100svh] bg-[#020617]">
      <TopBar title="Dashboard" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 animate-pulse">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AnalyticsCard title="THIS WEEK">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="AVG DURATION">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="AVG RATING">
            <div className="h-8 w-12 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
          <AnalyticsCard title="LAST RECORD">
            <div className="h-5 w-24 mt-1 rounded bg-white/[0.05]"></div>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="30-DAY ACTIVITY">
          <div className="h-56 w-full rounded bg-white/[0.02]"></div>
        </AnalyticsCard>

        <AnalyticsCard title="TOP TAGS">
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