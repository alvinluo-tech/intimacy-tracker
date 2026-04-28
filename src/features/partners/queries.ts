import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CountPoint } from "@/features/analytics/types";
import type { EncounterListItem, Partner, Tag } from "@/features/records/types";
import { syncBoundPartnersForCurrentUser } from "@/features/partner-binding/mirror";

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

  await syncBoundPartnersForCurrentUser(supabase as any, user.id);

  const { data: partners, error } = await supabase
    .from("partners")
    .select("id,nickname,color,avatar_url,is_default,status,created_at,updated_at,source,bound_user_id")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  let partnerRows:
    | Array<
        Partner & {
          is_default: boolean;
          status: "active" | "past" | "archived";
          created_at: string;
          updated_at: string;
        }
      >
    | [] = [];
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,is_active,created_at,updated_at,source,bound_user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (fallbackErr) throw fallbackErr;
    partnerRows = ((fallback ?? []) as Array<
      Partner & { is_active: boolean; created_at: string; updated_at: string }
    >).map((p) => ({
      ...p,
      avatar_url: null,
      is_default: false,
      status: p.is_active ? "active" as const : "past" as const,
      source: p.source ?? "local",
      bound_user_id: p.bound_user_id ?? null,
    }));
  } else if (error) {
    throw error;
  } else {
    partnerRows = (partners ?? []) as Array<
      Partner & { is_default: boolean; status: "active" | "past" | "archived"; created_at: string; updated_at: string }
    >;
  }

  if (!partnerRows.length) return [];

  const ids = partnerRows.map((p) => p.id);

  const mirrorIdToPartnerId = new Map<string, string>();
  if (user) {
    const { data: allMirrors } = await supabase
      .from("partners")
      .select("id, user_id")
      .eq("bound_user_id", user.id)
      .eq("source", "bound");
    for (const mirror of allMirrors ?? []) {
      const partnerRow = partnerRows.find(
        (p) => p.source === "bound" && p.bound_user_id === mirror.user_id
      );
      if (partnerRow) {
        ids.push(mirror.id);
        mirrorIdToPartnerId.set(mirror.id, partnerRow.id);
      }
    }
  }

  const { data: encounters, error: encErr } = await supabase
    .from("encounters")
    .select("partner_id,started_at")
    .in("partner_id", ids)
    .order("started_at", { ascending: false })
    .limit(4000);

  if (encErr) throw encErr;

  const byPartner = new Map<string, { count: number; last: string | null }>();
  for (const row of encounters ?? []) {
    const partnerId = row.partner_id as string | null;
    const startedAt = row.started_at as string | null;
    if (!partnerId) continue;
    const mappedId = mirrorIdToPartnerId.get(partnerId) ?? partnerId;
    const current = byPartner.get(mappedId) ?? { count: 0, last: null };
    current.count += 1;
    if (!current.last && startedAt) current.last = startedAt;
    byPartner.set(mappedId, current);
  }

  return partnerRows.map((p) => {
    const agg = byPartner.get(p.id) ?? { count: 0, last: null };
    return {
      ...p,
      encounterCount: agg.count,
      lastEncounterAt: agg.last,
    };
  });
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

  const { data: encounters, error: encErr } = await supabase
    .from("encounters")
    .select("id,started_at")
    .eq("partner_id", id)
    .order("started_at", { ascending: false });
  if (encErr) throw encErr;

  return {
    ...partnerRow,
    encounterCount: (encounters ?? []).length,
    lastEncounterAt: (encounters ?? [])[0]?.started_at ?? null,
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

  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_precision,latitude,longitude,location_label,location_notes,city,country,partner:partners(id,nickname,color,avatar_url),encounter_tags(tag:tags(id,name,color))"
    )
    .in("partner_id", partnerIds)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) throw error;

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

  const partnerIds = [id];
  if (boundUserId && user?.id) {
    const { data: mirror } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", boundUserId)
      .eq("bound_user_id", user.id)
      .eq("source", "bound")
      .maybeSingle();
    if (mirror) partnerIds.push(mirror.id);
  }

  const { data, error } = await supabase
    .from("encounters")
    .select("started_at,rating")
    .in("partner_id", partnerIds)
    .order("started_at", { ascending: true })
    .limit(2000);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ started_at: string; rating: number | null }>;
  const totalCount = rows.length;
  const ratingValues = rows
    .map((r) => r.rating)
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  const avgRating =
    ratingValues.length > 0
      ? Number((ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length).toFixed(1))
      : null;

  const now = new Date();
  const rangeStart = startOfDay(subDays(now, 29));
  const rangeEnd = endOfDay(now);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const dailyMap = new Map<string, number>();
  for (const day of days) dailyMap.set(format(day, "MM-dd"), 0);
  for (const row of rows) {
    const d = new Date(row.started_at);
    if (!isWithinInterval(d, { start: rangeStart, end: rangeEnd })) continue;
    const key = format(d, "MM-dd");
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const recent30Days: CountPoint[] = [...dailyMap.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const ratingTrend12: CountPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(subMonths(now, i));
    const monthlyRatings = rows
      .filter((r) => {
        if (typeof r.rating !== "number") return false;
        const d = new Date(r.started_at);
        return isWithinInterval(d, { start, end });
      })
      .map((r) => r.rating as number);
    const value =
      monthlyRatings.length > 0
        ? Number((monthlyRatings.reduce((sum, v) => sum + v, 0) / monthlyRatings.length).toFixed(2))
        : 0;
    ratingTrend12.push({
      label: format(start, "yy-MM"),
      value,
    });
  }

  return {
    totalCount,
    avgRating,
    recent30Days,
    ratingTrend12,
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
