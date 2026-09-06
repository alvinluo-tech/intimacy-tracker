"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptNotes, decryptNotes } from "@/lib/encryption/notes";
import { normalizeCountryCode } from "@/lib/utils/country";
import { signStorageObjects, resolveWithSignedUrls } from "@/lib/supabase/signed-urls";
import { encounterSchema } from "@/lib/validators/encounter";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

import { getServerUser } from "@/features/auth/queries";
import { listEncounters } from "@/features/records/queries";

const tagNameSchema = z.string().min(1).max(50);

async function getOrCreateTags(userId: string, tagIds: string[], tagNames: string[]) {
  const supabase = await createSupabaseServerClient();

  const cleanedNames = Array.from(
    new Set(
      tagNames
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => tagNameSchema.parse(t))
    )
  );

  if (cleanedNames.length === 0) return tagIds;

  const { data: inserted, error: upsertError } = await supabase
    .from("tags")
    .upsert(
      cleanedNames.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name" }
    )
    .select("id");

  if (upsertError) throw upsertError;

  const newIds = (inserted ?? []).map((r) => r.id as string);
  return Array.from(new Set([...tagIds, ...newIds]));
}

function computeDurationMinutes(startedAt: string, endedAt: string | null) {
  if (!endedAt) return null;
  const s = new Date(startedAt).getTime();
  const e = new Date(endedAt).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  if (e < s) return null;
  return Number(((e - s) / 60000).toFixed(2));
}

export async function createEncounterAction(input: unknown) {
  const t = await getTranslations("errors");
  const parsed = encounterSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const tagIds = await getOrCreateTags(user.id, parsed.tagIds, parsed.tagNames);
  const duration =
    parsed.durationMinutes ?? computeDurationMinutes(parsed.startedAt, parsed.endedAt ?? null);

  const notesPayload = parsed.notes?.trim()
    ? JSON.stringify(encryptNotes(parsed.notes.trim(), user.id))
    : null;

  const locationEnabled = Boolean(parsed.locationEnabled);
  const locationPrecision = locationEnabled ? parsed.locationPrecision : "off";

  // Use user's saved timezone, fall back to env var or UTC
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const userTimezone = profile?.timezone || process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "UTC";

  // Deduplicate and collect photo data
  const seen = new Set<string>();
  const uniquePhotos = (parsed.photos ?? []).filter((photo) => {
    if (!photo.url || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });
  const photoUrls = uniquePhotos.map((p) => p.url);
  const photoPrivateFlags = uniquePhotos.map((p) => p.isPrivate);

  // Use atomic RPC for transactional encounter + tags + photos insertion
  const { data: insertedId, error } = await supabase.rpc("create_encounter_atomic", {
    p_user_id: user.id,
    p_partner_id: parsed.partnerId ?? null,
    p_started_at: parsed.startedAt,
    p_ended_at: parsed.endedAt ?? null,
    p_duration_minutes: duration,
    p_timezone: userTimezone,
    p_location_enabled: locationEnabled,
    p_location_precision: locationPrecision,
    p_latitude: locationEnabled ? parsed.latitude ?? null : null,
    p_longitude: locationEnabled ? parsed.longitude ?? null : null,
    p_location_label: locationEnabled ? parsed.locationLabel ?? null : null,
    p_location_notes: locationEnabled ? parsed.locationNotes ?? null : null,
    p_city: locationEnabled ? parsed.city ?? null : null,
    p_country: locationEnabled ? parsed.country ?? null : null,
    p_country_code: locationEnabled ? normalizeCountryCode(parsed.country) : null,
    p_rating: parsed.rating ?? null,
    p_mood: parsed.mood ?? null,
    p_climaxed: parsed.climaxed ?? null,
    p_notes_encrypted: notesPayload,
    p_share_notes_with_partner: parsed.shareNotesWithPartner ?? false,
    p_tag_ids: tagIds.length > 0 ? tagIds : null,
    p_photo_urls: photoUrls.length > 0 ? photoUrls : null,
    p_photo_is_private: photoPrivateFlags.length > 0 ? photoPrivateFlags : null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);

  return { ok: true as const, id: insertedId as string };
}

export async function updateEncounterAction(id: string, input: unknown) {
  const t = await getTranslations("errors");
  const parsed = encounterSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const tagIds = await getOrCreateTags(user.id, parsed.tagIds, parsed.tagNames);
  const duration =
    parsed.durationMinutes ?? computeDurationMinutes(parsed.startedAt, parsed.endedAt ?? null);

  // `notes === undefined` means "leave notes untouched" so a form that failed to
  // load notes (e.g. transient decrypt error) cannot wipe them; only an explicit
  // null / empty string clears them.
  const notesPayload =
    parsed.notes === undefined
      ? undefined
      : parsed.notes?.trim()
        ? JSON.stringify(encryptNotes(parsed.notes.trim(), user.id))
        : null;

  const locationEnabled = Boolean(parsed.locationEnabled);
  const locationPrecision = locationEnabled ? parsed.locationPrecision : "off";

  const updatePayload: Record<string, unknown> = {
    partner_id: parsed.partnerId ?? null,
    started_at: parsed.startedAt,
    ended_at: parsed.endedAt ?? null,
    duration_minutes: duration,
    location_enabled: locationEnabled,
    location_precision: locationPrecision,
    latitude: locationEnabled ? parsed.latitude ?? null : null,
    longitude: locationEnabled ? parsed.longitude ?? null : null,
    location_label: locationEnabled ? parsed.locationLabel ?? null : null,
    location_notes: locationEnabled ? parsed.locationNotes ?? null : null,
    city: locationEnabled ? parsed.city ?? null : null,
    country: locationEnabled ? parsed.country ?? null : null,
    country_code: locationEnabled ? normalizeCountryCode(parsed.country) : null,
    rating: parsed.rating ?? null,
    mood: parsed.mood ?? null,
    climaxed: parsed.climaxed ?? null,
    share_notes_with_partner: parsed.shareNotesWithPartner ?? false,
  };
  if (notesPayload !== undefined) {
    updatePayload.notes_encrypted = notesPayload;
  }

  const { data: updated, error } = await supabase
    .from("encounters")
    .update(updatePayload, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { ok: false as const, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false as const, error: t("notFound") };
  }

  const { data: existingTags, error: existingErr } = await supabase
    .from("encounter_tags")
    .select("tag_id")
    .eq("encounter_id", id);
  if (existingErr) return { ok: false as const, error: existingErr.message };

  const existingIds = new Set((existingTags ?? []).map((r: { tag_id: string }) => r.tag_id));
  const newIds = new Set(tagIds);

  const toDelete = (existingTags ?? [])
    .filter((r: { tag_id: string }) => !newIds.has(r.tag_id))
    .map((r: { tag_id: string }) => r.tag_id);
  const toInsert = tagIds.filter((tid) => !existingIds.has(tid));

  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from("encounter_tags")
      .delete()
      .eq("encounter_id", id)
      .in("tag_id", toDelete);
    if (delErr) return { ok: false as const, error: delErr.message };
  }

  if (toInsert.length) {
    const { error: insErr } = await supabase.from("encounter_tags").insert(
      toInsert.map((tagId) => ({ encounter_id: id, tag_id: tagId }))
    );
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  // Photos are only replaced when the caller explicitly provides the list.
  // Replacement is differential (upsert new first, then remove stale ones) so a
  // failure mid-way can leave extra photos but never loses them.
  if (parsed.photos !== undefined) {
    const seen = new Set<string>();
    const uniquePhotos = parsed.photos.filter((photo) => {
      if (!photo.url || seen.has(photo.url)) return false;
      seen.add(photo.url);
      return true;
    });

    if (uniquePhotos.length > 0) {
      const { error: upsertPhotoErr } = await supabase
        .from("encounter_photos")
        .upsert(
          uniquePhotos.map((photo) => ({
            encounter_id: id,
            user_id: user.id,
            photo_url: photo.url,
            is_private: photo.isPrivate,
          })),
          { onConflict: "encounter_id,photo_url", ignoreDuplicates: true }
        );
      if (upsertPhotoErr) return { ok: false as const, error: upsertPhotoErr.message };

      const { error: delPhotoErr } = await supabase
        .from("encounter_photos")
        .delete()
        .eq("encounter_id", id)
        .not("photo_url", "in", `(${uniquePhotos.map((p) => `"${p.url}"`).join(",")})`);
      if (delPhotoErr) return { ok: false as const, error: delPhotoErr.message };
    } else {
      const { error: delPhotoErr } = await supabase
        .from("encounter_photos")
        .delete()
        .eq("encounter_id", id);
      if (delPhotoErr) return { ok: false as const, error: delPhotoErr.message };
    }
  }

  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);

  return { ok: true as const };
}

export async function deleteAllDataAction() {
  const t = await getTranslations("errors");
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { count, error: countErr } = await supabase
    .from("encounters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countErr) return { ok: false as const, error: countErr.message };

  const { count: deletedCount, error } = await supabase
    .from("encounters")
    .delete({ count: "exact" })
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  // RLS or drift can make a delete affect 0 rows while reporting success —
  // surface that instead of claiming all data was wiped.
  if ((count ?? 0) > (deletedCount ?? 0)) {
    return { ok: false as const, error: t("notFound") };
  }

  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function deleteEncounterAction(id: string) {
  const t = await getTranslations("errors");
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { data: deleted, error } = await supabase
    .from("encounters")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!deleted || deleted.length === 0) {
    return { ok: false as const, error: t("notFound") };
  }
  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export type EncounterPhotosResult = {
  photos: Array<{ url: string; isPrivate: boolean }>;
};

/**
 * Photos for the detail drawer. Signed URLs are issued server-side after the
 * caller's access to the encounter has been authorized (RLS-scoped select) —
 * clients never talk to the private storage bucket directly.
 */
export async function getEncounterPhotosAction(
  encounterId: string
): Promise<EncounterPhotosResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { photos: [] };

  // RLS-scoped visibility check (owner or bound partner)
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id")
    .eq("id", encounterId)
    .maybeSingle();
  if (!encounter) return { photos: [] };

  const { data: rows, error } = await supabase
    .from("encounter_photos")
    .select("photo_url, is_private")
    .eq("encounter_id", encounterId);
  if (error || !rows) return { photos: [] };

  const signed = await signStorageObjects(supabase, "encounter-photos", rows.map((r) => r.photo_url));
  return {
    photos: rows.map((r) => ({
      url: resolveWithSignedUrls(r.photo_url, "encounter-photos", signed) ?? r.photo_url,
      isPrivate: r.is_private ?? false,
    })),
  };
}

export async function getDecryptedNotes(encounterId: string): Promise<string | null> {  const user = await getServerUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("user_id, notes_encrypted, share_notes_with_partner")
    .eq("id", encounterId)
    .single();

  if (error || !encounter?.notes_encrypted) return null;

  const isOwner = encounter.user_id === user.id;
  if (!isOwner) {
    if (!encounter.share_notes_with_partner) return null;
    const { data: partnerLink } = await supabase
      .from("partners")
      .select("id")
      .eq("bound_user_id", encounter.user_id)
      .eq("user_id", user.id)
      .eq("source", "bound")
      .maybeSingle();
    if (!partnerLink) return null;
  }

  try {
    let payload: unknown = encounter.notes_encrypted;
    while (typeof payload === "string") {
      payload = JSON.parse(payload);
    }
    return decryptNotes(payload, encounter.user_id);
  } catch (e) {
    console.error("getDecryptedNotes: decrypt failed", e);
    return null;
  }
}

export async function loadMoreEncountersAction(cursor: string, limit = 50) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn"), data: [], nextCursor: null } as const;

  const result = await listEncounters(cursor, limit);
  return { ok: true as const, data: result.data, nextCursor: result.nextCursor } as const;
}

export type RecentLocation = {
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  city: string | null;
  country: string | null;
  usedAt: string;
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getRecentLocations(limit = 5): Promise<RecentLocation[]> {
  const user = await getServerUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("latitude, longitude, location_label, city, country, started_at")
    .eq("user_id", user.id)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const unique: RecentLocation[] = [];
  for (const row of data) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const isDuplicate = unique.some(
      (u) => getDistanceKm(lat, lng, u.latitude, u.longitude) < 0.1
    );
    if (isDuplicate) continue;

    unique.push({
      latitude: lat,
      longitude: lng,
      locationLabel: row.location_label,
      city: row.city,
      country: row.country,
      usedAt: row.started_at,
    });
    if (unique.length >= limit) break;
  }

  return unique;
}
