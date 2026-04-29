"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Clock, Calendar, Activity, Zap, Tags, TrendingUp, TrendingDown, Star, Flame, Settings, Eye, EyeOff, Hash, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

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
  selectedPartnerId,
}: {
  stats: AnalyticsStats;
  partners: any[];
  tags: any[];
  selectedPartnerId?: string | null;
}) {
  const router = useRouter();
  const { widgets, updateWidgets, mounted } = useDashboardWidgets();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);
  const toggleBlur = usePrivacyStore((s) => s.toggleBlur);
  const t = useTranslations("analytics");
  const tc = useTranslations("common");
  const locale = useLocale();

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  const handlePartnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__all__") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?partnerId=${val}`);
    }
  };

  const defaultPartner = partners.find((p: any) => p.is_default);
  const currentPartnerLabel = selectedPartnerId
    ? partners.find((p: any) => p.id === selectedPartnerId)?.nickname ?? tc("allPartners")
    : tc("allPartners");

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-24">
        {/* Header Area */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-content">{t("encounter")}</h1>
            <p className="text-[15px] text-muted mt-1">{t("insights")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {partners.length > 0 && (
              <div className="relative">
                <select
                  value={selectedPartnerId ?? "__all__"}
                  onChange={handlePartnerChange}
                  className="appearance-none h-10 rounded-full bg-surface text-muted hover:text-content border border-border px-4 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-border cursor-pointer transition-colors"
                >
                  <option value="__all__">{tc("allPartners")}</option>
                  {partners.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nickname}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted hover:text-content hover:bg-surface/50 transition-colors border border-border"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={toggleBlur}
              title={blurEnabled ? t("disablePrivacy") : t("enablePrivacy")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted hover:text-content hover:bg-surface/50 transition-colors border border-border"
            >
              {blurEnabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <QuickStartTimer />
        <FeatureCards />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mt-4">
          {widgets.quickStats && (
            <>
              <AnalyticsCard title={t("thisWeek")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-content mb-2">
                    {stats.weekCount}
                  </div>
                  {stats.weekOverWeekChange !== null && (
                    <div
                      className={`text-[13px] font-medium flex items-center gap-1 ${
                        stats.weekOverWeekChange >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {stats.weekOverWeekChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {stats.weekOverWeekChange >= 0 ? "+" : ""}
                      {stats.weekOverWeekChange}%
                    </div>
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title={t("avgDuration")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-medium text-content">
                      {stats.avgDuration ?? "-"}
                    </span>
                    {stats.avgDuration && (
                      <span className="text-[15px] text-muted">m</span>
                    )}
                  </div>
                  {stats.recent7DaysDurations &&
                    stats.recent7DaysDurations.length > 0 && (
                      <div className="w-full h-6 opacity-60">
                        <Sparkline data={stats.recent7DaysDurations} color="var(--muted)" />
                      </div>
                    )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title={t("avgRating")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-content mb-2">
                    {stats.avgRating ?? "-"}
                  </div>
                  <div className="flex gap-0.5 text-primary">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          (stats.avgRating || 0) >= star
                            ? "fill-current"
                            : "fill-muted/20 text-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </AnalyticsCard>

              <AnalyticsCard title={t("lastRecord")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-content mb-2">
                    {stats.lastEncounterAt
                      ? (() => {
                          const dateLocale = locale === "zh" ? zhCN : enUS;
                          let formatted = formatDistanceToNow(new Date(stats.lastEncounterAt), { locale: dateLocale });
                          if (locale === "zh") {
                            formatted = formatted
                              .replace(/前/, "")
                              .replace(/不到/, "<")
                              .replace(/分钟?/, "m")
                              .replace(/小时?/, "h")
                              .replace(/天/, "d")
                              .replace(/个月?/, "mo")
                              .replace(/年/, "y");
                          } else {
                            formatted = formatted
                              .replace(/^about /, "")
                              .replace(/ less than a minute ago/, "<1m")
                              .replace(/(\d+) minutes? ago/, "$1m")
                              .replace(/(\d+) hours? ago/, "$1h")
                              .replace(/(\d+) days? ago/, "$1d")
                              .replace(/(\d+) months? ago/, "$1mo")
                              .replace(/(\d+) years? ago/, "$1y");
                          }
                          return formatted;
                        })()
                      : "-"}
                  </div>
                  {stats.lastEncounterAt && (
                    <span className="text-[13px] text-muted">{t("ago")}</span>
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title={t("totalCount")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target text-4xl font-medium text-content mb-2">
                    {stats.totalCount}
                  </div>
                </div>
              </AnalyticsCard>
            </>
          )}

          {widgets.activity30Days && (
            <AnalyticsCard
              title={t("thirtyDayActivity")}
              className="col-span-2 lg:col-span-4"
            >
              <DashboardTrendChart data={stats.recent30Days} />
            </AnalyticsCard>
          )}

          {widgets.yearOverview && (
            <AnalyticsCard
              title={t("yearOverview")}
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
              title={t("topTags")}
            >
              <div className="privacy-blur-target flex flex-wrap gap-2">
                {stats.topRecentTags.length ? (
                  stats.topRecentTags.map((tag) => (
                    <Badge
                      key={tag.label}
                      className="px-3 py-1.5 text-[13px] bg-surface hover:bg-surface/80 text-content font-medium border border-border rounded-full transition-colors"
                    >
                      {tag.label}
                      <span className="ml-2 flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-primary/20 text-primary text-[11px] font-mono font-bold px-1.5">
                        {tag.value}
                      </span>
                    </Badge>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-2 w-full">
                    {[65, 80, 70, 90, 60].map((width, i) => (
                      <div
                        key={i}
                        className="h-7 rounded-full bg-surface/10 animate-pulse"
                        style={{ width: `${width}px` }}
                      />
                    ))}
                    <div className="w-full mt-2 text-[13px] text-muted">
                      {t("tryTags")}
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
          defaultLocationMode={typeof window !== "undefined" && ["off", "city", "exact"].includes(localStorage.getItem("encounter_location_mode") ?? "") ? localStorage.getItem("encounter_location_mode") as "off" | "city" | "exact" : "off"}
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
