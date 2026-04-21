"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsStats } from "@/features/analytics/types";

function ChartShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--app-border)] bg-white/[0.02] p-4">
      <div className="text-[13px] font-medium tracking-[-0.13px] text-[var(--app-text-secondary)]">
        {title}
      </div>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(15,16,17,0.98)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#f7f8f8",
};

export function AnalyticsChartsInner({ data }: { data: AnalyticsStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartShell title="最近 12 周频率趋势">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.weeklyTrend12}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="最近 12 个月频率柱状图">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.monthlyTrend12}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand-accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="时长分布">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.durationDistribution}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="星期分布">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weekdayDistribution}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand-hover)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}