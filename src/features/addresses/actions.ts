"use server";

import { getTranslations } from "next-intl/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

const createSchema = z.object({
  alias: z.string().trim().min(1, "Alias is required").max(50, "Alias max 50 characters"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationLabel: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  locationPrecision: z.enum(["off", "city", "exact"]).default("exact"),
});

const updateAliasSchema = z.object({
  id: z.string().uuid(),
  alias: z.string().trim().min(1, "Alias is required").max(50, "Alias max 50 characters"),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function createSavedAddressAction(input: z.input<typeof createSchema>) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const supabase = await createSupabaseServerClient();
  const parsed = createSchema.parse(input);

  const { error } = await supabase.from("saved_addresses").insert({
    user_id: user.id,
    alias: parsed.alias,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    location_label: parsed.locationLabel ?? null,
    city: parsed.city ?? null,
    country: parsed.country ?? null,
    location_precision: parsed.locationPrecision,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function updateSavedAddressAliasAction(input: z.infer<typeof updateAliasSchema>) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const supabase = await createSupabaseServerClient();
  const parsed = updateAliasSchema.parse(input);

  const { error } = await supabase
    .from("saved_addresses")
    .update({ alias: parsed.alias })
    .eq("id", parsed.id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function deleteSavedAddressAction(input: z.infer<typeof deleteSchema>) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const supabase = await createSupabaseServerClient();
  const parsed = deleteSchema.parse(input);

  const { error } = await supabase
    .from("saved_addresses")
    .delete()
    .eq("id", parsed.id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}
