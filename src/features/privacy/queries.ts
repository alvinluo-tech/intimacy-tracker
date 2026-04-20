import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";

export type PrivacySettings = {
  timezone: string;
  requirePin: boolean;
  locationMode: "off" | "city" | "exact";
  hasPin: boolean;
};

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) {
    return {
      timezone: "UTC",
      requirePin: false,
      locationMode: "off",
      hasPin: false,
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("timezone,require_pin,location_mode,pin_hash")
    .eq("id", user.id)
    .maybeSingle();

  return {
    timezone: data?.timezone ?? "UTC",
    requirePin: Boolean(data?.require_pin),
    locationMode: (data?.location_mode ?? "off") as "off" | "city" | "exact",
    hasPin: Boolean(data?.pin_hash),
  };
}
