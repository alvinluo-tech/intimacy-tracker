"use client";

import { useState, useEffect } from "react";
import { Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useTimerStore } from "@/stores/timer-store";

export function QuickStartTimer() {
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
      setRecordedData(Math.max(1, Math.floor(exactDurationSeconds / 60)), startTime, endTime);
      setSeconds(0);
      setStartTime(null);
      setOpen(true);
    } else {
      setStartTime(new Date());
      setIsRunning(true);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-[20px] bg-gradient-to-r from-[var(--brand)]/10 to-[#1a1f2e] border border-white/[0.05] p-4 mb-4 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isRunning ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : 'bg-[var(--brand)]/20 text-[var(--brand)]'}`}>
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[var(--app-text)]">
            Quick Start
          </div>
          <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">
            {isRunning ? "Recording in progress..." : "Start a new session timer"}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isRunning && (
          <div className="font-mono text-xl font-medium tracking-tight text-[var(--app-text)] w-20 text-right">
            {formatTime(seconds)}
          </div>
        )}
        <Button
          onClick={toggleTimer}
          variant="primary"
          className={`rounded-full px-5 h-10 transition-colors ${isRunning ? 'bg-[#f43f5e] hover:bg-[#e11d48] text-white' : ''}`}
        >
          {isRunning ? (
            <>
              <Square className="mr-2 h-4 w-4 fill-current" />
              End Session
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start
            </>
          )}
        </Button>
      </div>
    </div>
  );
}