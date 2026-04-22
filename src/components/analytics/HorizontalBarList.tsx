export function HorizontalBarList({ 
  data, 
  valueType = "count",
  layout = "stack"
}: { 
  data: { label: string; value: number }[];
  valueType?: "count" | "percentage";
  layout?: "stack" | "inline";
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col justify-center h-full gap-4 pt-2">
      {data.map((item, i) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const displayValue = valueType === "percentage" 
          ? (total > 0 ? Math.round((item.value / total) * 100) + "%" : "0%")
          : item.value.toString();
          
        if (layout === "inline") {
          return (
            <div key={i} className="flex items-center gap-4">
              <span className="text-[13px] text-white/80 w-16 shrink-0">{item.label}</span>
              <div className="h-1.5 flex-1 bg-white/[0.03] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[#ec4899] transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[13px] text-white/50 privacy-blur-target font-mono w-4 text-right shrink-0">{displayValue}</span>
            </div>
          );
        }

        return (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/80">{item.label}</span>
              <span className="text-white/50 privacy-blur-target font-mono">{displayValue}</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[#ec4899] transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}