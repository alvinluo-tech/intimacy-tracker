"use client";

import { useState, useEffect } from "react";
import { Play, Square, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTimerStore } from "@/stores/timer-store";
import { cn } from "@/lib/utils/cn";

export function QuickStartTimer() {
  const t = useTranslations("analytics");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const setOpen = useTimerStore((s) => s.setOpen);
  const setRecordedData = useTimerStore((s) => s.setRecordedData);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    if (isRunning && startTime) {
      setIsRunning(false);
      const endTime = new Date();
      const exactDurationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      setRecordedData(exactDurationSeconds / 60, startTime, endTime);
      setSeconds(0);
      setStartTime(null);
      setOpen(true);
    } else {
      setStartTime(new Date());
      setIsRunning(true);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[20px] bg-surface p-5 border border-border gap-4 transition-colors">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">
          {t("quickStartTitle")}
        </div>
        <div className="text-[14px] text-content flex items-center gap-2">
          {isRunning ? t("timerLive") : t("startTimedEncounter")}
          {isRunning && (
            <span className="text-primary font-mono font-medium tracking-tight">
              {formatTime(seconds)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTimer}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-all shadow-sm",
            isRunning
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          {isRunning ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          {isRunning ? t("stopTimer") : t("startTimer")}
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted hover:bg-surface/80 hover:text-content transition-colors border border-border shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
