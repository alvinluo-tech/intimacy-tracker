import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptNotes } from "@/lib/encryption/notes";
import { syncBoundPartnersForCurrentUser } from "@/features/partner-binding/mirror";

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

  await syncBoundPartnersForCurrentUser(supabase as any, user.id);

  const { data, error } = await supabase
    .from("partners")
    .select("id,nickname,color,is_default,source,bound_user_id,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,source,bound_user_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (fallbackErr) throw fallbackErr;
    return ((fallback ?? []) as Partner[]).map((p) => ({ ...p, is_default: false, status: "active" as const }));
  }
  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function listEncounters() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  await syncBoundPartnersForCurrentUser(supabase as any, user.id);

  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,partner:partners(id,nickname,color,source,bound_user_id),encounter_tags(tag:tags(id,name,color))"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    Omit<EncounterListItem, "tags" | "partner"> & {
      partner: Partner | Partner[] | null;
      encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
      notes_encrypted: string | null;
    }
  >;

  const results: EncounterListItem[] = [];
  for (const r of rows) {
    if (!r || !r.id) continue;
    try {
      const partner = normalizeRelOne(r.partner);
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
  return results;
}

export async function getEncounterDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,partner:partners(id,nickname,color,source,bound_user_id),encounter_tags(tag:tags(id,name,color))"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    started_at: string;
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
    partner: Partner | null;
    encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
  };

  const notes = row.notes_encrypted
    ? (() => {
        try {
          return decryptNotes(JSON.parse(row.notes_encrypted));
        } catch {
          return null;
        }
      })()
    : null;

  const out: EncounterDetail = {
    id: row.id,
    started_at: row.started_at,
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
    notes_encrypted: row.notes_encrypted,
    notes,
    partner: normalizeRelOne(row.partner),
    tags: mapTags(row.encounter_tags),
  };

  return out;
}
