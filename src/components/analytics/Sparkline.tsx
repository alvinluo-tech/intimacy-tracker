"use client";

import { Line, LineChart, YAxis } from "recharts";
import { useChartReady } from "./useChartReady";

export function Sparkline({ data, color = "var(--brand)" }: { data: number[]; color?: string }) {
  const chartData = data.map((value, i) => ({ index: i, value }));
  const { ref, ready, width, height } = useChartReady<HTMLDivElement>();
  return (
    <div ref={ref} className="h-6 w-16 min-w-0 min-h-[24px]">
      {ready ? (
        <LineChart width={width} height={height} data={chartData}>
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}
