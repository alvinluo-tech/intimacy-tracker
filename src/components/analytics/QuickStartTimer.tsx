"use client";

import { useState, useEffect } from "react";
import { Play, Square, Timer, Plus } from "lucide-react";
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
    <div className="rounded-[16px] bg-[#141b26] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3] mb-1">
          {isRunning ? "RECORDING IN PROGRESS" : "QUICK START"}
        </div>
        <div className="text-[15px] font-medium text-[var(--app-text)]">
          {isRunning ? <span className="font-mono text-[16px] tracking-wider text-[#ff5577]">{formatTime(seconds)}</span> : "Start a timed encounter"}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleTimer}
          className={`rounded-full font-medium h-10 px-5 shadow-sm text-[14px] transition-colors ${
            isRunning 
              ? "bg-[#141b26] border border-[#ff5577] text-[#ff5577] hover:bg-[#ff5577]/10" 
              : "bg-[#ff5577] hover:bg-[#e64c6b] text-white"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="mr-2 h-4 w-4 fill-current" />
              Stop
            </>
          ) : (
            <>
              <div className="mr-2 h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white" />
              Start Timer
            </>
          )}
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setOpen(true)}
          className="rounded-full bg-white/[0.05] hover:bg-white/[0.1] h-10 w-10 p-0 text-[var(--app-text)]"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}