"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";

const locationModeSchema = z.enum(["off", "city", "exact"]);

export async function savePrivacySettingsAction(input: {
  timezone: string;
  locationMode: "off" | "city" | "exact";
  requirePin: boolean;
  newPin?: string;
  removePin?: boolean;
  currentPin?: string;
}) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const supabase = await createSupabaseServerClient();
  const locationMode = locationModeSchema.parse(input.locationMode);
  const timezone = input.timezone.trim() || "UTC";

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("pin_hash")
    .eq("id", user.id)
    .single();
  if (profileErr) return { ok: false as const, error: profileErr.message };

  let nextPinHash = profile.pin_hash as string | null;
  const normalizedPin = input.newPin?.trim() ?? "";
  const normalizedCurrentPin = input.currentPin?.trim() ?? "";

  if (input.removePin) {
    if (nextPinHash && !verifyPin(normalizedCurrentPin, nextPinHash)) {
      return { ok: false as const, error: "当前 PIN 不正确" };
    }
    nextPinHash = null;
  }

  if (!input.removePin && normalizedPin.length > 0) {
    if (!isValidPin(normalizedPin)) {
      return { ok: false as const, error: "PIN 必须是 4 到 6 位数字" };
    }
    nextPinHash = hashPin(normalizedPin);
  }

  if (input.requirePin && !nextPinHash) {
    return { ok: false as const, error: "开启 PIN 保护前请先设置 PIN" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      timezone,
      location_mode: locationMode,
      require_pin: input.requirePin,
      pin_hash: nextPinHash,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  // Any privacy PIN setting change invalidates prior unlock session.
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  revalidatePath("/settings");
  revalidatePath("/settings/privacy");
  revalidatePath("/lock");

  return { ok: true as const };
}

export async function verifyPinAction(pin: string) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_hash")
    .eq("id", user.id)
    .single();

  if (error) return { ok: false as const, error: error.message };

  const hasPin = Boolean(data.pin_hash);
  if (!hasPin) {
    return { ok: true as const };
  }

  const valid = verifyPin(pin, data.pin_hash as string | null);
  if (!valid) return { ok: false as const, error: "PIN 不正确" };

  const cookieStore = await cookies();
  cookieStore.set(PIN_UNLOCK_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { ok: true as const };
}

export async function lockAppAction() {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveProfileAction(input: { displayName: string; avatarUrl: string | null }) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false as const, error: "显示名称不能为空" };
  }
  if (displayName.length > 32) {
    return { ok: false as const, error: "显示名称不能超过 32 个字符" };
  }

  const avatarUrl = input.avatarUrl?.trim() || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (error?.code === "42703") {
    return { ok: false as const, error: "数据库尚未升级，请先执行最新迁移。" };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/settings/privacy");
  return { ok: true as const };
}
