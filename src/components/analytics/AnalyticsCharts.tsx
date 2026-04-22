"use client";

import dynamic from "next/dynamic";
import type { AnalyticsStats } from "@/features/analytics/types";

const DynamicCharts = dynamic(
  () => import("./_AnalyticsChartsInner").then((m) => m.AnalyticsChartsInner),
  {
    ssr: false,
    loading: () => (
      <div className="col-span-2 lg:col-span-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-64 rounded-[20px] border border-white/[0.02] bg-[#1a1f2e] animate-pulse" />
        <div className="h-64 rounded-[20px] border border-white/[0.02] bg-[#1a1f2e] animate-pulse" />
        <div className="h-64 rounded-[20px] border border-white/[0.02] bg-[#1a1f2e] animate-pulse" />
      </div>
    ),
  }
);

export function AnalyticsCharts({ data }: { data: AnalyticsStats }) {
  return <DynamicCharts data={data} />;
}
