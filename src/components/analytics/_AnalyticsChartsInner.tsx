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

function ChartShell({
  title,
  children,
  className,
}: {
  title: string;
  children:
    | ReactNode
    | ((args: { width: number; height: number; ready: boolean }) => ReactNode);
  className?: string;
}) {
  const { ref, ready, width, height } = useChartReady<HTMLDivElement>();

  return (
    <div className={["rounded-[16px] bg-[#141b26] p-5", className].filter(Boolean).join(" ")}>
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">
        {title}
      </div>
      <div ref={ref} className="h-56 min-w-0 min-h-[224px]">
        {typeof children === "function"
          ? children({ width, height, ready })
          : ready
            ? children
            : null}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(15,16,17,0.98)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#f7f8f8",
};

export function AnalyticsChartsInner({
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
  const visibleCount = [showWeekdayPattern, showTimeOfDay, showDurationDistribution].filter(Boolean).length;
  if (visibleCount === 0) return null;

  return (
    <div className={`grid grid-cols-1 gap-4 xl:grid-cols-${Math.min(visibleCount, 3)}`}>
      {showWeekdayPattern && (
        <ChartShell title="WEEKDAY PATTERN">
          {({ width, height, ready }) =>
            ready ? (
              <BarChart width={width} height={height} data={data.weekdayDistribution}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8a8f98", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const map: Record<string, string> = { "周一": "Mon", "周二": "Tue", "周三": "Wed", "周四": "Thu", "周五": "Fri", "周六": "Sat", "周日": "Sun" };
                    return map[value] || value;
                  }}
                />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey="value" fill="#ff5577" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : null
          }
        </ChartShell>
      )}

      {showTimeOfDay && (
        <ChartShell title="TIME OF DAY">
          <HorizontalBarList data={data.timeOfDayDistribution} valueType="percentage" layout="stack" />
        </ChartShell>
      )}

      {showDurationDistribution && (
        <ChartShell title="DURATION DISTRIBUTION">
          <HorizontalBarList data={data.durationDistribution} valueType="count" layout="inline" />
        </ChartShell>
      )}
    </div>
  );
}
