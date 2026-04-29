import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import zhLocale from "i18n-iso-countries/langs/zh.json";

countries.registerLocale(enLocale);
countries.registerLocale(zhLocale);

const SEPARATOR = /[,;/|、，\s]+/;

const FALLBACK_MAP: Record<string, string> = {
  "united kingdom": "GB",
  "uk": "GB",
  "great britain": "GB",
  "korea": "KR",
  "south korea": "KR",
  "russia": "RU",
  "vietnam": "VN",
  "syria": "SY",
  "iran": "IR",
  "iraq": "IQ",
  "venezuela": "VE",
  "netherlands": "NL",
  "holland": "NL",
  "czech republic": "CZ",
  "czechia": "CZ",
  "uae": "AE",
  "united arab emirates": "AE",
  "saudi arabia": "SA",
  "north korea": "KP",
  "moldova": "MD",
  "taiwan": "TW",
  "macau": "MO",
  "hong kong": "HK",
};

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const input = raw.trim();
  if (!input) return null;

  const tokens = input.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return null;

  const first = tokens[0];

  let code: string | null = countries.getAlpha2Code(first, "zh") ?? null;
  if (!code) code = countries.getAlpha2Code(first, "en") ?? null;
  if (!code) code = FALLBACK_MAP[first.toLowerCase()] ?? null;
  return code;
}
