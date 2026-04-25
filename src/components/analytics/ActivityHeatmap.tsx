import React, { useEffect, useRef } from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";

export function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  for (const day of data) {
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

  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to the far right to show the most recent data first
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-slate-800/50";
    if (count === 1) return "bg-[#342e60]";
    if (count === 2) return "bg-[#5a2e74]";
    if (count === 3) return "bg-[#9d3266]";
    return "bg-rose-500";
  };

  return (
    <div className="w-full flex flex-col">
      <div ref={scrollRef} className="w-full overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dIndex) => (
                <div
                  key={dIndex}
                  title={day.date ? `${day.date}: ${day.count} records` : undefined}
                  className={`w-3 h-3 rounded-[3px] transition-all hover:ring-1 hover:ring-rose-500/50 ${
                    day.date ? getColor(day.count) : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-start mt-2 gap-1.5 text-[11px] text-slate-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[3px] bg-slate-800/50" />
        <div className="w-3 h-3 rounded-[3px] bg-[#342e60]" />
        <div className="w-3 h-3 rounded-[3px] bg-[#5a2e74]" />
        <div className="w-3 h-3 rounded-[3px] bg-[#9d3266]" />
        <div className="w-3 h-3 rounded-[3px] bg-rose-500" />
        <span>More</span>
      </div>
    </div>
  );
}