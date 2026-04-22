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

import { CalendarDays, Clock, SunMoon } from "lucide-react";

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
    <div className="col-span-2 lg:col-span-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
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

      <ChartShell title="时段分布" icon={SunMoon}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.timeOfDayDistribution}>
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

      <ChartShell title="时长区间" icon={Clock}>
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
    </div>
  );
}