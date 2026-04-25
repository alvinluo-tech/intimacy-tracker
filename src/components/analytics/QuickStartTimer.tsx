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
    <div className="rounded-[20px] bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm shadow-black/20">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {isRunning ? "RECORDING IN PROGRESS" : "QUICK START"}
        </div>
        <div className="text-[15px] font-medium text-slate-300">
          {isRunning ? <span className="font-mono text-[16px] tracking-wider text-rose-500">{formatTime(seconds)}</span> : "Start a timed encounter"}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleTimer}
          className={`rounded-full font-medium h-10 px-5 shadow-sm text-[14px] transition-colors ${
            isRunning 
              ? "bg-slate-900 border border-rose-500 text-rose-500 hover:bg-rose-500/10" 
              : "bg-rose-500 hover:bg-rose-600 text-white"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="mr-2 h-4 w-4 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start Timer
            </>
          )}
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setOpen(true)}
          className="rounded-full bg-slate-800 hover:bg-slate-700 h-10 w-10 p-0 text-slate-200"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}