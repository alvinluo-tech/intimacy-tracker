"use server";

import { getTranslations } from "next-intl/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

const partnerSchema = z.object({
  nickname: z.string().trim().min(1, "Partner name is required").max(50, "Name max 50 characters"),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color format should be #RRGGBB")
    .optional()
    .nullable(),
});

const memoryItemSchema = z
  .object({
    partnerId: z.string().uuid().optional(),
    boundUserId: z.string().uuid().optional(),
    itemType: z.enum(["anniversary", "milestone", "memory", "photo"]),
    title: z.string().trim().min(1, "Title is required").max(120, "Title max 120 characters"),
    note: z.string().trim().max(2000, "Note max 2000 characters").optional().nullable(),
    memoryDate: z.string().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
  })
  .refine((v) => Boolean(v.partnerId) !== Boolean(v.boundUserId), {
    message: "You must specify either a local partner or a bound partner",
  });

function revalidatePartnerViews(userId: string, partnerId?: string) {
  revalidateTag(CACHE_TAGS.partnerList(userId), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.timeline(userId), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(userId), REVALIDATE_PROFILE);
  if (partnerId) revalidateTag(CACHE_TAGS.partnerDetail(partnerId), REVALIDATE_PROFILE);
}

async function ensureDefaultPartner(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: activePartners, error } = await supabase
    .from("partners")
    .select("id,is_default,created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) return;
  if (!activePartners || activePartners.length === 0) return;

  const defaults = activePartners.filter((p) => p.is_default);
  const keepId = defaults[0]?.id ?? activePartners[0].id;

  if (defaults.length === 1 && keepId === defaults[0].id) return;

  await supabase.from("partners").update({ is_default: false }).eq("user_id", userId);
  await supabase.from("partners").update({ is_default: true }).eq("id", keepId);
}

export async function createPartnerAction(input: unknown) {
  const t = await getTranslations("errors");
  const parsed = partnerSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { data, error } = await supabase
    .from("partners")
    .insert({
      user_id: user.id,
      nickname: parsed.nickname,
      color: parsed.color ?? null,
      status: "active",
      is_default: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews(user.id, data.id as string);
  return { ok: true as const, id: data.id as string };
}

export async function updatePartnerAction(id: string, input: unknown) {
  const t = await getTranslations("errors");
  const parsed = partnerSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { error } = await supabase
    .from("partners")
    .update({
      nickname: parsed.nickname,
      color: parsed.color ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePartnerViews(user.id, id);
  return { ok: true as const };
}

export async function archivePartnerAction(id: string, archive: boolean) {
  const t = await getTranslations("errors");
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { data: partner, error: fetchErr } = await supabase
    .from("partners")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return { ok: false as const, error: fetchErr.message };
  if (!partner) return { ok: false as const, error: t("partnerNotFound") };
  if (partner.status === "archived") return { ok: false as const, error: t("operationFailed") };

  const { error } = await supabase
    .from("partners")
    .update({ status: archive ? "past" : "active" })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews(user.id, id);
  return { ok: true as const };
}

export async function deletePartnerAction(id: string) {
  const t = await getTranslations("errors");
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews(user.id);
  return { ok: true as const };
}

export async function setDefaultPartnerAction(id: string) {
  const t = await getTranslations("errors");
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const { data: row, error: fetchErr } = await supabase
    .from("partners")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return { ok: false as const, error: fetchErr.message };
  if (!row) return { ok: false as const, error: t("partnerNotFound") };
  if (row.status !== "active") return { ok: false as const, error: t("operationFailed") };

  const { error: clearErr } = await supabase
    .from("partners")
    .update({ is_default: false })
    .eq("user_id", user.id);
  if (clearErr) return { ok: false as const, error: clearErr.message };

  const { error } = await supabase
    .from("partners")
    .update({ is_default: true })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePartnerViews(user.id, id);
  return { ok: true as const };
}

export async function savePartnerPhotoAction(input: {
  partnerId: string;
  photoUrl: string;
}) {
  const t = await getTranslations("errors");
  const payload = z
    .object({
      partnerId: z.string().uuid(),
      photoUrl: z.string().url(),
    })
    .parse(input);

  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  // Verify the partner exists and user has access
  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id,user_id,source,bound_user_id")
    .eq("id", payload.partnerId)
    .maybeSingle();
  if (partnerErr) return { ok: false as const, error: partnerErr.message };
  if (!partner) return { ok: false as const, error: t("partnerNotFound") };

  // Check if user owns this partner or it's a bound partner they can access
  const canAccess = partner.user_id === user.id || (
    partner.source === "bound" && partner.bound_user_id === user.id
  );
  if (!canAccess) return { ok: false as const, error: t("unauthorized") };

  const { error } = await supabase
    .from("partner_photos")
    .insert({
      user_id: user.id,
      partner_id: payload.partnerId,
      photo_url: payload.photoUrl,
    });

  if (error?.code === "42P01") {
    return { ok: false as const, error: t("databaseMigrationRequired") };
  }
  if (error?.code !== "23505" && error) {
    return { ok: false as const, error: error.message };
  }

  await createPartnerMemoryItemAction(
    partner.source === "bound" && partner.bound_user_id
      ? { boundUserId: partner.bound_user_id, itemType: "photo", title: "Uploaded Photo", photoUrl: payload.photoUrl }
      : { partnerId: payload.partnerId, itemType: "photo", title: "Uploaded Photo", photoUrl: payload.photoUrl }
  );

  revalidatePartnerViews(user.id, payload.partnerId);
  return { ok: true as const };
}

export async function createPartnerMemoryItemAction(input: {
  partnerId?: string;
  boundUserId?: string;
  itemType: "anniversary" | "milestone" | "memory" | "photo";
  title: string;
  note?: string | null;
  memoryDate?: string | null;
  photoUrl?: string | null;
}) {
  const t = await getTranslations("errors");
  const payload = memoryItemSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  if (payload.partnerId) {
    const { data: partner, error: partnerErr } = await supabase
      .from("partners")
      .select("id")
      .eq("id", payload.partnerId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (partnerErr) return { ok: false as const, error: partnerErr.message };
    if (!partner) return { ok: false as const, error: t("partnerNotFound") };
  }

  if (payload.boundUserId) {
    const { data: bindingRow, error: bindingErr } = await supabase
      .from("couple_bindings")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${payload.boundUserId}),and(user1_id.eq.${payload.boundUserId},user2_id.eq.${user.id})`)
      .limit(1);
    if (bindingErr) return { ok: false as const, error: bindingErr.message };
    if (!bindingRow || bindingRow.length === 0) {
      return { ok: false as const, error: t("operationFailed") };
    }
  }

  const isoDate = payload.memoryDate
    ? new Date(payload.memoryDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("partner_memory_items").insert({
    user_id: user.id,
    partner_id: payload.partnerId ?? null,
    bound_user_id: payload.boundUserId ?? null,
    item_type: payload.itemType,
    title: payload.title,
    note: payload.note ?? null,
    memory_date: isoDate,
    photo_url: payload.photoUrl ?? null,
  });

  if (error?.code === "42P01") {
    return { ok: false as const, error: t("databaseMigrationRequired") };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.partnerList(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  if (payload.partnerId) revalidateTag(CACHE_TAGS.partnerDetail(payload.partnerId), REVALIDATE_PROFILE);
  return { ok: true as const };
}
