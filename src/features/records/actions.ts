"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptNotes } from "@/lib/encryption/notes";
import { normalizeCountryCode } from "@/lib/utils/country";
import { encounterSchema } from "@/lib/validators/encounter";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

import { getServerUser } from "@/features/auth/queries";

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

  const { data: inserted, error } = await supabase
    .from("encounters")
    .insert({
      user_id: user.id,
      partner_id: parsed.partnerId ?? null,
      started_at: parsed.startedAt,
      ended_at: parsed.endedAt ?? null,
      duration_minutes: duration,
      timezone: userTimezone,
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
      notes_encrypted: notesPayload,
      share_notes_with_partner: parsed.shareNotesWithPartner ?? false,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  if (tagIds.length) {
    const { error: tagError } = await supabase.from("encounter_tags").insert(
      tagIds.map((tagId) => ({ encounter_id: inserted.id, tag_id: tagId }))
    );
    if (tagError) return { ok: false as const, error: tagError.message };
  }

  // Insert photo metadata (photos already uploaded client-side)
  if (parsed.photos && parsed.photos.length > 0) {
    const { error: dbError } = await supabase
      .from('encounter_photos')
      .insert(
        parsed.photos.map((photo) => ({
          encounter_id: inserted.id,
          user_id: user.id,
          photo_url: photo.url,
          is_private: photo.isPrivate,
        }))
      );

    if (dbError) {
      console.error('Photo metadata error:', dbError);
      return { ok: false as const, error: `Photo metadata failed: ${dbError.message}` };
    }
  }

  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);

  return { ok: true as const, id: inserted.id as string };
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

  const notesPayload = parsed.notes?.trim()
    ? JSON.stringify(encryptNotes(parsed.notes.trim(), user.id))
    : null;

  const locationEnabled = Boolean(parsed.locationEnabled);
  const locationPrecision = locationEnabled ? parsed.locationPrecision : "off";

  const { error } = await supabase
    .from("encounters")
    .update({
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
      rating: parsed.rating ?? null,
      mood: parsed.mood ?? null,
      notes_encrypted: notesPayload,
      share_notes_with_partner: parsed.shareNotesWithPartner ?? false,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

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

  // Replace photos: delete old rows, insert current list
  const { error: delPhotoErr } = await supabase
    .from("encounter_photos")
    .delete()
    .eq("encounter_id", id);
  if (delPhotoErr) return { ok: false as const, error: delPhotoErr.message };

  if (parsed.photos && parsed.photos.length > 0) {
    // Deduplicate by photo_url to avoid unique constraint violation
    const seen = new Set<string>();
    const uniquePhotos = parsed.photos.filter((photo) => {
      if (seen.has(photo.url)) return false;
      seen.add(photo.url);
      return true;
    });
    const { error: insPhotoErr } = await supabase
      .from("encounter_photos")
      .insert(
        uniquePhotos.map((photo) => ({
          encounter_id: id,
          user_id: user.id,
          photo_url: photo.url,
          is_private: photo.isPrivate,
        }))
      );
    if (insPhotoErr) return { ok: false as const, error: insPhotoErr.message };
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

  const { error } = await supabase.from("encounters").delete().eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

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

  const { error } = await supabase.from("encounters").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}
