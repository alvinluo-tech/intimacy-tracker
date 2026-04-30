import { createSupabaseServerClient } from "@/lib/supabase/server";


import type { PlaybackEncounter } from "@/features/playback/types";
import type { Partner } from "@/features/records/types";

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listPlaybackEncounters(opts?: {
  partnerId?: string;
  from?: string;
  to?: string;
}): Promise<PlaybackEncounter[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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
      "id,started_at,latitude,longitude,location_label,city,country,rating,duration_minutes,partner:partners(id,nickname,color,avatar_url,source,bound_user_id),encounter_tags(tag:tags(id,name,color))"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (opts?.partnerId) {
    const partnerIds: string[] = [opts.partnerId];
    const { data: partner } = await supabase
      .from("partners")
      .select("source,bound_user_id")
      .eq("id", opts.partnerId)
      .maybeSingle();
    if (partner?.source === "bound" && partner.bound_user_id) {
      const { data: mirror } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", partner.bound_user_id)
        .eq("bound_user_id", user.id)
        .eq("source", "bound")
        .maybeSingle();
      if (mirror) partnerIds.push(mirror.id);
    }
    query = query.in("partner_id", partnerIds);
  }
  if (opts?.from) {
    query = query.gte("started_at", opts.from);
  }
  if (opts?.to) {
    query = query.lte("started_at", opts.to);
  }

  query = query.order("started_at", { ascending: true }).limit(2000);

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    started_at: string;
    latitude: number;
    longitude: number;
    location_label: string | null;
    city: string | null;
    country: string | null;
    rating: number | null;
    duration_minutes: number | null;
    partner: Partner | Partner[] | null;
    encounter_tags: Array<{ tag: { id: string; name: string; color: string | null } | Array<{ id: string; name: string; color: string | null }> | null }>;
  }>;

  const results: PlaybackEncounter[] = [];
  for (const r of rows) {
    if (!r || !r.id) continue;
    let partner = normalizeRelOne(r.partner);
    if (partner && mirrorToOwn.has(partner.id)) {
      partner = mirrorToOwn.get(partner.id)! as any;
    }
    const tags = (r.encounter_tags ?? [])
      .map((et) => normalizeRelOne(et?.tag))
      .filter((t): t is { id: string; name: string; color: string | null } => Boolean(t));

    results.push({
      id: r.id,
      started_at: r.started_at,
      latitude: r.latitude,
      longitude: r.longitude,
      location_label: r.location_label ?? null,
      city: r.city ?? null,
      country: r.country ?? null,
      rating: r.rating ?? null,
      duration_minutes: r.duration_minutes ?? null,
      partner,
      tags,
    });
  }

  return results;
}
