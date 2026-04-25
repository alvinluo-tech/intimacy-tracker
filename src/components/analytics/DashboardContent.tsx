"use client";

import { useState } from "react";
import { Clock, Calendar, Activity, Zap, Tags, TrendingUp, TrendingDown, Star, Flame, Settings, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

import { QuickStartTimer } from "@/components/analytics/QuickStartTimer";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { ActivityHeatmap } from "@/components/analytics/ActivityHeatmap";
import { WeekdayPatternChart, TimeOfDayChart, DurationDistributionChart } from "@/components/analytics/AnalyticsCharts";
import { Sparkline } from "@/components/analytics/Sparkline";
import { MapSlice } from "@/components/analytics/MapSlice";
import { FeatureCards } from "@/components/analytics/FeatureCards";
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
    return <div className="min-h-screen bg-[#020617]" />;
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-24">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Encounter</h1>
            <p className="text-[15px] text-[#8b95a3] mt-1">Your intimacy insights</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f172a] text-[#8b95a3] hover:text-white hover:bg-white/[0.05] transition-colors border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={toggleBlur}
              title={blurEnabled ? "关闭隐私模式" : "开启隐私模式"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f172a] text-[#8b95a3] hover:text-white hover:bg-white/[0.05] transition-colors border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              {blurEnabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <QuickStartTimer />
        <FeatureCards />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-4">
          {widgets.quickStats && (
            <>
              <AnalyticsCard title="THIS WEEK">
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-white mb-2">
                    {stats.weekCount}
                  </div>
                  {stats.weekOverWeekChange !== null && (
                    <div
                      className={`text-[13px] font-medium flex items-center gap-1 ${
                        stats.weekOverWeekChange >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {stats.weekOverWeekChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {stats.weekOverWeekChange >= 0 ? "+" : ""}
                      {stats.weekOverWeekChange}%
                    </div>
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="AVG DURATION">
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-medium text-white">
                      {stats.avgDuration ?? "-"}
                    </span>
                    {stats.avgDuration && (
                      <span className="text-[15px] text-[#8b95a3]">m</span>
                    )}
                  </div>
                  {stats.recent7DaysDurations &&
                    stats.recent7DaysDurations.length > 0 && (
                      <div className="w-full h-6 opacity-60">
                        <Sparkline data={stats.recent7DaysDurations} color="rgba(255,255,255,0.7)" />
                      </div>
                    )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="AVG RATING">
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-white mb-2">
                    {stats.avgRating ?? "-"}
                  </div>
                  <div className="flex gap-0.5 text-[#f43f5e]">
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

              <AnalyticsCard title="LAST RECORD">
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-white mb-2">
                    {stats.lastEncounterAt
                      ? formatDistanceToNow(new Date(stats.lastEncounterAt), {
                          locale: zhCN,
                        }).replace(/前|分钟|小时|天|个月|年/g, (match) => {
                          const map: Record<string, string> = {
                            前: "",
                            分钟: "m",
                            小时: "h",
                            天: "d",
                            个月: "mo",
                            年: "y"
                          };
                          return map[match] || match;
                        })
                      : "-"}
                  </div>
                  {stats.lastEncounterAt && (
                    <span className="text-[13px] text-[#8b95a3]">ago</span>
                  )}
                </div>
              </AnalyticsCard>
            </>
          )}

          {widgets.activity30Days && (
            <AnalyticsCard
              title="30-DAY ACTIVITY"
              className="col-span-2 lg:col-span-4"
            >
              <DashboardTrendChart data={stats.recent30Days} />
            </AnalyticsCard>
          )}

          {widgets.yearOverview && (
            <AnalyticsCard
              title="YEAR OVERVIEW"
              className="col-span-2 lg:col-span-4"
            >
              <ActivityHeatmap data={stats.heatmapData} />
            </AnalyticsCard>
          )}
        </div>

        {/* Row: Weekday Pattern & Map Slice */}
        {(widgets.weekdayPattern || widgets.mapSlice) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {widgets.weekdayPattern && (
              <WeekdayPatternChart data={stats.weekdayDistribution} />
            )}
            {widgets.mapSlice && (
              <MapSlice
                cityCount={stats.cityCount}
                footprintCount={stats.footprintCount}
              />
            )}
          </div>
        )}

        {/* Row: Time of Day & Duration Distribution */}
        {(widgets.timeOfDay || widgets.durationDistribution) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {widgets.timeOfDay && (
              <TimeOfDayChart data={stats.timeOfDayDistribution} />
            )}
            {widgets.durationDistribution && (
              <DurationDistributionChart data={stats.durationDistribution} />
            )}
          </div>
        )}

        <div className="mt-4">
          {widgets.topTags && (
            <AnalyticsCard
              title="TOP TAGS"
            >
              <div className="privacy-blur-target flex flex-wrap gap-2">
                {stats.topRecentTags.length ? (
                  stats.topRecentTags.map((tag) => (
                    <Badge
                      key={tag.label}
                      className="px-3 py-1.5 text-[13px] bg-[#1e293b]/50 hover:bg-[#1e293b]/80 text-[#d0d6e0] font-medium border border-white/[0.05] rounded-full transition-colors"
                    >
                      {tag.label}
                      <span className="ml-2 flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-[#f43f5e]/20 text-[#f43f5e] text-[11px] font-mono font-bold px-1.5">
                        {tag.value}
                      </span>
                    </Badge>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-2 w-full">
                    {[65, 80, 70, 90, 60].map((width, i) => (
                      <div
                        key={i}
                        className="h-7 rounded-full bg-white/[0.03] animate-pulse"
                        style={{ width: `${width}px` }}
                      />
                    ))}
                    <div className="w-full mt-2 text-[13px] text-[#8b95a3]">
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
    </>
  );
}