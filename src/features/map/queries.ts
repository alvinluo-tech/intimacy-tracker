import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MapPoint } from "@/features/map/types";

function roundByPrecision(value: number, precision: "off" | "city" | "exact") {
  // Keep exact points precise, while preserving privacy for city/off points.
  const decimals = precision === "exact" ? 6 : precision === "city" ? 3 : 2;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function listMapPoints(params?: { from?: string; to?: string; partnerId?: string }) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("encounters")
    .select(
      "id,started_at,latitude,longitude,location_precision,location_label,city,country,location_enabled"
    )
    .eq("location_enabled", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("started_at", { ascending: false })
    .limit(2000);

  if (params?.partnerId) {
    query = query.eq("partner_id", params.partnerId);
  }

  if (params?.from) {
    query = query.gte("started_at", new Date(params.from).toISOString());
  }
  if (params?.to) {
    const end = new Date(params.to);
    end.setHours(23, 59, 59, 999);
    query = query.lte("started_at", end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    started_at: string;
    latitude: number | null;
    longitude: number | null;
    location_precision: "off" | "city" | "exact" | null;
    location_label: string | null;
    city: string | null;
    country: string | null;
  }>;

  const points: MapPoint[] = [];
  for (const row of rows) {
    if (typeof row.latitude !== "number" || typeof row.longitude !== "number") continue;
    const precision = row.location_precision ?? "off";
    points.push({
      id: row.id,
      lat: roundByPrecision(row.latitude, precision),
      lng: roundByPrecision(row.longitude, precision),
      startedAt: row.started_at,
      precision,
      locationLabel: row.location_label,
      city: row.city,
      country: row.country,
    });
  }

  return points;
}
