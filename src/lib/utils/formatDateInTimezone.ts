const FORMAT_MAP: Record<string, Intl.DateTimeFormatOptions> = {
  "MMM d, yyyy": { month: "short", day: "numeric", year: "numeric" },
  "h:mm a": { hour: "numeric", minute: "2-digit", hour12: true },
  "MMM yyyy": { month: "short", year: "numeric" },
  "MMM dd, yyyy": { month: "short", day: "2-digit", year: "numeric" },
  "ccc": { weekday: "short" },
  "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
  "HH:mm": { hour: "2-digit", minute: "2-digit", hour12: false },
  "yyyy-MM-dd HH:mm": {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
};

const TIME_FORMATS = new Set(["h:mm a"]);

// Constructing a zoned Intl.DateTimeFormat costs 0.1-0.5ms — with several
// calls per rendered card that adds up, so cache per (locale|tz|format).
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  locale: string,
  formatStr: string,
  timezone: string
): Intl.DateTimeFormat | null {
  const key = `${locale}|${timezone}|${formatStr}`;
  let formatter = formatterCache.get(key);
  if (formatter !== undefined) return formatter;

  const options = FORMAT_MAP[formatStr];
  if (!options) return null; // caller handles unknown formats

  try {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone });
  } catch {
    // Invalid timezone — fall back to UTC
    try {
      formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
    } catch {
      return null;
    }
  }
  if (formatterCache.size > 500) formatterCache.clear();
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatDateInTimezone(
  date: string | Date,
  formatStr: string,
  timezone: string,
  locale: string = "en-US",
): string {
  if (!FORMAT_MAP[formatStr]) {
    // Unknown format: fall back to an ISO date instead of rendering the raw
    // timestamp (previously this silently returned `String(date)`).
    console.warn(
      `[formatDateInTimezone] Unknown format "${formatStr}" — falling back to ISO date`
    );
    return getFormatter("en-CA", "yyyy-MM-dd", timezone)!.format(
      typeof date === "string" ? new Date(date) : date
    );
  }

  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = getFormatter(locale, formatStr, timezone);
  if (!formatter) return String(d);

  const formatted = formatter.format(d);
  return TIME_FORMATS.has(formatStr) ? formatted.toLowerCase() : formatted;
}
