import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptNotes } from "@/lib/encryption/notes";
import { signStorageObjects, resolveWithSignedUrls } from "@/lib/supabase/signed-urls";

import type {
  EncounterDetail,
  EncounterListItem,
  Partner,
  Tag,
} from "@/features/records/types";

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapTags(rows: Array<{ tag: Tag | Tag[] | null }>) {
  return rows
    .map((r) => normalizeRelOne(r.tag))
    .filter((t): t is Tag => Boolean(t));
}

export async function listTags() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id,name,color")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function listPartners() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("partners")
    .select("id,nickname,color,avatar_url,is_default,source,bound_user_id,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,avatar_url,source,bound_user_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (fallbackErr) throw fallbackErr;
    return ((fallback ?? []) as Partner[]).map((p) => ({ ...p, is_default: false, status: "active" as const }));
  }
  if (error) throw error;
  return (data ?? []) as Partner[];
}

export type PaginatedEncounters = {
  data: EncounterListItem[];
  nextCursor: string | null;
};

export async function listEncounters(cursor?: string, limit = 50): Promise<PaginatedEncounters> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], nextCursor: null };

  const ownBoundPartners = await supabase
    .from("partners")
    .select("id,nickname,color,avatar_url,bound_user_id")
    .eq("user_id", user.id)
    .eq("source", "bound");

  const mirrorRecords = await supabase
    .from("partners")
    .select("id,user_id")
    .eq("bound_user_id", user.id)
    .eq("source", "bound");

  const mirrorToOwn = new Map<string, { id: string; nickname: string; color: string | null; avatar_url: string | null }>();
  for (const mirror of mirrorRecords.data ?? []) {
    const own = (ownBoundPartners.data ?? []).find((p) => p.bound_user_id === mirror.user_id);
    if (own) mirrorToOwn.set(mirror.id, own);
  }

  let query = supabase
    .from("encounters")
    .select(
      "id,started_at,timezone,ended_at,duration_minutes,rating,mood,climaxed,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,partner:partners(id,nickname,color,avatar_url,source,bound_user_id),encounter_tags(tag:tags(id,name,color))"
    )
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    const parts = cursor.split("::");
    const cursorDate = parts[0];
    const cursorId = parts[1] || "0";
    query = query.or(
      `started_at.lt.${cursorDate},and(started_at.eq.${cursorDate},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    Omit<EncounterListItem, "tags" | "partner"> & {
      partner: Partner | Partner[] | null;
      encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
    }
  >;

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0
    ? `${items[items.length - 1].started_at}::${items[items.length - 1].id}`
    : null;

  const results: EncounterListItem[] = [];
  for (const r of items) {
    if (!r || !r.id) continue;
    try {
      let partner = normalizeRelOne(r.partner);
      if (partner && mirrorToOwn.has(partner.id)) {
        partner = mirrorToOwn.get(partner.id)!;
      }
      const tags = mapTags(r.encounter_tags ?? []);
      results.push({
        ...r,
        partner,
        tags,
        rating: r.rating ?? null,
        duration_minutes: r.duration_minutes ?? null,
      });
    } catch (e) {
      console.error('Error processing encounter row:', r, e);
    }
  }
  return { data: results, nextCursor };
}

export async function getEncounterDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,user_id,started_at,timezone,ended_at,duration_minutes,rating,mood,climaxed,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,share_notes_with_partner,partner:partners(id,nickname,color,avatar_url,source,bound_user_id),encounter_tags(tag:tags(id,name,color)),encounter_photos(photo_url,is_private)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    user_id: string;
    started_at: string;
    timezone: string | null;
    ended_at: string | null;
    duration_minutes: number | null;
    rating: number | null;
    mood: string | null;
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
    climaxed: boolean | null;
    partner: Partner | null;
    encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
    encounter_photos: Array<{ photo_url: string; is_private: boolean | null }> | null;
  };

  // Notes are encrypted with the owner's user id, so they can only be decrypted
  // by the owner — or by the bound partner when the owner enabled sharing.
  const isOwner = Boolean(user && row.user_id === user.id);
  const canReadNotes = isOwner || Boolean(row.share_notes_with_partner);
  const notes = row.notes_encrypted && canReadNotes
    ? (() => {
        try {
          return decryptNotes(JSON.parse(row.notes_encrypted), row.user_id);
        } catch {
          return null;
        }
      })()
    : null;

  // Photo objects live in a private bucket — issue short-lived signed URLs for
  // the paths (legacy rows may still hold full URLs, which are handled too).
  const rawPhotoUrls = (row.encounter_photos ?? []).map((p) => p.photo_url);
  const signedPhotos = await signStorageObjects(supabase, "encounter-photos", rawPhotoUrls);
  const photos = (row.encounter_photos ?? []).map((p) => ({
    url: resolveWithSignedUrls(p.photo_url, "encounter-photos", signedPhotos) ?? p.photo_url,
    isPrivate: p.is_private ?? false,
  }));

  const out: EncounterDetail = {
    id: row.id,
    started_at: row.started_at,
    timezone: row.timezone ?? null,
    ended_at: row.ended_at,
    duration_minutes: row.duration_minutes,
    rating: row.rating ?? null,
    mood: row.mood,
    location_enabled: row.location_enabled,
    location_precision: row.location_precision,
    latitude: row.latitude,
    longitude: row.longitude,
    location_label: row.location_label,
    location_notes: row.location_notes,
    city: row.city,
    country: row.country,
    share_notes_with_partner: row.share_notes_with_partner ?? false,
    climaxed: row.climaxed ?? null,
    notes,
    photos,
    partner: normalizeRelOne(row.partner),
    tags: mapTags(row.encounter_tags),
  };

  return out;
}
