"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";

const partnerSchema = z.object({
  nickname: z.string().trim().min(1, "请输入伴侣名称").max(50, "名称最多 50 字"),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "颜色格式应为 #RRGGBB")
    .optional()
    .nullable(),
});

const memoryItemSchema = z
  .object({
    partnerId: z.string().uuid().optional(),
    boundUserId: z.string().uuid().optional(),
    itemType: z.enum(["anniversary", "milestone", "memory", "photo"]),
    title: z.string().trim().min(1, "标题不能为空").max(120, "标题最多 120 字"),
    note: z.string().trim().max(2000, "备注最多 2000 字").optional().nullable(),
    memoryDate: z.string().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
  })
  .refine((v) => Boolean(v.partnerId) !== Boolean(v.boundUserId), {
    message: "必须指定本地伴侣或绑定对象之一",
  });

function revalidatePartnerViews(id?: string) {
  revalidatePath("/partners");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/partners/${id}`);
}

async function ensureDefaultPartner(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: activePartners, error } = await supabase
    .from("partners")
    .select("id,is_default,created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
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
  const parsed = partnerSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { data, error } = await supabase
    .from("partners")
    .insert({
      user_id: user.id,
      nickname: parsed.nickname,
      color: parsed.color ?? null,
      is_active: true,
      is_default: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews(data.id as string);
  return { ok: true as const, id: data.id as string };
}

export async function updatePartnerAction(id: string, input: unknown) {
  const parsed = partnerSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { error } = await supabase
    .from("partners")
    .update({
      nickname: parsed.nickname,
      color: parsed.color ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePartnerViews(id);
  return { ok: true as const };
}

export async function archivePartnerAction(id: string, archive: boolean) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { error } = await supabase
    .from("partners")
    .update({ is_active: !archive })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews(id);
  return { ok: true as const };
}

export async function deletePartnerAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await ensureDefaultPartner(user.id);
  revalidatePartnerViews();
  return { ok: true as const };
}

export async function setDefaultPartnerAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const { data: row, error: fetchErr } = await supabase
    .from("partners")
    .select("id,is_active")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return { ok: false as const, error: fetchErr.message };
  if (!row) return { ok: false as const, error: "伴侣不存在" };
  if (!row.is_active) return { ok: false as const, error: "归档伴侣不能设为默认" };

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

  revalidatePartnerViews(id);
  return { ok: true as const };
}

export async function savePartnerPhotoAction(input: {
  partnerId: string;
  photoUrl: string;
}) {
  const payload = z
    .object({
      partnerId: z.string().uuid(),
      photoUrl: z.string().url(),
    })
    .parse(input);

  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  // Verify the partner exists and user has access
  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id,user_id,source,bound_user_id")
    .eq("id", payload.partnerId)
    .maybeSingle();
  if (partnerErr) return { ok: false as const, error: partnerErr.message };
  if (!partner) return { ok: false as const, error: "伴侣不存在或无权限" };

  // Check if user owns this partner or it's a bound partner they can access
  const canAccess = partner.user_id === user.id || (
    partner.source === "bound" && partner.bound_user_id === user.id
  );
  if (!canAccess) return { ok: false as const, error: "无权限访问此伴侣" };

  const { error } = await supabase
    .from("partner_photos")
    .insert({
      user_id: user.id,
      partner_id: payload.partnerId,
      photo_url: payload.photoUrl,
    });

  if (error?.code === "42P01") {
    return { ok: false as const, error: "数据库尚未升级，请先执行最新迁移。" };
  }
  if (error?.code !== "23505" && error) {
    return { ok: false as const, error: error.message };
  }

  await createPartnerMemoryItemAction(
    partner.source === "bound" && partner.bound_user_id
      ? { boundUserId: partner.bound_user_id, itemType: "photo", title: "Uploaded Photo", photoUrl: payload.photoUrl }
      : { partnerId: payload.partnerId, itemType: "photo", title: "Uploaded Photo", photoUrl: payload.photoUrl }
  );

  revalidatePartnerViews(payload.partnerId);
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
  const payload = memoryItemSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  if (payload.partnerId) {
    const { data: partner, error: partnerErr } = await supabase
      .from("partners")
      .select("id")
      .eq("id", payload.partnerId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (partnerErr) return { ok: false as const, error: partnerErr.message };
    if (!partner) return { ok: false as const, error: "伴侣不存在或无权限" };
  }

  if (payload.boundUserId) {
    const { data: bindingRow, error: bindingErr } = await supabase
      .from("couple_bindings")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${payload.boundUserId}),and(user1_id.eq.${payload.boundUserId},user2_id.eq.${user.id})`)
      .limit(1);
    if (bindingErr) return { ok: false as const, error: bindingErr.message };
    if (!bindingRow || bindingRow.length === 0) {
      return { ok: false as const, error: "当前未与该账号绑定" };
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
    return { ok: false as const, error: "数据库尚未升级，请先执行最新迁移。" };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/partners");
  if (payload.partnerId) revalidatePath(`/partners/${payload.partnerId}`);
  if (payload.boundUserId) {
    // Revalidate all partner pages that may display this bound user's memories.
    // We can't know the exact partner UUID from here, so revalidate the whole partners segment.
    revalidatePath("/partners", "layout");
  }
  return { ok: true as const };
}
