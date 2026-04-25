"use client";

import type { ReactNode } from "react";
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
  
  return (
    <AnalyticsCard title="WEEKDAY PATTERN">
      <div ref={ref} className="h-56 min-w-0 min-h-[224px]">
        {ready ? (
          <BarChart width={width} height={height} data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8b95a3", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                const map: Record<string, string> = { "周一": "Mon", "周二": "Tue", "周三": "Wed", "周四": "Thu", "周五": "Fri", "周六": "Sat", "周日": "Sun" };
                return map[value] || value;
              }}
            />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : null}
      </div>
    </AnalyticsCard>
  );
}

export function TimeOfDayChart({ data }: { data: AnalyticsStats["timeOfDayDistribution"] }) {
  return (
    <AnalyticsCard title="TIME OF DAY">
      <div className="h-56 min-h-[224px]">
        <HorizontalBarList data={data} valueType="percentage" layout="stack" />
      </div>
    </AnalyticsCard>
  );
}

export function DurationDistributionChart({ data }: { data: AnalyticsStats["durationDistribution"] }) {
  return (
    <AnalyticsCard title="DURATION DISTRIBUTION">
      <div className="h-56 min-h-[224px]">
        <HorizontalBarList data={data} valueType="count" layout="inline" />
      </div>
    </AnalyticsCard>
  );
}
