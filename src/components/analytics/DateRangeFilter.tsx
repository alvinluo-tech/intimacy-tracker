"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, ChevronDown } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type DateRangePreset = "allTime" | "thisWeek" | "last15Days" | "thisMonth" | "custom";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset: DateRangePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

function getPresetRange(preset: DateRangePreset): { startDate: Date; endDate: Date } | null {
  if (preset === "allTime") return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "thisWeek":
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case "last15Days":
      return {
        startDate: subDays(today, 14),
        endDate: today,
      };
    case "thisMonth":
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(today),
      };
    default:
      return { startDate: today, endDate: today };
  }
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const dateLocale = locale === "zh" ? zhCN : enUS;
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === "custom" || preset === "allTime") {
      onChange({ startDate: null, endDate: null, preset });
      return;
    }
    const range = getPresetRange(preset);
    if (range) {
      onChange({ ...range, preset });
    }
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const startDate = customStart ? new Date(customStart) : null;
    const endDate = customEnd ? new Date(customEnd) : null;

    if (startDate && endDate && !isAfter(startDate, endDate)) {
      onChange({ startDate, endDate, preset: "custom" });
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (value.preset === "allTime") {
      return t("allTime");
    }
    if (value.preset === "custom" && value.startDate && value.endDate) {
      return `${format(value.startDate, "MM/dd", { locale: dateLocale })} - ${format(value.endDate, "MM/dd", { locale: dateLocale })}`;
    }
    const range = getPresetRange(value.preset);
    if (range) {
      return `${format(range.startDate, "MM/dd", { locale: dateLocale })} - ${format(range.endDate, "MM/dd", { locale: dateLocale })}`;
    }
    return t("dateRange");
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 rounded-full bg-surface text-muted hover:text-content border border-border px-4 text-[13px] focus:outline-none focus:ring-1 focus:ring-border cursor-pointer transition-colors"
      >
        <Calendar className="h-3.5 w-3.5" />
        <span className="truncate">{formatDateRange()}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          {/* Mobile: bottom sheet overlay */}
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-12 z-50 sm:w-64 rounded-t-xl sm:rounded-xl border border-border bg-surface shadow-lg sm:shadow-lg max-h-[70vh] sm:max-h-none overflow-y-auto">
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="p-3 sm:p-3 space-y-1">
              <button
                onClick={() => handlePresetChange("allTime")}
                className={cn(
                  "w-full text-left px-3 py-2.5 sm:py-2 rounded-lg text-[14px] sm:text-[13px] transition-colors",
                  value.preset === "allTime"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-content hover:bg-muted/10"
                )}
              >
                {t("allTime")}
              </button>
              {(["thisWeek", "last15Days", "thisMonth"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 sm:py-2 rounded-lg text-[14px] sm:text-[13px] transition-colors",
                    value.preset === preset
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-content hover:bg-muted/10"
                  )}
                >
                  {t(preset)}
                </button>
              ))}

              <div className="h-px bg-border my-2" />

              <button
                onClick={() => handlePresetChange("custom")}
                className={cn(
                  "w-full text-left px-3 py-2.5 sm:py-2 rounded-lg text-[14px] sm:text-[13px] transition-colors",
                  value.preset === "custom"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-content hover:bg-muted/10"
                )}
              >
                {t("customRange")}
              </button>

              {value.preset === "custom" && (
                <div className="mt-2 space-y-2 px-1">
                  <div>
                    <label className="text-[11px] text-muted mb-1 block">{t("startDate")}</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full h-10 sm:h-8 rounded-lg border border-border bg-background px-2 text-[14px] sm:text-[13px] text-content focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted mb-1 block">{t("endDate")}</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full h-10 sm:h-8 rounded-lg border border-border bg-background px-2 text-[14px] sm:text-[13px] text-content focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-1 pb-2 sm:pb-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCustomApply}
                      className="flex-1 h-9 sm:h-8"
                    >
                      {t("apply")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-9 sm:h-8"
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-2.5 mt-1 text-[13px] text-muted hover:text-content transition-colors sm:hidden"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
