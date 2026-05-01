import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CountPoint } from "@/features/analytics/types";
import type { EncounterListItem, Partner, Tag } from "@/features/records/types";


export type PartnerManageItem = Partner & {
  status?: "active" | "past" | "archived" | null;
  created_at: string;
  updated_at: string;
  encounterCount: number;
  lastEncounterAt: string | null;
};

export type PartnerStats = {
  totalCount: number;
  avgRating: number | null;
  recent30Days: CountPoint[];
  ratingTrend12: CountPoint[];
};

export type PartnerMemoryItem = {
  id: string;
  itemType: "anniversary" | "milestone" | "memory" | "photo";
  title: string;
  note: string | null;
  memoryDate: string;
  photoUrl: string | null;
  createdAt: string;
};

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapTags(rows: Array<{ tag: Tag | Tag[] | null }>) {
  return rows
    .map((r) => normalizeRelOne(r.tag))
    .filter((t): t is Tag => Boolean(t));
}

export async function listManagePartners(): Promise<PartnerManageItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_manage_partners_rpc", {
    p_user_id: user.id,
  });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    nickname: string;
    color: string | null;
    avatar_url: string | null;
    is_default: boolean;
    status: "active" | "past" | "archived";
    created_at: string;
    updated_at: string;
    source: "local" | "bound" | null;
    bound_user_id: string | null;
    encounter_count: number;
    last_encounter_at: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    color: r.color,
    avatar_url: r.avatar_url,
    is_default: r.is_default,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    source: r.source,
    bound_user_id: r.bound_user_id,
    encounterCount: r.encounter_count,
    lastEncounterAt: r.last_encounter_at,
  }));
}

export async function getPartnerById(id: string): Promise<PartnerManageItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data: partner, error } = await supabase
    .from("partners")
    .select("id,nickname,color,avatar_url,is_default,status,created_at,updated_at,source,bound_user_id")
    .eq("id", id)
    .maybeSingle();
  let partnerRow:
    | (Partner & {
        is_default: boolean;
        status: "active" | "past" | "archived";
        created_at: string;
        updated_at: string;
      })
    | null = null;
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,is_active,created_at,updated_at,source,bound_user_id")
      .eq("id", id)
      .maybeSingle();
    if (fallbackErr) throw fallbackErr;
    partnerRow = fallback
      ? ({
          ...(fallback as Partner & { is_active: boolean; created_at: string; updated_at: string }),
          avatar_url: null,
          is_default: false,
          status: fallback.is_active ? ("active" as const) : ("past" as const),
        } as Partner & {
          source: "local" | "bound" | null;
          bound_user_id: string | null;
          is_default: boolean;
          status: "active" | "past" | "archived";
          created_at: string;
          updated_at: string;
        })
      : null;
  } else if (error) {
    throw error;
  } else {
    partnerRow = partner as Partner & {
      is_default: boolean;
      status: "active" | "past" | "archived";
      created_at: string;
      updated_at: string;
    };
  }
  if (!partnerRow) return null;

  // Resolve partner IDs (including mirror for bound partners)
  const partnerIds = [id];
  let mirrorId: string | null = null;
  if (partnerRow.source === "bound" && partnerRow.bound_user_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: mirror } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", partnerRow.bound_user_id)
        .eq("bound_user_id", user.id)
        .eq("source", "bound")
        .maybeSingle();
      if (mirror) {
        mirrorId = mirror.id;
        partnerIds.push(mirror.id);
      }
    }
  }

  // Parallel: count + lastEncounter (both use same partnerIds)
  const [countResult, lastResult] = await Promise.all([
    supabase
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .in("partner_id", partnerIds),
    supabase
      .from("encounters")
      .select("started_at")
      .in("partner_id", partnerIds)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countResult.error) throw countResult.error;
  if (lastResult.error) throw lastResult.error;

  return {
    ...partnerRow,
    encounterCount: countResult.count ?? 0,
    lastEncounterAt: lastResult.data?.started_at ?? null,
  };
}

export async function listPartnerEncounters(
  id: string,
  boundUserId?: string | null
): Promise<EncounterListItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  const partnerIds = [id];
  if (boundUserId && currentUserId) {
    const { data: mirror } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", boundUserId)
      .eq("bound_user_id", currentUserId)
      .eq("source", "bound")
      .maybeSingle();
    if (mirror) partnerIds.push(mirror.id);
  }

  let { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,share_notes_with_partner,partner:partners(id,nickname,color,avatar_url),encounter_tags(tag:tags(id,name,color))"
    )
    .in("partner_id", partnerIds)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("encounters")
      .select(
        "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,notes_encrypted,partner:partners(id,nickname,color,avatar_url),encounter_tags(tag:tags(id,name,color))"
      )
      .in("partner_id", partnerIds)
      .order("started_at", { ascending: false })
      .limit(200);
    if (fallbackErr) throw fallbackErr;
    data = fallback as any;
  } else if (error) {
    throw error;
  }

  const ownPartnerData = boundUserId && partnerIds.length > 1
    ? (await supabase.from("partners").select("id,nickname,color,avatar_url").eq("id", id).single()).data
    : null;

  const rows = (data ?? []) as unknown as Array<
    Omit<EncounterListItem, "tags" | "partner"> & {
      partner: Partner | Partner[] | null;
      encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
    }
  >;

  return rows.map((r) => {
    const partner = normalizeRelOne(r.partner);
    return {
      ...r,
      share_notes_with_partner: (r as any).share_notes_with_partner ?? false,
      partner: partner && partner.id !== id && ownPartnerData ? (ownPartnerData as Partner) : partner,
      tags: mapTags(r.encounter_tags),
    };
  });
}

export async function getPartnerStats(
  id: string,
  boundUserId?: string | null
): Promise<PartnerStats> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalCount: 0, avgRating: null, recent30Days: [], ratingTrend12: [] };

  const { data, error } = await supabase.rpc("get_partner_stats_rpc", {
    p_partner_id: id,
    p_user_id: user.id,
  });
  if (error) throw error;

  const s = data as Record<string, unknown>;
  return {
    totalCount: (s.totalCount as number) ?? 0,
    avgRating: (s.avgRating as number) ?? null,
    recent30Days: ((s.recent30Days ?? []) as Array<{ label: string; value: number }>).map(
      (d) => ({ label: d.label, value: d.value })
    ),
    ratingTrend12: ((s.ratingTrend12 ?? []) as Array<{ label: string; value: number }>).map(
      (t) => ({ label: t.label, value: t.value })
    ),
  };
}

export async function listPartnerPhotoUrls(id: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  // First get the partner to check if it's bound
  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("source, bound_user_id, user_id")
    .eq("id", id)
    .single();

  if (partnerErr?.code === "42P01") {
    // Migration may not be applied yet.
    return [];
  }
  if (partnerErr) throw partnerErr;

  // For bound partners, query by both partner_id (own uploads) and user_id of the bound user
  // (their uploads). The RLS policy allows viewing photos from bound users via couple_bindings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: Array<{ photo_url: string | null; created_at: string }> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: { code?: string; message: string } | null = null as any;

  if (partner?.source === "bound" && partner.bound_user_id) {
    // Fetch own uploads (partner_id = id) AND bound user's uploads (user_id = bound_user_id)
    const res = await supabase
      .from("partner_photos")
      .select("photo_url,created_at")
      .or(`partner_id.eq.${id},user_id.eq.${partner.bound_user_id}`)
      .order("created_at", { ascending: false })
      .limit(60);
    data = res.data as typeof data;
    error = res.error as typeof error;
  } else {
    const res = await supabase
      .from("partner_photos")
      .select("photo_url,created_at")
      .eq("partner_id", id)
      .order("created_at", { ascending: false })
      .limit(60);
    data = res.data as typeof data;
    error = res.error as typeof error;
  }

  if (error?.code === "42P01") {
    // Migration may not be applied yet.
    return [];
  }
  if (error) throw error;

  const rows = (data ?? []) as Array<{ photo_url: string | null }>;
  return rows
    .map((row) => row.photo_url)
    .filter((value): value is string => Boolean(value));
}

export async function listPartnerMemoryItems(input: {
  partnerId?: string;
  boundUserId?: string;
}): Promise<PartnerMemoryItem[]> {
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("partner_memory_items")
    .select("id,item_type,title,note,memory_date,photo_url,created_at")
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  let data: unknown[] | null = null;
  let error: { code?: string; message: string } | null = null;

  // Determine which filters to apply
  if (input.partnerId && !input.boundUserId) {
    const res = await query.eq("partner_id", input.partnerId);
    data = res.data as unknown[] | null;
    error = (res.error as { code?: string; message: string } | null) ?? null;
  } else if (!input.partnerId && input.boundUserId) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user) return [];

    const res = await query.or(
      `and(user_id.eq.${user.id},bound_user_id.eq.${input.boundUserId}),and(user_id.eq.${input.boundUserId},bound_user_id.eq.${user.id})`
    );
    data = res.data as unknown[] | null;
    error = (res.error as { code?: string; message: string } | null) ?? null;
  } else if (input.partnerId && input.boundUserId) {
    // Both partnerId and boundUserId provided (bound partner details)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user) return [];

    const orParts = [
      `partner_id.eq.${input.partnerId}`,
      `and(user_id.eq.${user.id},bound_user_id.eq.${input.boundUserId})`,
      `and(user_id.eq.${input.boundUserId},bound_user_id.eq.${user.id})`,
    ];
    const res = await query.or(orParts.join(","));
    data = res.data as unknown[] | null;
    error = (res.error as { code?: string; message: string } | null) ?? null;
  } else {
    return [];
  }

  if (error?.code === "42P01") return [];
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    item_type: PartnerMemoryItem["itemType"];
    title: string;
    note: string | null;
    memory_date: string;
    photo_url: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    note: row.note,
    memoryDate: row.memory_date,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  }));
}

export async function listBoundPartnerPhotoUrls(boundUserId: string): Promise<string[]> {
  const items = await listPartnerMemoryItems({ boundUserId });
  return items
    .filter((item) => item.itemType === "photo" && Boolean(item.photoUrl))
    .map((item) => item.photoUrl as string);
}
