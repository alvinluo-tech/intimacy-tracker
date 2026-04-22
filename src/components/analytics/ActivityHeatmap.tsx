import React from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";

export function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
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

  const getColor = (count: number) => {
    if (count === 0) return "bg-white/[0.03]";
    if (count === 1) return "bg-[var(--brand)]/30";
    if (count === 2) return "bg-[var(--brand)]/60";
    return "bg-[var(--brand)]/90";
  };

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-[3px] min-w-max">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-[3px]">
            {week.map((day, dIndex) => (
              <div
                key={dIndex}
                title={day.date ? `${day.date}: ${day.count} records` : undefined}
                className={`w-[11px] h-[11px] rounded-[2px] transition-all hover:ring-1 hover:ring-white/50 ${
                  day.date ? getColor(day.count) : "bg-transparent"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end mt-3 gap-1.5 text-[11px] text-[var(--app-text-muted)]">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-white/[0.03]" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[var(--brand)]/30" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[var(--brand)]/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[var(--brand)]" />
        <span>More</span>
      </div>
    </div>
  );
}