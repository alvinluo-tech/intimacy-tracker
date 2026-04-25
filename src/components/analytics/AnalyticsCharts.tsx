"use client";

import dynamic from "next/dynamic";
import type { AnalyticsStats } from "@/features/analytics/types";

const DynamicCharts = dynamic(
  () => import("./_AnalyticsChartsInner").then((m) => m.AnalyticsChartsInner),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-64 rounded-[20px] bg-[#141b26] animate-pulse" />
        <div className="h-64 rounded-[20px] bg-[#141b26] animate-pulse" />
        <div className="h-64 rounded-[20px] bg-[#141b26] animate-pulse" />
      </div>
    ),
  }
);

export function AnalyticsCharts({
  data,
  showWeekdayPattern = true,
  showTimeOfDay = true,
  showDurationDistribution = true,
}: {
  data: AnalyticsStats;
  showWeekdayPattern?: boolean;
  showTimeOfDay?: boolean;
  showDurationDistribution?: boolean;
}) {
  return (
    <DynamicCharts
      data={data}
      showWeekdayPattern={showWeekdayPattern}
      showTimeOfDay={showTimeOfDay}
      showDurationDistribution={showDurationDistribution}
    />
  );
}
