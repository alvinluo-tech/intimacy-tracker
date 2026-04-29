"use client";

type StarRatingProps = {
  value: number | null;
  maxStars?: number;
  size?: number;
  fillColor?: string;
  emptyColor?: string;
  gap?: number;
};

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function StarSVG({
  color,
  strokeColor,
  size,
}: {
  color: string;
  strokeColor?: string;
  size: number;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill={color}
      stroke={strokeColor ?? "none"}
      strokeWidth={strokeColor ? 1.5 : 0}
      className="shrink-0"
      style={{ display: "block" }}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export function StarRating({
  value,
  maxStars = 5,
  size = 14,
  fillColor = "#f43f5e",
  emptyColor = "#334155",
  gap = 2,
}: StarRatingProps) {
  if (value == null) return null;

  const pct = Math.max(0, Math.min(100, (value / maxStars) * 100));

  return (
    <span
      className="relative inline-flex shrink-0"
      role="img"
      aria-label={`${value} out of ${maxStars} stars`}
      style={{ lineHeight: 0, width: "fit-content" }}
    >
      <span className="inline-flex" style={{ gap }}>
        {Array.from({ length: maxStars }).map((_, i) => (
          <StarSVG key={i} color={emptyColor} strokeColor={emptyColor} size={size} />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <span className="inline-flex" style={{ gap }}>
          {Array.from({ length: maxStars }).map((_, i) => (
            <StarSVG key={i} color={fillColor} size={size} />
          ))}
        </span>
      </span>
    </span>
  );
}
