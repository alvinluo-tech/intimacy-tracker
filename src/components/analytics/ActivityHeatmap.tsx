import React, { useRef, useEffect } from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";

export function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // scroll to the end to show the latest data by default
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

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

  const getIntensityColor = (count: number) => {
    if (count === 0) return "bg-white/[0.04]";
    if (count === 1) return "bg-[#a855f7]/30"; // Lighter Purple
    if (count === 2) return "bg-[#a855f7]/60"; // Medium Purple
    if (count === 3) return "bg-[#f43f5e]/50"; // Medium Rose
    return "bg-[#f43f5e]/80"; // Strong Rose
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div ref={scrollRef} className="w-full overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dIndex) => (
                <div
                  key={dIndex}
                  title={day.date ? `${day.date}: ${day.count} records` : undefined}
                  className={`w-[11px] h-[11px] rounded-[2px] transition-all hover:ring-1 hover:ring-white/50 ${
                    day.date ? getIntensityColor(day.count) : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-start gap-1.5 text-[11px] text-[#8b95a3]">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-white/[0.04]" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#a855f7]/30" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#a855f7]/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#f43f5e]/50" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#f43f5e]/80" />
        <span>More</span>
      </div>
    </div>
  );
}