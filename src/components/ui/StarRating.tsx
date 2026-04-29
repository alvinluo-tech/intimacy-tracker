"use client";

import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  score: number;
  max?: number;
  size?: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
}

export function StarRating({
  score,
  max = 5,
  size = 14,
  className,
  fillColor = "var(--color-primary)",
  emptyColor = "var(--color-muted)",
}: StarRatingProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-[1px]", className)}
      style={{ fontSize: size }}
    >
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, score - i));
        return <Star key={i} fill={fill} fillColor={fillColor} emptyColor={emptyColor} />;
      })}
    </div>
  );
}

function Star({
  fill,
  fillColor,
  emptyColor,
}: {
  fill: number;
  fillColor: string;
  emptyColor: string;
}) {
  return (
    <span className="relative leading-none" style={{ color: emptyColor }}>
      ★
      {fill > 0 && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{
            color: fillColor,
            width: `${fill * 100}%`,
          }}
        >
          ★
        </span>
      )}
    </span>
  );
}
