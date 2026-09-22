import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import { decryptNotes } from "@/lib/encryption/notes";
import { storagePathFromValue } from "@/lib/supabase/signed-urls";

import { EXPORT_SCHEMA_VERSION } from "@/lib/validators/backup";

export const MAX_EXPORT_ROWS = 10_000;
const BATCH_SIZE = 500;

export type ExportedPhoto = {
  /** Bare storage path in the encounter-photos bucket (legacy URLs resolved). */
  path: string;
  is_private: boolean;
};

export type ExportedEncounter = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  timezone: string | null;
  rating: number | null;
  mood: string | null;
  climaxed: boolean | null;
  location_enabled: boolean | null;
  location_precision: "off" | "city" | "exact" | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  location_notes: string | null;
  city: string | null;
  country: string | null;
  partner_id: string | null;
  partner_nickname: string | null;
  share_notes_with_partner: boolean | null;
  /** Decrypted plaintext. null when absent or undecryptable (flag below). */
  notes: string | null;
  notes_unavailable: boolean;
  tags: string[];
  photos: ExportedPhoto[];
};

export type ExportedPartner = {
  id: string;
  nickname: string;
  color: string | null;
  avatar_url: string | null;
  is_default: boolean | null;
  source: "local" | "bound" | null;
  bound_user_id: string | null;
  status: "active" | "past" | "archived" | null;
};

export type ExportedTag = {
  id: string;
  name: string;
  color: string | null;
};

export type FullExport = {
  schema_version: typeof EXPORT_SCHEMA_VERSION;
  app: "encounter";
  exported_at: string;
  rows: number;
  truncated: boolean;
  profile: { timezone: string | null };
  partners: ExportedPartner[];
  tags: ExportedTag[];
  encounters: ExportedEncounter[];
};

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Gathers everything the requesting user owns into one schema-versioned
 * structure: encounter rows with decrypted notes and photo paths, plus the
 * partner and tag entities they reference. Consumed by the JSON and Markdown
 * exports and by the client before it seals an encrypted backup.
 */
export async function collectFullExport(): Promise<
  { ok: true; data: FullExport } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const [profileRes, partnersRes, tagsRes] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("partners")
      .select("id,nickname,color,avatar_url,is_default,source,bound_user_id,status")
      .eq("user_id", user.id),
    supabase.from("tags").select("id,name,color").eq("user_id", user.id),
  ]);
  if (partnersRes.error) return { ok: false, error: partnersRes.error.message };
  if (tagsRes.error) return { ok: false, error: tagsRes.error.message };

  const encounters: ExportedEncounter[] = [];
  let hasMore = true;
  let cursor: string | null = null;
  let truncated = false;

  while (hasMore && encounters.length < MAX_EXPORT_ROWS) {
    let query = supabase
      .from("encounters")
      .select(
        "id,started_at,timezone,ended_at,duration_minutes,rating,mood,climaxed,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,share_notes_with_partner,partner:partners(id,nickname),encounter_tags(tag:tags(name)),encounter_photos(photo_url,is_private)"
      )
      .order("started_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(BATCH_SIZE);

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("::");
      query = query.or(
        `started_at.lt.${cursorDate},and(started_at.eq.${cursorDate},id.lt.${cursorId})`
      );
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      started_at: string;
      timezone: string | null;
      ended_at: string | null;
      duration_minutes: number | null;
      rating: number | null;
      mood: string | null;
      climaxed: boolean | null;
      location_enabled: boolean | null;
      location_precision: "off" | "city" | "exact" | null;
      latitude: number | null;
      longitude: number | null;
      location_label: string | null;
      location_notes: string | null;
      city: string | null;
      country: string | null;
      notes_encrypted: string | null;
      share_notes_with_partner: boolean | null;
      partner: { id: string; nickname: string } | Array<{ id: string; nickname: string }> | null;
      encounter_tags: Array<{ tag: { name: string } | Array<{ name: string }> | null }>;
      encounter_photos: Array<{ photo_url: string; is_private: boolean | null }> | null;
    }>;

    if (rows.length === 0) break;

    for (const row of rows) {
      let notes: string | null = null;
      let notesUnavailable = false;
      if (row.notes_encrypted) {
        try {
          let payload: unknown = row.notes_encrypted;
          while (typeof payload === "string") {
            payload = JSON.parse(payload);
          }
          notes = decryptNotes(payload, user.id);
        } catch {
          notes = null;
        }
        if (notes === null) notesUnavailable = true;
      }

      const partner = normalizeRelOne(row.partner);
      const tags = (row.encounter_tags ?? [])
        .map((et) => normalizeRelOne(et.tag))
        .filter((t): t is { name: string } => Boolean(t))
        .map((t) => t.name);

      const photos = (row.encounter_photos ?? [])
        .map((p) => ({
          // Rows written by current code hold bare paths; legacy rows may hold
          // public or signed URLs — reduce everything to the bare path.
          path: storagePathFromValue(p.photo_url, "encounter-photos") ?? p.photo_url,
          is_private: p.is_private ?? false,
        }))
        .filter((p) => p.path);

      encounters.push({
        id: row.id,
        started_at: row.started_at,
        ended_at: row.ended_at,
        duration_minutes: row.duration_minutes,
        timezone: row.timezone,
        rating: row.rating,
        mood: row.mood,
        climaxed: row.climaxed,
        location_enabled: row.location_enabled,
        location_precision: row.location_precision,
        latitude: row.latitude,
        longitude: row.longitude,
        location_label: row.location_label,
        location_notes: row.location_notes,
        city: row.city,
        country: row.country,
        partner_id: partner?.id ?? null,
        partner_nickname: partner?.nickname ?? null,
        share_notes_with_partner: row.share_notes_with_partner,
        notes,
        notes_unavailable: notesUnavailable,
        tags,
        photos,
      });
    }

    if (rows.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      const last = rows[rows.length - 1];
      cursor = `${last.started_at}::${last.id}`;
    }
  }
  truncated = encounters.length >= MAX_EXPORT_ROWS;

  return {
    ok: true,
    data: {
      schema_version: EXPORT_SCHEMA_VERSION,
      app: "encounter",
      exported_at: new Date().toISOString(),
      rows: encounters.length,
      truncated,
      profile: { timezone: profileRes.data?.timezone ?? null },
      partners: ((partnersRes.data ?? []) as unknown as ExportedPartner[]) ?? [],
      tags: ((tagsRes.data ?? []) as unknown as ExportedTag[]) ?? [],
      encounters,
    },
  };
}
