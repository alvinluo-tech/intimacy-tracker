// Backfill country_code from raw country column for existing encounters.
// Usage: node scripts/backfill-country-code.mjs

import { createClient } from "@supabase/supabase-js";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };
import zhLocale from "i18n-iso-countries/langs/zh.json" with { type: "json" };
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val;
  }
}

loadEnv(resolve(__dirname, "..", ".env.local"));

countries.registerLocale(enLocale);
countries.registerLocale(zhLocale);

const SEPARATOR = /[,;/|、，\s]+/;

const FALLBACK_MAP = {
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

function normalize(raw) {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;
  const tokens = input.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return null;
  const first = tokens[0];
  let code = countries.getAlpha2Code(first, "zh");
  if (!code) code = countries.getAlpha2Code(first, "en");
  if (!code) code = FALLBACK_MAP[first.toLowerCase()] || null;
  return code || null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: rows, error } = await supabase
    .from("encounters")
    .select("id, country")
    .not("country", "is", null)
    .is("country_code", null);

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} encounters without country_code`);

  let updated = 0;
  let unmapped = 0;

  for (const row of rows) {
    const code = normalize(row.country);
    if (code) {
      const { error: updateErr } = await supabase
        .from("encounters")
        .update({ country_code: code })
        .eq("id", row.id);
      if (updateErr) {
        console.error(`Update failed for ${row.id}:`, updateErr);
      } else {
        updated++;
      }
    } else {
      console.log(`Unmapped: "${row.country}" (id: ${row.id})`);
      unmapped++;
    }
  }

  console.log(`Done. Updated: ${updated}, Unmapped: ${unmapped}`);
}

main().catch(console.error);
