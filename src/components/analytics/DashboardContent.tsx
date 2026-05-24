"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp, Settings, Eye, EyeOff, ChevronDown, Download } from "lucide-react";
import { formatDistanceToNow, startOfWeek, endOfWeek } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

import dynamic from "next/dynamic";
import { QuickStartTimer } from "@/components/analytics/QuickStartTimer";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { StarRating } from "@/components/ui/StarRating";
import { WeekdayPatternChart, TimeOfDayChart, DurationDistributionChart } from "@/components/analytics/AnalyticsCharts";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DateRangeFilter, type DateRange } from "@/components/analytics/DateRangeFilter";

const ActivityHeatmap = dynamic(() => import("@/components/analytics/ActivityHeatmap").then((m) => m.ActivityHeatmap), {
  ssr: false,
  loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-surface" />,
});
import { Sparkline } from "@/components/analytics/Sparkline";
import { MapSlice } from "@/components/analytics/MapSlice";
import { FeatureCards } from "@/components/analytics/FeatureCards";
import { AddLogModal } from "@/components/forms/AddLogModal";
import { DashboardSettingsModal } from "@/components/analytics/DashboardSettingsModal";
import { useDashboardWidgets } from "@/components/analytics/useDashboardWidgets";
import { usePrivacyStore } from "@/stores/privacy-store";
import { isPwaInstalled, triggerInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

import type { AnalyticsStats } from "@/features/analytics/types";

export function DashboardContent({
  stats,
  partners,
  tags,
  selectedPartnerId,
  dateStartDate,
  dateEndDate,
}: {
  stats: AnalyticsStats;
  partners: any[];
  tags: any[];
  selectedPartnerId?: string | null;
  dateStartDate?: string | null;
  dateEndDate?: string | null;
}) {
  const router = useRouter();
  const { widgets, updateWidgets } = useDashboardWidgets();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);
  const toggleBlur = usePrivacyStore((s) => s.toggleBlur);
  const t = useTranslations("analytics");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [installable, setInstallable] = useState(false);
  const storedLocationMode = useLocalStorage("encounter_location_mode");
  const defaultLocationMode = ["off", "city", "exact"].includes(storedLocationMode ?? "")
    ? (storedLocationMode as "off" | "city" | "exact")
    : "off";

  useEffect(() => {
    if (!isPwaInstalled()) setInstallable(true);
  }, []);

  const handleInstallClick = () => {
    triggerInstallPrompt();
  };

  const initialPreset = dateStartDate || dateEndDate ? "custom" : "allTime";
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: dateStartDate ? new Date(dateStartDate) : null,
    endDate: dateEndDate ? new Date(dateEndDate) : null,
    preset: initialPreset as DateRange["preset"],
  });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    const params = new URLSearchParams(window.location.search);
    if (range.preset === "allTime") {
      params.delete("startDate");
      params.delete("endDate");
    } else if (range.preset === "custom" && range.startDate && range.endDate) {
      params.set("startDate", range.startDate.toISOString());
      params.set("endDate", range.endDate.toISOString());
    } else {
      // Preset ranges: compute actual dates
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start: Date;
      let end: Date;
      switch (range.preset) {
        case "thisWeek":
          start = startOfWeek(today, { weekStartsOn: 1 });
          end = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case "last15Days":
          start = new Date(today);
          start.setDate(today.getDate() - 14);
          end = today;
          break;
        case "thisMonth":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          break;
        default:
          params.delete("startDate");
          params.delete("endDate");
          router.push(`/dashboard?${params.toString()}`);
          return;
      }
      params.set("startDate", start.toISOString());
      params.set("endDate", end.toISOString());
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  };

  const totalDurationMinutes = stats.totalDurationSum;
  const totalDurationHours = Math.floor(totalDurationMinutes / 60);
  const remainingMinutes = totalDurationMinutes % 60;

  const avgPerWeek = (() => {
    if (stats.totalCount === 0) return "-";
    if (dateStartDate && dateEndDate) {
      const days = Math.max(1, (new Date(dateEndDate).getTime() - new Date(dateStartDate).getTime()) / (24 * 60 * 60 * 1000) + 1);
      return (stats.totalCount / Math.max(1, days / 7)).toFixed(1);
    }
    // All-time: use heatmap span
    const first = stats.heatmapData?.find((d) => d.count > 0)?.date;
    const last = [...(stats.heatmapData ?? [])].reverse().find((d) => d.count > 0)?.date;
    if (!first || !last) return "-";
    const days = Math.max(1, (new Date(last).getTime() - new Date(first).getTime()) / (24 * 60 * 60 * 1000) + 1);
    return (stats.totalCount / Math.max(1, days / 7)).toFixed(1);
  })();

  const handlePartnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (val === "__all__") {
      params.delete("partnerId");
    } else {
      params.set("partnerId", val);
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  };

  const defaultPartner = partners.find((p: any) => p.is_default);
  const currentPartnerLabel = selectedPartnerId
    ? partners.find((p: any) => p.id === selectedPartnerId)?.nickname ?? tc("allPartners")
    : tc("allPartners");

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 pb-24 md:px-6">
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-content">{t("encounter")}</h1>
            <p className="text-sm text-muted mt-1">{t("insights")}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
              {partners.length > 0 && (
                <div className="relative min-w-0 max-w-[160px]">
                  <select
                    value={selectedPartnerId ?? "__all__"}
                    onChange={handlePartnerChange}
                    className="appearance-none h-10 rounded-full bg-surface text-muted hover:text-content border border-border px-4 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-border cursor-pointer transition-colors w-full truncate"
                  >
                    <option value="__all__">{tc("allPartners")}</option>
                    {partners.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 self-end">
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
              {installable && (
                <button
                  onClick={handleInstallClick}
                  title={t("installApp")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted hover:text-content hover:bg-surface/50 transition-colors border border-border"
                >
                  <Download className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <QuickStartTimer />
        <FeatureCards />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mt-4">
          {widgets.quickStats && (
            <>
              <AnalyticsCard title={t("avgPerWeek")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-medium text-content">
                      {avgPerWeek}
                    </span>
                    <span className="text-[15px] text-muted">/w</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-muted" />
                    <span className="text-[12px] text-muted">
                      {stats.totalCount} {t("totalCount")}
                    </span>
                  </div>
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
                  <StarRating score={stats.avgRating ?? 0} size={16} className="text-primary" />
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

              <AnalyticsCard title={t("totalDuration")}>
                <div className="flex flex-col mt-1">
                  <div className="privacy-blur-target flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-medium text-content">
                      {totalDurationHours > 0 ? totalDurationHours : totalDurationMinutes}
                    </span>
                    <span className="text-[15px] text-muted">
                      {totalDurationHours > 0 ? t("hours") : t("minutes")}
                    </span>
                  </div>
                  {totalDurationHours > 0 && remainingMinutes > 0 && (
                    <span className="text-[13px] text-muted">
                      {remainingMinutes}{t("minutes")}
                    </span>
                  )}
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
                totalCount={stats.totalCount}
                countryCount={stats.countryCount}
                widgets={widgets}
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
                  stats.topRecentTags.map((tag, i) => (
                    <Badge
                      key={`${tag.label}-${i}`}
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
          defaultLocationMode={defaultLocationMode}
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
