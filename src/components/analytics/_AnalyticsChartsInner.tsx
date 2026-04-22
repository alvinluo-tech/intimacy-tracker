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

import { Activity, BarChart2, CalendarDays, Clock } from "lucide-react";

import type { AnalyticsStats } from "@/features/analytics/types";

function ChartShell({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["rounded-[20px] border border-white/[0.02] bg-[#1a1f2e] p-5 transition-colors hover:bg-[#1f2536] hover:border-white/[0.05] group", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-2 mb-4 text-[var(--app-text-muted)]">
        {Icon && <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:text-[var(--brand)] transition-all" />}
        <div className="text-[13px] font-medium tracking-wide uppercase">
          {title}
        </div>
      </div>
      <div className="h-56">{children}</div>
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
    <div className="col-span-2 lg:col-span-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartShell title="最近 12 周频率趋势" icon={Activity}>
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
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={3} dot={{ r: 4, fill: "var(--app-bg)", strokeWidth: 2 }} activeDot={{ r: 6, fill: "var(--brand)" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="最近 12 个月频率柱状图" icon={BarChart2}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.monthlyTrend12}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand-accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="时长分布" icon={Clock}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.durationDistribution}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="星期分布" icon={CalendarDays}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weekdayDistribution}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} horizontal={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8a8f98", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="value" fill="var(--brand-hover)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}