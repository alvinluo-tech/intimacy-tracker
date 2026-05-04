"use client";

import { useState, useEffect } from "react";
import { Download, Share2, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { THEMES } from "@/components/report/poster/AnnualPoster";
import type { PosterTheme } from "@/components/report/poster/AnnualPoster";
import type { AnnualReportData } from "@/lib/report/aggregator";
import type { PersonalTag } from "@/lib/report/tag-engine";
import type { AllPercentiles } from "@/lib/report/percentile";

const AVAILABLE_YEARS = [2024, 2025, 2026];

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
}: {
  dailyActivity: { date: string; count: number }[];
  accentColor: string;
}) {
  if (dailyActivity.length === 0) return null;

  const firstDate = new Date(dailyActivity[0].date);
  const firstDayOfWeek = firstDate.getDay();

  const maxCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(
      <div key={`empty-${i}`} style={{ width: 12, height: 12 }} />
    );
  }

  dailyActivity.forEach((day, index) => {
    const intensity = day.count / maxCount;
    cells.push(
      <div
        key={day.date}
        title={`${day.date}: ${day.count} records`}
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          background: accentColor,
          opacity: day.count === 0 ? 0.1 : 0.2 + intensity * 0.8,
        }}
      />
    );
  });

  const weeks: React.ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-[2px] mr-1">
        {["", "一", "", "三", "", "五", ""].map((label, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 12,
              fontSize: 10,
              color: "rgba(168, 162, 158, 0.7)",
              textAlign: "right" as const,
              lineHeight: "12px",
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[2px]">
            {week}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTheme, setSelectedTheme] = useState(THEMES.darkPurple);
  const [reportData, setReportData] = useState<AnnualReportData | null>(null);
  const [percentiles, setPercentiles] = useState<AllPercentiles | null>(null);
  const [tags, setTags] = useState<PersonalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    showTotalCount: true,
    showPercentile: true,
    showTimePattern: true,
    showLocation: false,
    showNotes: false,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/report/data?year=${selectedYear}`);
        if (!response.ok) {
          if (response.status === 404) {
            setReportData(null);
            setPercentiles(null);
            setTags([]);
            return;
          }
          throw new Error("Failed to fetch data");
        }
        const result = await response.json();
        setReportData(result.data);
        setPercentiles(result.percentiles);
        setTags(result.tags);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
        setError("Failed to load report data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedYear]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          theme: selectedTheme.id,
          options: {
            showPartner: false,
            showTimeInfo: privacy.showTimePattern,
            showLocation: privacy.showLocation,
            showPercentile: privacy.showPercentile,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `encounter-${selectedYear}-wrapped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
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

  const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const heatmap = reportData ? generateHeatmapGrid(reportData) : null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Annual Report</h1>
        <p className="text-muted-foreground">
          Generate your personalized year-in-review poster
        </p>
      </div>

      <div className="grid gap-6">
        {/* Year Selector */}
        <Card className="p-6">
          <h2 className="text-xs font-semibold mb-4 text-muted-foreground tracking-wider">
            SELECT YEAR
          </h2>
          <div className="flex gap-2">
            {AVAILABLE_YEARS.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? "primary" : "outline"}
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </Card>

        {/* Theme Selector */}
        <Card className="p-6">
          <h2 className="text-xs font-semibold mb-4 text-muted-foreground tracking-wider">
            CHOOSE THEME
          </h2>
          <div className="flex gap-3 flex-wrap">
            {Object.values(THEMES).map((theme) => (
              <Button
                key={theme.id}
                variant={selectedTheme.id === theme.id ? "primary" : "outline"}
                onClick={() => setSelectedTheme(theme)}
              >
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ background: theme.accent }}
                />
                {theme.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">
              PREVIEW
            </h2>
            <span className="text-xs text-muted-foreground">
              1080 × 1920px
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error || !reportData ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <p>{error || "No data available for this year"}</p>
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ background: selectedTheme.background }}
            >
              {/* Poster Preview Content */}
              <div style={{ padding: "40px" }}>
                {/* Header */}
                <div style={{ marginBottom: "30px" }}>
                  <p
                    className="text-xs tracking-widest mb-4"
                    style={{ color: selectedTheme.textSecondary }}
                  >
                    ENCOUNTER · {selectedYear} ANNUAL REPORT
                  </p>
                  <div
                    className="text-7xl font-bold"
                    style={{ color: selectedTheme.text }}
                  >
                    {privacy.showTotalCount ? reportData.totalCount : "—"}
                  </div>
                  <p
                    className="text-lg mt-2"
                    style={{ color: selectedTheme.textSecondary }}
                  >
                    encounters this year
                  </p>
                </div>

                {/* Percentile Banner */}
                {privacy.showPercentile && percentiles && (
                  <div
                    className="rounded-xl p-4 mb-6 flex justify-between items-center"
                    style={{
                      background: selectedTheme.cardBg,
                      border: `1px solid ${selectedTheme.accent}33`,
                    }}
                  >
                    <div>
                      <div
                        className="text-3xl font-bold"
                        style={{ color: selectedTheme.accent }}
                      >
                        TOP {100 - percentiles.frequency.percentile}%
                      </div>
                      <div
                        className="text-sm mt-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        超过了 {percentiles.frequency.percentile}% 的同龄人
                      </div>
                    </div>
                    <div
                      className="text-xs text-right"
                      style={{
                        color: selectedTheme.textSecondary,
                        opacity: 0.7,
                      }}
                    >
                      基于 Kinsey Institute 公开数据
                      <br />
                      非用户数据比较
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: selectedTheme.cardBg,
                      border: `1px solid ${selectedTheme.accent}22`,
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: selectedTheme.accent }}
                    >
                      {formatDuration(reportData.totalDurationMinutes)}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      总时长
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: selectedTheme.cardBg,
                      border: `1px solid ${selectedTheme.accent}22`,
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: selectedTheme.accent }}
                    >
                      {reportData.longestStreakDays}天
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      最长连续
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: selectedTheme.cardBg,
                      border: `1px solid ${selectedTheme.accent}22`,
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: selectedTheme.accent }}
                    >
                      {reportData.cityCount}城
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      地点跨度
                    </div>
                  </div>
                </div>

                {/* Heatmap */}
                {heatmap && reportData.dailyActivity.length > 0 && (
                  <div className="mb-6">
                    <div
                      className="text-xs mb-3"
                      style={{ color: selectedTheme.textSecondary }}
                    >
                      活跃热力图
                    </div>
                    <HeatmapCalendar
                      dailyActivity={reportData.dailyActivity}
                      accentColor={selectedTheme.accent}
                    />
                  </div>
                )}

                {/* Top Stats */}
                {privacy.showTimePattern && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: selectedTheme.cardBg,
                        border: `1px solid ${selectedTheme.accent}22`,
                      }}
                    >
                      <div
                        className="text-xs mb-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        最活跃时段
                      </div>
                      <div className="font-bold">
                        {String(reportData.topHour).padStart(2, "0")}:00 -{" "}
                        {String(reportData.topHour + 1).padStart(2, "0")}:00
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: selectedTheme.cardBg,
                        border: `1px solid ${selectedTheme.accent}22`,
                      }}
                    >
                      <div
                        className="text-xs mb-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        最活跃星期
                      </div>
                      <div className="font-bold">
                        {WEEKDAY_NAMES[reportData.topWeekday]}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: selectedTheme.cardBg,
                        border: `1px solid ${selectedTheme.accent}22`,
                      }}
                    >
                      <div
                        className="text-xs mb-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        最活跃月份
                      </div>
                      <div className="font-bold">
                        {MONTH_NAMES[reportData.topMonth]}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: selectedTheme.cardBg,
                        border: `1px solid ${selectedTheme.accent}22`,
                      }}
                    >
                      <div
                        className="text-xs mb-1"
                        style={{ color: selectedTheme.textSecondary }}
                      >
                        平均时长
                      </div>
                      <div className="font-bold">
                        {Math.round(reportData.avgDurationMinutes)} min
                      </div>
                    </div>
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
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6">
          <h2 className="text-xs font-semibold mb-4 text-muted-foreground tracking-wider">
            PRIVACY SETTINGS
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="totalCount" className="text-sm text-foreground">
                显示总次数
              </label>
              <LinearSwitch
                id="totalCount"
                checked={privacy.showTotalCount}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showTotalCount: checked })
                }
                ariaLabel="显示总次数"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="percentile" className="text-sm text-foreground">
                显示百分位数据
              </label>
              <LinearSwitch
                id="percentile"
                checked={privacy.showPercentile}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showPercentile: checked })
                }
                ariaLabel="显示百分位数据"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="timePattern" className="text-sm text-foreground">
                显示时间模式
              </label>
              <LinearSwitch
                id="timePattern"
                checked={privacy.showTimePattern}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showTimePattern: checked })
                }
                ariaLabel="显示时间模式"
              />
            </div>
            <div className="flex items-center justify-between opacity-50">
              <label htmlFor="location" className="text-sm text-foreground">
                地理位置（已强制隐藏）
              </label>
              <LinearSwitch
                id="location"
                checked={false}
                onCheckedChange={() => {}}
                disabled
                ariaLabel="地理位置"
              />
            </div>
            <div className="flex items-center justify-between opacity-50">
              <label htmlFor="notes" className="text-sm text-foreground">
                私人备注（已强制隐藏）
              </label>
              <LinearSwitch
                id="notes"
                checked={false}
                onCheckedChange={() => {}}
                disabled
                ariaLabel="私人备注"
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            disabled={generating || !reportData}
            className="flex-1"
            style={{ background: selectedTheme.accent }}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download PNG
          </Button>
          <Button
            variant="outline"
            disabled={!reportData}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Data Source Notice */}
        <Card className="p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[8px]">
              i
            </span>
            百分位数据来源：Kinsey Institute 及 NATSAL 公开学术研究，与其他用户数据无关。
            位置和备注字段强制加密，不出现在导出内容。
          </p>
        </Card>
      </div>
    </div>
  );
}
