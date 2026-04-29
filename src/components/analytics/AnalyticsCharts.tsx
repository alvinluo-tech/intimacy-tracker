"use client";

import dynamic from "next/dynamic";
import type { AnalyticsStats } from "@/features/analytics/types";

const loadingPlaceholder = <div className="h-64 rounded-[20px] bg-surface border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-pulse" />;

export const WeekdayPatternChart = dynamic(
  () => import("./_AnalyticsChartsInner").then((m) => m.WeekdayPatternChart),
  { ssr: false, loading: () => loadingPlaceholder }
);

export const TimeOfDayChart = dynamic(
  () => import("./_AnalyticsChartsInner").then((m) => m.TimeOfDayChart),
  { ssr: false, loading: () => loadingPlaceholder }
);

export const DurationDistributionChart = dynamic(
  () => import("./_AnalyticsChartsInner").then((m) => m.DurationDistributionChart),
  { ssr: false, loading: () => loadingPlaceholder }
);
