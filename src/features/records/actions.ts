"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptNotes } from "@/lib/encryption/notes";
import { encounterSchema } from "@/lib/validators/encounter";

import { getServerUser } from "@/features/auth/queries";

const tagNameSchema = z.string().min(1).max(50);

async function getOrCreateTags(tagIds: string[], tagNames: string[]) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) throw new Error("Not authenticated");

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
      cleanedNames.map((name) => ({ user_id: user.id, name })),
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
  const parsed = encounterSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const tagIds = await getOrCreateTags(parsed.tagIds, parsed.tagNames);
  const duration =
    parsed.durationMinutes ?? computeDurationMinutes(parsed.startedAt, parsed.endedAt ?? null);

  const notesPayload = parsed.notes?.trim()
    ? JSON.stringify(encryptNotes(parsed.notes.trim()))
    : null;

  const locationEnabled = Boolean(parsed.locationEnabled);
  const locationPrecision = locationEnabled ? parsed.locationPrecision : "off";

  const { data: inserted, error } = await supabase
    .from("encounters")
    .insert({
      user_id: user.id,
      partner_id: parsed.partnerId ?? null,
      started_at: parsed.startedAt,
      ended_at: parsed.endedAt ?? null,
      duration_minutes: duration,
      timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "UTC",
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

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath(`/records/${inserted.id}`);

  return { ok: true as const, id: inserted.id as string };
}

export async function updateEncounterAction(id: string, input: unknown) {
  const parsed = encounterSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const tagIds = await getOrCreateTags(parsed.tagIds, parsed.tagNames);
  const duration =
    parsed.durationMinutes ?? computeDurationMinutes(parsed.startedAt, parsed.endedAt ?? null);

  const notesPayload = parsed.notes?.trim()
    ? JSON.stringify(encryptNotes(parsed.notes.trim()))
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
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  const { error: delErr } = await supabase
    .from("encounter_tags")
    .delete()
    .eq("encounter_id", id);
  if (delErr) return { ok: false as const, error: delErr.message };

  if (tagIds.length) {
    const { error: insErr } = await supabase.from("encounter_tags").insert(
      tagIds.map((tagId) => ({ encounter_id: id, tag_id: tagId }))
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
    const { error: insPhotoErr } = await supabase
      .from("encounter_photos")
      .insert(
        parsed.photos.map((photo) => ({
          encounter_id: id,
          user_id: user.id,
          photo_url: photo.url,
          is_private: photo.isPrivate,
        }))
      );
    if (insPhotoErr) return { ok: false as const, error: insPhotoErr.message };
  }

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath(`/records/${id}`);
  revalidatePath(`/records/${id}/edit`);

  return { ok: true as const };
}

export async function deleteAllDataAction() {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { error } = await supabase.from("encounters").delete().eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteEncounterAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { error } = await supabase.from("encounters").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
