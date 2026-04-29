"use client";

import { useTranslations } from "next-intl";

export function HorizontalBarList({ 
  data, 
  valueType = "count",
  layout = "stack"
}: { 
  data: { label: string; value: number }[];
  valueType?: "count" | "percentage";
  layout?: "stack" | "inline";
}) {
  const t = useTranslations("analytics");
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col justify-center h-full gap-4 pt-2">
      {data.map((item, i) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const displayValue = valueType === "percentage" 
          ? (total > 0 ? Math.round((item.value / total) * 100) + "%" : "0%")
          : item.value.toString();
          
        const displayLabel = item.label;

        if (layout === "inline") {
          return (
            <div key={i} className="flex items-center gap-4">
              <span className="text-[13px] text-muted w-[52px] shrink-0">{item.label}</span>
              <div className="h-1.5 flex-1 bg-muted/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[13px] text-content privacy-blur-target w-4 text-right shrink-0">{displayValue}</span>
            </div>
          );
        }

        return (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted">{displayLabel}</span>
              <span className="text-content privacy-blur-target font-mono">{displayValue}</span>
            </div>
            <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-primary transition-all duration-500 shadow-[0_0_8px_var(--color-primary)] opacity-80" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}