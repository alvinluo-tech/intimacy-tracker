"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Share2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";
import { THEMES } from "@/components/report/poster/AnnualPoster";
import type { AnnualReportData } from "@/lib/report/aggregator";
import type { PersonalTag } from "@/lib/report/tag-engine";
import type { AllPercentiles } from "@/lib/report/percentile";

const AVAILABLE_YEARS = [2024, 2025, 2026];

type Partner = {
  id: string;
  nickname: string;
  color: string | null;
  is_default: boolean;
  encounterCount: number;
};

type PrivacySettings = {
  showTotalCount: boolean;
  showPercentile: boolean;
  showTimePattern: boolean;
  showLocation: boolean;
  showNotes: boolean;
};

function LinearSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        "relative h-6 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-primary/70 bg-primary shadow-lg shadow-primary/20"
          : "border-border bg-surface"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200",
          checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"
        )}
      />
    </button>
  );
}

function generateHeatmapGrid(data: AnnualReportData) {
  const cellSize = 12;
  const gap = 2;

  return { cellSize, gap, dailyActivity: data.dailyActivity };
}

function HeatmapCalendar({
  dailyActivity,
  accentColor,
  labels,
}: {
  dailyActivity: { date: string; count: number }[];
  accentColor: string;
  labels: { less: string; more: string; tooltip: (date: string, count: number) => string };
}) {
  if (!labels || dailyActivity.length === 0) return null;

  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  const firstDate = new Date(dailyActivity[0]?.date || new Date());
  const firstDayOfWeek = firstDate.getDay();

  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: "", count: 0 });
  }

  for (const day of dailyActivity) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", count: 0 });
    }
    weeks.push(currentWeek);
  }

  const maxCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  const getIntensityStyle = (count: number): React.CSSProperties => {
    if (count === 0) {
      return { background: "rgba(255,255,255,0.05)" };
    }
    const intensity = count / maxCount;
    if (intensity <= 0.25) {
      return { background: accentColor, opacity: 0.2 };
    }
    if (intensity <= 0.5) {
      return { background: accentColor, opacity: 0.4 };
    }
    if (intensity <= 0.75) {
      return { background: accentColor, opacity: 0.6 };
    }
    if (intensity <= 0.9) {
      return { background: accentColor, opacity: 0.8 };
    }
    return { background: accentColor, opacity: 1 };
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-[3px]">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-[3px]">
            {week.map((day, dIndex) => (
              <div
                key={dIndex}
                title={day.date ? labels.tooltip(day.date, day.count) : undefined}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2,
                  ...getIntensityStyle(day.count),
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(168,162,158,0.7)" }}>
        <span>{labels.less}</span>
        <div style={{ width: 11, height: 11, borderRadius: 2, background: "rgba(255,255,255,0.05)" }} />
        <div style={{ width: 11, height: 11, borderRadius: 2, background: accentColor, opacity: 0.2 }} />
        <div style={{ width: 11, height: 11, borderRadius: 2, background: accentColor, opacity: 0.4 }} />
        <div style={{ width: 11, height: 11, borderRadius: 2, background: accentColor, opacity: 0.6 }} />
        <div style={{ width: 11, height: 11, borderRadius: 2, background: accentColor, opacity: 0.8 }} />
        <div style={{ width: 11, height: 11, borderRadius: 2, background: accentColor, opacity: 1 }} />
        <span>{labels.more}</span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const t = useTranslations("report");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTheme, setSelectedTheme] = useState(THEMES.darkPurple);
  const [reportData, setReportData] = useState<AnnualReportData | null>(null);
  const [percentiles, setPercentiles] = useState<AllPercentiles | null>(null);
  const [tags, setTags] = useState<PersonalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    showTotalCount: true,
    showPercentile: true,
    showTimePattern: true,
    showLocation: false,
    showNotes: false,
  });

  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await fetch("/api/partners");
        if (response.ok) {
          const data = await response.json();
          const partnersList = data.partners || [];
          setPartners(partnersList);
          const defaultPartner = partnersList.find((p: Partner) => p.is_default);
          if (defaultPartner) {
            setSelectedPartnerId(defaultPartner.id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch partners:", err);
      }
    }
    fetchPartners();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          year: String(selectedYear),
        });
        if (selectedPartnerId) {
          params.set("partnerId", selectedPartnerId);
        }

        const response = await fetch(`/api/report/data?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 404) {
            setReportData(null);
            setPercentiles(null);
            setTags([]);
            return;
          }
          throw new Error(t("fetchError"));
        }
        const result = await response.json();
        setReportData(result.data);
        setPercentiles(result.percentiles);
        setTags(result.tags);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedYear, selectedPartnerId, partners]);

  const posterRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setGenerating(true);
    try {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 200));

      const scale = 1080 / posterRef.current.offsetWidth;

      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: scale,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `encounter-${selectedYear}-wrapped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t("downloadSuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("downloadFailed");
      console.error("Download failed:", error);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const WEEKDAY_NAMES = [
    t("weekdaySun"), t("weekdayMon"), t("weekdayTue"), t("weekdayWed"),
    t("weekdayThu"), t("weekdayFri"), t("weekdaySat"),
  ];
  const MONTH_NAMES = [
    t("month1"), t("month2"), t("month3"), t("month4"), t("month5"), t("month6"),
    t("month7"), t("month8"), t("month9"), t("month10"), t("month11"), t("month12"),
  ];

  const heatmap = reportData ? generateHeatmapGrid(reportData) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-24">
      <div className="mb-2">
        <h1 className="text-[22px] font-semibold text-content">{t("title")}</h1>
        <p className="text-[13px] text-muted mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Year Selector */}
      <div className="rounded-[20px] bg-surface p-5 border border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          {t("selectYear")}
        </h2>
        <div className="flex gap-2">
          {AVAILABLE_YEARS.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
                selectedYear === year
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-surface border border-border text-foreground hover:bg-muted"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Partner Selector */}
      <div className="rounded-[20px] bg-surface p-5 border border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          {t("selectPartner")}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedPartnerId("")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all",
              !selectedPartnerId
                ? "bg-primary text-white shadow-sm"
                : "border border-border text-foreground hover:bg-muted"
            )}
          >
            {t("allPartners")}
          </button>
          {partners.map((partner) => (
            <button
              key={partner.id}
              type="button"
              onClick={() => setSelectedPartnerId(partner.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all",
                selectedPartnerId === partner.id
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: partner.color || "#888" }}
              />
              {partner.nickname}
              <span className="opacity-50 text-xs">
                {partner.encounterCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selector */}
      <div className="rounded-[20px] bg-surface p-5 border border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          {t("chooseTheme")}
        </h2>
        <div className="flex gap-2">
          {Object.values(THEMES).map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedTheme(theme)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-all",
                selectedTheme.id === theme.id
                  ? "bg-primary text-white shadow-sm"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: theme.accent }}
              />
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-[20px] bg-surface p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {t("preview")}
          </h2>
          <span className="text-[11px] text-muted">{t("dimensions")}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted" />
          </div>
        ) : error || !reportData ? (
          <div className="flex items-center justify-center h-[300px] text-muted">
            <p className="text-[13px]">{error || t("noData")}</p>
          </div>
        ) : (
          <div
            ref={posterRef}
            className="rounded-[16px] overflow-hidden border"
            style={{ background: selectedTheme.background }}
          >
            <div className="p-5 sm:p-10">
              {/* Header */}
              <p
                className="text-[11px] tracking-widest mb-2 sm:mb-4"
                style={{ color: selectedTheme.textSecondary }}
              >
                {t("posterHeader", { year: selectedYear })}
              </p>
              <div
                className="text-5xl sm:text-7xl font-bold"
                style={{ color: selectedTheme.text }}
              >
                {privacy.showTotalCount ? reportData.totalCount : "—"}
              </div>
              <p
                className="text-sm sm:text-lg mt-1 sm:mt-2 mb-5 sm:mb-8"
                style={{ color: selectedTheme.textSecondary }}
              >
                {t("encountersThisYear")}
              </p>

              {/* Percentile Banner */}
              {privacy.showPercentile && percentiles && (
                <div
                  className="rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 text-center sm:text-left sm:flex sm:justify-between sm:items-center"
                  style={{
                    background: selectedTheme.cardBg,
                    border: `1px solid ${selectedTheme.accent}33`,
                  }}
                >
                  <div>
                    <div
                      className="text-3xl sm:text-4xl font-bold"
                      style={{ color: selectedTheme.accent }}
                    >
                      {t("topPercentile", { percentile: 100 - percentiles.frequency.percentile })}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      {t("percentileDescription", { percentile: percentiles.frequency.percentile })}
                    </div>
                  </div>
                  <div
                    className="text-[11px] mt-2 sm:mt-0 sm:text-right"
                    style={{ color: selectedTheme.textSecondary, opacity: 0.7 }}
                  >
                    {t("dataSourceLine1")}
                    <br />
                    {t("dataSourceLine2")}
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4 sm:mb-6">
                {[
                  { value: formatDuration(reportData.totalDurationMinutes), label: t("totalDuration") },
                  { value: t("days", { count: reportData.longestStreakDays }), label: t("longestStreak") },
                  { value: t("cities", { count: reportData.cityCount }), label: t("locationSpan") },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-3 sm:p-4 text-center"
                    style={{
                      background: selectedTheme.cardBg,
                      border: `1px solid ${selectedTheme.accent}22`,
                    }}
                  >
                    <div
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: selectedTheme.accent }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-[11px] sm:text-xs mt-1"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              {heatmap && reportData.dailyActivity.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <div
                    className="text-[11px] sm:text-xs mb-2 sm:mb-3"
                    style={{ color: selectedTheme.textSecondary }}
                  >
                    {t("activityHeatmap")}
                  </div>
                  <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                    <HeatmapCalendar
                      dailyActivity={reportData.dailyActivity}
                      accentColor={selectedTheme.accent}
                      labels={{
                        less: t("heatmapLess"),
                        more: t("heatmapMore"),
                        tooltip: (date, count) => t("heatmapTooltip", { date, count }),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Top Stats */}
              {privacy.showTimePattern && (
                <div className="grid grid-cols-2 gap-3 mb-3 sm:mb-4">
                  {[
                    { label: t("mostActivePeriod"), value: `${String(reportData.topHour).padStart(2, "0")}:00 - ${String(reportData.topHour + 1).padStart(2, "0")}:00` },
                    { label: t("mostActiveWeekday"), value: WEEKDAY_NAMES[reportData.topWeekday] },
                    { label: t("mostActiveMonth"), value: MONTH_NAMES[reportData.topMonth] },
                    { label: t("avgDuration"), value: `${Math.round(reportData.avgDurationMinutes)} min` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl p-3"
                      style={{
                        background: selectedTheme.cardBg,
                        border: `1px solid ${selectedTheme.accent}22`,
                      }}
                    >
                      <div
                        className="text-[11px] sm:text-xs mb-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        {item.label}
                      </div>
                      <div className="text-sm sm:text-base font-bold">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        background: `${selectedTheme.accent}22`,
                        color: selectedTheme.accent,
                        border: `1px solid ${selectedTheme.accent}33`,
                      }}
                    >
                      {tag.emoji} {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Privacy Settings */}
      <div className="rounded-[20px] bg-surface p-5 border border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
          {t("privacySettings")}
        </h2>
        <div className="space-y-3">
          {[
            { key: "showTotalCount" as const, label: t("showTotalCount"), disabled: false },
            { key: "showPercentile" as const, label: t("showPercentile"), disabled: false },
            { key: "showTimePattern" as const, label: t("showTimePattern"), disabled: false },
            { key: "showLocation" as const, label: t("locationHidden"), disabled: true },
            { key: "showNotes" as const, label: t("notesHidden"), disabled: true },
          ].map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex items-center justify-between gap-3",
                item.disabled && "opacity-40"
              )}
            >
              <label
                htmlFor={item.key}
                className="text-[13px] text-foreground"
              >
                {item.label}
              </label>
              <LinearSwitch
                id={item.key}
                checked={item.disabled ? false : privacy[item.key]}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, [item.key]: checked })
                }
                disabled={item.disabled}
                ariaLabel={item.label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={generating || !reportData}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-medium text-white transition-all disabled:opacity-50"
          style={{ background: selectedTheme.accent }}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t("downloadPng")}
        </button>
        <button
          type="button"
          disabled={!reportData}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-medium border border-border text-foreground transition-all disabled:opacity-50 hover:bg-muted"
        >
          <Share2 className="w-4 h-4" />
          {t("share")}
        </button>
      </div>

      {/* Data Source Notice */}
      <p className="text-[11px] text-muted flex items-start gap-2 leading-relaxed">
        <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[8px] shrink-0 mt-0.5">
          i
        </span>
        {t("privacyNotice")}
      </p>
    </div>
  );
}
