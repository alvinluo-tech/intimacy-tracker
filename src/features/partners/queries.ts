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

export type PartnerManageItem = Partner & {
  is_active: boolean;
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
  const { data: partners, error } = await supabase
    .from("partners")
    .select("id,nickname,color,is_default,is_active,created_at,updated_at")
    .order("is_default", { ascending: false })
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  let partnerRows:
    | Array<
        Partner & {
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }
      >
    | [] = [];
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,is_active,created_at,updated_at")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    if (fallbackErr) throw fallbackErr;
    partnerRows = ((fallback ?? []) as Array<
      Partner & { is_active: boolean; created_at: string; updated_at: string }
    >).map((p) => ({ ...p, is_default: false }));
  } else if (error) {
    throw error;
  } else {
    partnerRows = (partners ?? []) as Array<
      Partner & { is_default: boolean; is_active: boolean; created_at: string; updated_at: string }
    >;
  }

  if (!partnerRows.length) return [];

  const ids = partnerRows.map((p) => p.id);
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
    const current = byPartner.get(partnerId) ?? { count: 0, last: null };
    current.count += 1;
    if (!current.last && startedAt) current.last = startedAt;
    byPartner.set(partnerId, current);
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
    .select("id,nickname,color,is_default,is_active,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  let partnerRow:
    | (Partner & {
        is_default: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      })
    | null = null;
  if (error?.code === "42703") {
    const { data: fallback, error: fallbackErr } = await supabase
      .from("partners")
      .select("id,nickname,color,is_active,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (fallbackErr) throw fallbackErr;
    partnerRow = fallback
      ? ({ ...(fallback as Partner & { is_active: boolean; created_at: string; updated_at: string }), is_default: false } as Partner & {
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        })
      : null;
  } else if (error) {
    throw error;
  } else {
    partnerRow = partner as Partner & {
      is_default: boolean;
      is_active: boolean;
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

export async function listPartnerEncounters(id: string): Promise<EncounterListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,rating,mood,location_enabled,location_label,location_notes,city,country,partner:partners(id,nickname,color),encounter_tags(tag:tags(id,name,color))"
    )
    .eq("partner_id", id)
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

export async function getPartnerStats(id: string): Promise<PartnerStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("started_at,rating")
    .eq("partner_id", id)
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
