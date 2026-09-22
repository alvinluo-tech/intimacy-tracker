import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { encryptNotes } from "@/lib/encryption/notes";
import { normalizeCountryCode } from "@/lib/utils/country";
import { storagePathFromValue } from "@/lib/supabase/signed-urls";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";
import { importPayloadSchema } from "@/lib/validators/backup";

const CHUNK = 200;

type ImportRecord = import("@/lib/validators/backup").BackupEncounterInput;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Restores are rare but heavy: 3 per minute, shared with no other route.
  const rl = await rateLimit(`import:${user.id}`, { windowMs: 60_000, max: 3 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = importPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid backup payload",
        issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  try {
    const { byId: partnerIdMap, byNickname: partnerNicknameMap } = await resolvePartners(
      supabase,
      user.id,
      payload.partners ?? []
    );
    const tagNameMap = await resolveTags(supabase, user.id, payload.encounters);

    const payloadIds = payload.encounters.map((e) => e.id);
    const ownedIds = new Set<string>();
    for (let i = 0; i < payloadIds.length; i += CHUNK) {
      const slice = payloadIds.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("encounters").select("id").in("id", slice);
      if (error) throw error;
      for (const row of data ?? []) ownedIds.add(row.id as string);
    }

    const toUpsert: Record<string, unknown>[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (const encounter of payload.encounters) {
      const row = await buildEncounterRow(supabase, user.id, encounter, partnerIdMap, partnerNicknameMap);
      (ownedIds.has(encounter.id) ? toUpsert : toInsert).push(row);
    }

    let updated = 0;
    let imported = 0;

    for (let i = 0; i < toUpsert.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("encounters")
        .upsert(toUpsert.slice(i, i + CHUNK), { onConflict: "id" })
        .select("id");
      if (error) throw error;
      updated += data?.length ?? 0;
    }

    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("encounters").insert(slice).select("id");
      if (!error) {
        imported += data?.length ?? 0;
        continue;
      }
      if (error.code !== "23505") throw error;
      // A payload id collides with another account's encounter (cross-account
      // restore). Retry row by row; colliding rows get fresh ids and lose the
      // link to their photo blobs, which live under the original owner's path.
      for (const row of slice) {
        const { id: _dropped, ...withoutId } = row as Record<string, unknown> & { id: string };
        const retry = await supabase.from("encounters").insert(withoutId).select("id");
        if (retry.error) throw retry.error;
        imported += 1;
      }
    }

    await writeRelations(supabase, user.id, payload.encounters, tagNameMap);

    // Best-effort audit; a failed audit row must not fail a completed restore.
    try {
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "import_backup",
        metadata: { imported, updated, payload_rows: payload.encounters.length },
      });
    } catch (auditFailure) {
      console.error("[import-backup] audit_events insert threw:", auditFailure);
    }

    revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
    revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
    revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);
    revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);

    return NextResponse.json({
      ok: true,
      imported,
      updated,
      partners: partnerIdMap.size,
      tags: tagNameMap.size,
    });
  } catch (err) {
    console.error("[import-backup] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}

type PartnerMaps = {
  byId: Map<string, string>;
  byNickname: Map<string, string>;
};

/**
 * Maps payload partner references to this account's partner rows: same id wins,
 * then same nickname, otherwise the partner is recreated (keeping its original
 * id when that id is free).
 */
async function resolvePartners(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  partners: import("@/lib/validators/backup").BackupPartnerInput[]
): Promise<PartnerMaps> {
  const byId = new Map<string, string>();
  const byNickname = new Map<string, string>();
  if (partners.length === 0) return { byId, byNickname };

  const ids = partners.map((p) => p.id);
  const nicknames = Array.from(new Set(partners.map((p) => p.nickname)));

  const [{ data: byIdRows, error: byIdErr }, { data: byNameRows, error: byNameErr }] =
    await Promise.all([
      supabase.from("partners").select("id,nickname").in("id", ids).eq("user_id", userId),
      supabase.from("partners").select("id,nickname").in("nickname", nicknames).eq("user_id", userId),
    ]);
  if (byIdErr) throw byIdErr;
  if (byNameErr) throw byNameErr;

  const existingById = new Set((byIdRows ?? []).map((p) => p.id as string));
  const existingByName = new Map(
    (byNameRows ?? []).map((p) => [p.nickname as string, p.id as string])
  );

  const toCreate: Record<string, unknown>[] = [];
  const createIds: string[] = [];

  for (const partner of partners) {
    const matched = existingById.has(partner.id)
      ? partner.id
      : existingByName.get(partner.nickname);
    if (matched) {
      byId.set(partner.id, matched);
      byNickname.set(partner.nickname, matched);
      continue;
    }
    toCreate.push({
      id: partner.id,
      user_id: userId,
      nickname: partner.nickname,
      color: partner.color ?? null,
      avatar_url: null,
      is_default: partner.is_default ?? false,
      source: "local",
      bound_user_id: null,
      status: partner.status ?? "active",
    });
    createIds.push(partner.id);
  }

  if (toCreate.length > 0) {
    const { error } = await supabase.from("partners").insert(toCreate);
    if (!error) {
      for (const id of createIds) {
        byId.set(id, id);
      }
      for (const partner of partners) {
        if (byId.has(partner.id)) byNickname.set(partner.nickname, byId.get(partner.id)!);
      }
    } else if (error.code === "23505") {
      // Original id taken by another account's partner — recreate with fresh ids.
      for (const row of toCreate) {
        const { id: origId, ...withoutId } = row as Record<string, unknown> & { id: string };
        const { data, error: retryErr } = await supabase
          .from("partners")
          .insert(withoutId)
          .select("id");
        if (retryErr) throw retryErr;
        const newId = (data?.[0]?.id as string) ?? origId;
        byId.set(origId, newId);
        const nickname = partners.find((p) => p.id === origId)?.nickname;
        if (nickname) byNickname.set(nickname, newId);
      }
    } else {
      throw error;
    }
  }

  return { byId, byNickname };
}

async function resolveTags(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  encounters: ImportRecord[]
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const names = Array.from(
    new Set(encounters.flatMap((e) => e.tags ?? []).map((n) => n.trim()).filter(Boolean))
  );
  if (names.length === 0) return nameMap;

  const { data, error } = await supabase
    .from("tags")
    .upsert(names.map((name) => ({ user_id: userId, name })), { onConflict: "user_id,name" })
    .select("id,name");
  if (error) throw error;

  for (const row of data ?? []) {
    nameMap.set(row.name as string, row.id as string);
  }
  return nameMap;
}

async function buildEncounterRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  encounter: ImportRecord,
  partnerIdMap: Map<string, string>,
  partnerNicknameMap: Map<string, string>
): Promise<Record<string, unknown>> {
  const locationEnabled = encounter.location_enabled ?? false;
  const partnerId =
    (encounter.partner_id ? partnerIdMap.get(encounter.partner_id) : undefined) ??
    (encounter.partner_nickname
      ? partnerNicknameMap.get(encounter.partner_nickname)
      : undefined) ??
    null;

  return {
    id: encounter.id,
    user_id: userId,
    partner_id: partnerId,
    started_at: encounter.started_at,
    ended_at: encounter.ended_at ?? null,
    duration_minutes: encounter.duration_minutes ?? null,
    timezone: encounter.timezone ?? null,
    rating: encounter.rating ?? null,
    mood: encounter.mood ?? null,
    climaxed: encounter.climaxed ?? false,
    location_enabled: locationEnabled,
    location_precision: locationEnabled ? encounter.location_precision ?? "off" : "off",
    latitude: locationEnabled ? encounter.latitude ?? null : null,
    longitude: locationEnabled ? encounter.longitude ?? null : null,
    location_label: locationEnabled ? encounter.location_label ?? null : null,
    location_notes: locationEnabled ? encounter.location_notes ?? null : null,
    city: locationEnabled ? encounter.city ?? null : null,
    country: locationEnabled ? encounter.country ?? null : null,
    country_code: locationEnabled ? normalizeCountryCode(encounter.country ?? null) : null,
    share_notes_with_partner: encounter.share_notes_with_partner ?? false,
    notes_encrypted: encounter.notes?.trim()
      ? JSON.stringify(encryptNotes(encounter.notes.trim(), userId))
      : null,
  };
}

/** Attach tag and photo rows additively — a restore never deletes anything. */
async function writeRelations(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  encounters: ImportRecord[],
  tagNameMap: Map<string, string>
): Promise<void> {
  const tagRows: { encounter_id: string; tag_id: string }[] = [];
  const photoRows: Record<string, unknown>[] = [];

  for (const encounter of encounters) {
    for (const name of encounter.tags ?? []) {
      const tagId = tagNameMap.get(name.trim());
      if (tagId) tagRows.push({ encounter_id: encounter.id, tag_id: tagId });
    }
    for (const photo of encounter.photos ?? []) {
      const path = storagePathFromValue(photo.path, "encounter-photos") ?? photo.path;
      if (!path) continue;
      photoRows.push({
        encounter_id: encounter.id,
        user_id: userId,
        photo_url: path,
        is_private: photo.is_private ?? false,
      });
    }
  }

  for (let i = 0; i < tagRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("encounter_tags")
      .upsert(tagRows.slice(i, i + CHUNK), { ignoreDuplicates: true, onConflict: "encounter_id,tag_id" });
    if (error) throw error;
  }

  for (let i = 0; i < photoRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("encounter_photos")
      .upsert(photoRows.slice(i, i + CHUNK), { onConflict: "encounter_id,photo_url" });
    if (error) throw error;
  }
}
