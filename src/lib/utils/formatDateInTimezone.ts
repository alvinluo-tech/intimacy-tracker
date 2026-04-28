const FORMAT_MAP: Record<string, Intl.DateTimeFormatOptions> = {
  "MMM d, yyyy": { month: "short", day: "numeric", year: "numeric" },
  "h:mm a": { hour: "numeric", minute: "2-digit", hour12: true },
  "MMM yyyy": { month: "short", year: "numeric" },
  "MMM dd, yyyy": { month: "short", day: "2-digit", year: "numeric" },
};

const TIME_FORMATS = new Set(["h:mm a"]);

export function formatDateInTimezone(
  date: string | Date,
  formatStr: string,
  timezone: string,
): string {
  const options = FORMAT_MAP[formatStr];
  if (!options) return String(date);

  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: timezone,
  }).format(d);

  return TIME_FORMATS.has(formatStr) ? formatted.toLowerCase() : formatted;
}
