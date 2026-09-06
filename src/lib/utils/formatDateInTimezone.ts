const FORMAT_MAP: Record<string, Intl.DateTimeFormatOptions> = {
  "MMM d, yyyy": { month: "short", day: "numeric", year: "numeric" },
  "h:mm a": { hour: "numeric", minute: "2-digit", hour12: true },
  "MMM yyyy": { month: "short", year: "numeric" },
  "MMM dd, yyyy": { month: "short", day: "2-digit", year: "numeric" },
  "ccc": { weekday: "short" },
  "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
};

const TIME_FORMATS = new Set(["h:mm a"]);

export function formatDateInTimezone(
  date: string | Date,
  formatStr: string,
  timezone: string,
  locale: string = "en-US",
): string {
  const options = FORMAT_MAP[formatStr];
  if (!options) {
    // Unknown format: fall back to an ISO date instead of rendering the raw
    // timestamp (previously this silently returned `String(date)`).
    console.warn(
      `[formatDateInTimezone] Unknown format "${formatStr}" — falling back to ISO date`
    );
    const fallback = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    }).format(typeof date === "string" ? new Date(date) : date);
    return fallback;
  }

  const d = typeof date === "string" ? new Date(date) : date;

  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    }).format(d);
    return TIME_FORMATS.has(formatStr) ? formatted.toLowerCase() : formatted;
  } catch {
    // Invalid timezone — fall back to UTC
    const formatted = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: "UTC",
    }).format(d);
    return TIME_FORMATS.has(formatStr) ? formatted.toLowerCase() : formatted;
  }
}
