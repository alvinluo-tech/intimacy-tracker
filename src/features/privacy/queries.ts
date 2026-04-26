import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import { getPinLengthFromHash } from "@/lib/auth/pin";

export type PrivacySettings = {
  timezone: string;
  requirePin: boolean;
  locationMode: "off" | "city" | "exact";
  hasPin: boolean;
  pinLength: number | null;
  displayName: string | null;
  avatarUrl: string | null;
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
      pinLength: null,
      displayName: null,
      avatarUrl: null,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("timezone,require_pin,location_mode,pin_hash,display_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error?.code === "42703") {
    const { data: legacyData } = await supabase
      .from("profiles")
      .select("timezone,require_pin,location_mode,pin_hash,display_name")
      .eq("id", user.id)
      .maybeSingle();

    return {
      timezone: legacyData?.timezone ?? "UTC",
      requirePin: Boolean(legacyData?.require_pin),
      locationMode: (legacyData?.location_mode ?? "off") as "off" | "city" | "exact",
      hasPin: Boolean(legacyData?.pin_hash),
      pinLength: getPinLengthFromHash(legacyData?.pin_hash ?? null),
      displayName: (legacyData as { display_name?: string | null } | null)?.display_name ?? null,
      avatarUrl: null,
    };
  }

  return {
    timezone: data?.timezone ?? "UTC",
    requirePin: Boolean(data?.require_pin),
    locationMode: (data?.location_mode ?? "off") as "off" | "city" | "exact",
    hasPin: Boolean(data?.pin_hash),
    pinLength: getPinLengthFromHash(data?.pin_hash ?? null),
    displayName: data?.display_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
  };
}
