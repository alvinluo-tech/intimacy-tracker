import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

import type { ExportedEncounter, FullExport } from "@/lib/export/collector";

/**
 * Renders a full export as a single Markdown document — the format for
 * journaling tools (Obsidian/Notion). Records are listed newest first; notes
 * are quoted blocks so user text starting with `#` cannot invent headings.
 */
export function transformToMarkdown(exportData: FullExport): string {
  const lines: string[] = [];
  const date = exportData.exported_at.slice(0, 10);

  lines.push(`# Encounter export — ${date}`);
  lines.push("");
  lines.push(
    `${exportData.rows} record${exportData.rows === 1 ? "" : "s"}, ` +
      `${exportData.partners.length} partner${exportData.partners.length === 1 ? "" : "s"}, ` +
      `${exportData.tags.length} tag${exportData.tags.length === 1 ? "" : "s"}` +
      (exportData.truncated ? " (truncated)" : "")
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const encounter of exportData.encounters) {
    lines.push(...renderEncounter(encounter));
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function renderEncounter(encounter: ExportedEncounter): string[] {
  const heading = localDateHeading(encounter.started_at, encounter.timezone);
  const out = [`## ${heading}`];

  const facts: string[] = [];
  if (encounter.duration_minutes != null) {
    facts.push(`Duration: ${encounter.duration_minutes} min`);
  }
  if (encounter.partner_nickname) facts.push(`Partner: ${encounter.partner_nickname}`);
  if (encounter.rating != null) facts.push(`Rating: ${encounter.rating}/5`);
  if (encounter.mood) facts.push(`Mood: ${encounter.mood}`);
  if (encounter.climaxed != null) facts.push(`Climaxed: ${encounter.climaxed ? "yes" : "no"}`);
  const place =
    encounter.location_label ?? encounter.city
      ? [encounter.location_label, encounter.city, encounter.country]
          .filter(Boolean)
          .join(", ")
      : "";
  if (place) facts.push(`Location: ${place}`);
  if (encounter.tags.length) facts.push(`Tags: ${encounter.tags.join(", ")}`);
  if (encounter.photos.length) {
    facts.push(`Photos: ${encounter.photos.length}`);
  }

  if (facts.length) {
    out.push("");
    for (const fact of facts) out.push(`- ${fact}`);
  }

  if (encounter.notes) {
    out.push("");
    for (const line of encounter.notes.split("\n")) {
      out.push(`> ${line}`);
    }
  }
  if (encounter.notes_unavailable) {
    out.push("");
    out.push("> [note could not be decrypted]");
  }

  return out;
}

function localDateHeading(startedAt: string, timezone: string | null): string {
  // Per-record timezone: the bucket the record itself was logged in, matching
  // how the dashboard and the annual report group it. en-CA renders the date
  // part as YYYY-MM-DD; "HH:mm" is locale-stable 24h time.
  try {
    const tz = timezone || "UTC";
    const datePart = formatDateInTimezone(startedAt, "yyyy-MM-dd", tz, "en-CA");
    const timePart = formatDateInTimezone(startedAt, "HH:mm", tz, "en-CA");
    return `${datePart} ${timePart}`;
  } catch {
    return startedAt;
  }
}
