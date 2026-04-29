import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import type { SavedAddress } from "@/features/addresses/types";

export async function listSavedAddresses(): Promise<SavedAddress[]> {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_addresses")
    .select("id,user_id,alias,latitude,longitude,location_label,city,country,location_precision,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    alias: row.alias,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    locationLabel: row.location_label,
    city: row.city,
    country: row.country,
    locationPrecision: (row.location_precision ?? "exact") as "off" | "city" | "exact",
    createdAt: row.created_at,
  }));
}
