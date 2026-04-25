"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CountPoint } from "@/features/analytics/types";
import { useChartReady } from "./useChartReady";

export function DashboardTrendChartInner({ data }: { data: CountPoint[] }) {
  const { ref, ready, width, height } = useChartReady<HTMLDivElement>();

  return (
    <div ref={ref} className="h-56 w-full min-w-0 min-h-[224px]">
      {ready ? (
        <AreaChart width={width} height={height} data={data}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a8f98", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            contentStyle={{
              background: "rgba(15,16,17,0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "#f7f8f8",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#trendFill)"
          />
        </AreaChart>
      ) : null}
    </div>
  );
}
