import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptNotes } from "@/lib/encryption/notes";

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
  const { data, error } = await supabase
    .from("partners")
    .select("id,nickname,color")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function listEncounters() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_label,city,country,partner:partners(id,nickname,color),encounter_tags(tag:tags(id,name,color))"
    )
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    Omit<EncounterListItem, "tags" | "partner"> & {
      partner: Partner | Partner[] | null;
      encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
    }
  >;

  return rows.map((r) => ({
    ...r,
    partner: normalizeRelOne(r.partner),
    tags: mapTags(r.encounter_tags),
  }));
}

export async function getEncounterDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,location_label,city,country,notes_encrypted,partner:partners(id,nickname,color),encounter_tags(tag:tags(id,name,color))"
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
    location_label: string | null;
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
    rating: row.rating,
    mood: row.mood,
    location_enabled: row.location_enabled,
    location_precision: row.location_precision,
    location_label: row.location_label,
    city: row.city,
    country: row.country,
    partner: normalizeRelOne(row.partner),
    tags: mapTags(row.encounter_tags),
    notes,
  };

  return out;
}
