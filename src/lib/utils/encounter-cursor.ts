/**
 * Cursor format for encounter pagination: `<started_at ISO>::<uuid>`.
 * The `::` separator never collides with ISO timestamps (single colons only)
 * or UUIDs (hex + dashes).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EncounterCursor = { startedAt: string; id: string };

export function encodeEncounterCursor(startedAt: string, id: string): string {
  return `${startedAt}::${id}`;
}

/**
 * Parses a cursor. Returns null for anything malformed — callers treat that
 * as "no more data" instead of letting Postgres throw on a bad uuid cast
 * (22P02), which used to break infinite scroll for stale clients.
 */
export function decodeEncounterCursor(cursor: string | null | undefined): EncounterCursor | null {
  if (!cursor) return null;
  const separatorIndex = cursor.indexOf("::");
  if (separatorIndex <= 0) return null;
  const startedAt = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 2);
  if (!startedAt || !UUID_RE.test(id)) return null;
  if (Number.isNaN(new Date(startedAt).getTime())) return null;
  return { startedAt, id };
}
