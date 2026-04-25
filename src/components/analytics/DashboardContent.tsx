"use client";

import { useState } from "react";
import { Clock, Calendar, Activity, Zap, Tags, TrendingUp, Star, Flame, Settings, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

import { QuickStartTimer } from "@/components/analytics/QuickStartTimer";
import { FeatureCards } from "@/components/analytics/FeatureCards";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { ActivityHeatmap } from "@/components/analytics/ActivityHeatmap";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Sparkline } from "@/components/analytics/Sparkline";
import { MapSlice } from "@/components/analytics/MapSlice";
import { AddLogModal } from "@/components/forms/AddLogModal";
import { DashboardSettingsModal } from "@/components/analytics/DashboardSettingsModal";
import { useDashboardWidgets } from "@/components/analytics/useDashboardWidgets";
import { usePrivacyStore } from "@/stores/privacy-store";

import type { AnalyticsStats } from "@/features/analytics/types";

export function DashboardContent({
  stats,
  partners,
  tags,
}: {
  stats: AnalyticsStats;
  partners: any[];
  tags: any[];
}) {
  const { widgets, updateWidgets, mounted } = useDashboardWidgets();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);
  const toggleBlur = usePrivacyStore((s) => s.toggleBlur);

  // Avoid hydration mismatch by not rendering widgets until mounted
  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="bg-slate-950 min-h-screen selection:bg-rose-500/30">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-24">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Encounter</h1>
            <p className="text-[15px] text-slate-400 mt-1">Your intimacy insights</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm shadow-black/20"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={toggleBlur}
              title={blurEnabled ? "关闭隐私模式" : "开启隐私模式"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm shadow-black/20"
            >
              {blurEnabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <QuickStartTimer />
        <FeatureCards />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {widgets.quickStats && (
            <>
              <AnalyticsCard title="THIS WEEK" icon={Activity}>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="privacy-blur-target text-3xl font-semibold text-slate-100">
                    {stats.weekCount}
                  </div>
                  {stats.weekOverWeekChange !== null && (
                    <div
                      className={`flex items-center gap-1 text-[13px] font-medium ${
                        stats.weekOverWeekChange >= 0
                          ? "text-emerald-400"
                          : "text-rose-500"
                      }`}
                    >
                      {stats.weekOverWeekChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5 rotate-180" />}
                      {stats.weekOverWeekChange >= 0 ? "+" : ""}{stats.weekOverWeekChange}%
                    </div>
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="AVG DURATION" icon={Clock}>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="privacy-blur-target flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-slate-100">
                      {stats.avgDuration ?? "-"}
                    </span>
                    {stats.avgDuration && (
                      <span className="text-[13px] text-slate-400">m</span>
                    )}
                  </div>
                  {stats.recent7DaysDurations &&
                    stats.recent7DaysDurations.length > 0 && (
                      <div className="w-16 h-8 opacity-50">
                        <Sparkline data={stats.recent7DaysDurations} />
                      </div>
                    )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="AVG RATING" icon={Star}>
                <div className="flex items-center gap-2 mt-1">
                  <div className="privacy-blur-target text-3xl font-semibold text-slate-100">
                    {stats.avgRating ?? "-"}
                  </div>
                  <div className="flex gap-0.5 text-rose-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          (stats.avgRating || 0) >= star
                            ? "fill-current"
                            : "fill-white/10 text-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="LAST RECORD" icon={Zap}>
                <div className="flex items-baseline gap-1 mt-1">
                  <div className="privacy-blur-target text-3xl font-semibold text-slate-100">
                    {stats.lastEncounterAt
                      ? formatDistanceToNow(new Date(stats.lastEncounterAt), {
                          locale: zhCN,
                        }).replace(/前|分钟|小时|天/g, (match) => {
                          const map: Record<string, string> = {
                            前: "",
                            分钟: "m",
                            小时: "h",
                            天: "d",
                          };
                          return map[match] || match;
                        })
                      : "-"}
                  </div>
                  {stats.lastEncounterAt && (
                    <span className="text-[13px] text-slate-400">ago</span>
                  )}
                </div>
              </AnalyticsCard>
            </>
          )}

          {widgets.activity30Days && (
            <AnalyticsCard
              title="30-DAY ACTIVITY"
              icon={TrendingUp}
              className="col-span-2 lg:col-span-4"
            >
              <DashboardTrendChart data={stats.recent30Days} />
            </AnalyticsCard>
          )}

          {widgets.yearOverview && (
            <AnalyticsCard
              title="YEAR OVERVIEW"
              icon={Flame}
              className="col-span-2 lg:col-span-4"
            >
              <ActivityHeatmap data={stats.heatmapData} />
            </AnalyticsCard>
          )}
        </div>

        {/* AnalyticsCharts inner handles Weekday, Time of Day, Duration Distribution */}
        {(widgets.weekdayPattern ||
          widgets.timeOfDay ||
          widgets.durationDistribution) && (
          <div className="mt-4">
            <AnalyticsCharts
              data={stats}
              showWeekdayPattern={widgets.weekdayPattern}
              showTimeOfDay={widgets.timeOfDay}
              showDurationDistribution={widgets.durationDistribution}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-4">
          {widgets.mapSlice && (
            <div className="col-span-2 lg:col-span-2 h-56 lg:h-auto">
              <MapSlice
                cityCount={stats.cityCount}
                footprintCount={stats.footprintCount}
              />
            </div>
          )}

          {widgets.topTags && (
            <AnalyticsCard
              title="TOP TAGS"
              icon={Tags}
              className={`col-span-2 ${
                widgets.mapSlice ? "lg:col-span-2" : "lg:col-span-4"
              }`}
            >
              <div className="privacy-blur-target flex flex-wrap gap-2">
                {stats.topRecentTags.length ? (
                  stats.topRecentTags.map((tag) => (
                    <Badge
                      key={tag.label}
                      className="px-3 py-1.5 text-[13px] bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 font-medium border-0 transition-colors"
                    >
                      {tag.label}{" "}
                      <span className="ml-1.5 text-rose-500 font-medium">
                        {tag.value}
                      </span>
                    </Badge>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-2 w-full">
                    {[65, 80, 70, 90, 60].map((width, i) => (
                      <div
                        key={i}
                        className="h-7 rounded-full bg-slate-800/50 animate-pulse"
                        style={{ width: `${width}px` }}
                      />
                    ))}
                    <div className="w-full mt-2 text-[13px] text-slate-400">
                      Try adding tags in your next record
                    </div>
                  </div>
                )}
              </div>
            </AnalyticsCard>
          )}
        </div>

        <AddLogModal
          partners={partners}
          tags={tags}
          defaultLocationMode="off"
        />
      </div>

      <DashboardSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        widgets={widgets}
        onUpdateWidgets={updateWidgets}
      />
    </div>
  );
}