"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CountPoint } from "@/features/analytics/types";

export function DashboardTrendChart({ data }: { data: CountPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7170ff" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#7170ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a8f98", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#8a8f98", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
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
            stroke="#7170ff"
            strokeWidth={2}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
