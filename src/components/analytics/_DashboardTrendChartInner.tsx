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
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              color: "#f1f5f9",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#trendFill)"
            style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.3))" }}
          />
        </AreaChart>
      ) : null}
    </div>
  );
}
