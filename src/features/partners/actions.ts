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
