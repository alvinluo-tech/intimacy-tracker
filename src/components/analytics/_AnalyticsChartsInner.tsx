"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsStats } from "@/features/analytics/types";

import { HorizontalBarList } from "./HorizontalBarList";
import { useChartReady } from "./useChartReady";
import { AnalyticsCard } from "./AnalyticsCard";

const tooltipStyle = {
  background: "#020617",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#f7f8f8",
  boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
};

export function WeekdayPatternChart({ data }: { data: AnalyticsStats["weekdayDistribution"] }) {
  const { ref, ready, width, height } = useChartReady<HTMLDivElement>();
  const t = useTranslations("analytics");
  const weekdayMap: Record<string, string> = {
    Mon: t("monday"),
    Tue: t("tuesday"),
    Wed: t("wednesday"),
    Thu: t("thursday"),
    Fri: t("friday"),
    Sat: t("saturday"),
    Sun: t("sunday"),
  };
  
  return (
    <AnalyticsCard title={t("weekdayPattern")}>
      <div ref={ref} className="h-56 min-w-0 min-h-[224px]">
        {ready ? (
          <BarChart width={width} height={height} data={data}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} horizontal={false} opacity={0.1} />
            <XAxis
              dataKey="label"
              tickFormatter={(label: string) => weekdayMap[label] ?? label}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-content)",
              }} 
              cursor={{ fill: "var(--color-muted)", opacity: 0.1 }} 
            />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : null}
      </div>
    </AnalyticsCard>
  );
}

export function TimeOfDayChart({ data }: { data: AnalyticsStats["timeOfDayDistribution"] }) {
  const t = useTranslations("analytics");
  const labelMap: Record<string, string> = {
    Morning: t("morning"),
    Afternoon: t("afternoon"),
    Evening: t("evening"),
    Night: t("night"),
  };
  return (
    <AnalyticsCard title={t("timeOfDay")}>
      <div className="h-56 min-h-[224px]">
        <HorizontalBarList data={data} valueType="percentage" layout="stack" labelMap={labelMap} />
      </div>
    </AnalyticsCard>
  );
}

export function DurationDistributionChart({ data }: { data: AnalyticsStats["durationDistribution"] }) {
  const t = useTranslations("analytics");
  return (
    <AnalyticsCard title={t("durationDistribution")}>
      <div className="h-56 min-h-[224px]">
        <HorizontalBarList data={data} valueType="count" layout="inline" />
      </div>
    </AnalyticsCard>
  );
}
