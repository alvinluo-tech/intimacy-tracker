"use client";

import dynamic from "next/dynamic";
import type { CountPoint } from "@/features/analytics/types";

const DynamicChart = dynamic(
  () => import("./_DashboardTrendChartInner").then((m) => m.DashboardTrendChartInner),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full animate-pulse rounded-[8px] bg-white/[0.02]" />,
  }
);

export function DashboardTrendChart({ data }: { data: CountPoint[] }) {
  return <DynamicChart data={data} />;
}
