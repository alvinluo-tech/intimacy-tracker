"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { randomInt } from "node:crypto";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";
import { sendPinResetCodeEmail } from "@/lib/email/resend";

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

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_DURATIONS = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hr

export async function verifyPinAction(pin: string) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_hash,pin_attempts,pin_locked_until")
    .eq("id", user.id)
    .single();

  if (error) return { ok: false as const, error: error.message };

  // Check lockout
  const lockedUntil = data.pin_locked_until ? new Date(data.pin_locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
    return { ok: false as const, error: `PIN 已锁定，请 ${remaining} 秒后再试` };
  }

  const hasPin = Boolean(data.pin_hash);
  if (!hasPin) {
    return { ok: true as const };
  }

  const valid = verifyPin(pin, data.pin_hash as string | null);
  if (!valid) {
    const attempts = (data.pin_attempts ?? 0) + 1;
    const lockedUntil = attempts >= MAX_PIN_ATTEMPTS
      ? new Date(Date.now() + PIN_LOCKOUT_DURATIONS[Math.min(Math.floor(attempts / MAX_PIN_ATTEMPTS) - 1, PIN_LOCKOUT_DURATIONS.length - 1)] * 1000).toISOString()
      : null;

    await supabase
      .from("profiles")
      .update({
        pin_attempts: attempts,
        pin_locked_until: lockedUntil,
      })
      .eq("id", user.id);

    if (lockedUntil) {
      return { ok: false as const, error: "PIN 已锁定，请稍后再试" };
    }
    return { ok: false as const, error: `PIN 不正确（剩余 ${MAX_PIN_ATTEMPTS - attempts} 次机会）` };
  }

  // Reset attempts on success
  await supabase
    .from("profiles")
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq("id", user.id);

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

export async function requestPinResetCodeAction() {
  const user = await getServerUser();
  if (!user?.email) return { ok: false as const, error: "无法获取邮箱" };

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_reset_code_sent_at,pin_reset_code,pin_reset_code_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!profile?.require_pin) {
    return { ok: false as const, error: "PIN 保护未开启" };
  }

  // Rate limit: 60s between requests
  if (profile.pin_reset_code_sent_at) {
    const sentAt = new Date(profile.pin_reset_code_sent_at).getTime();
    if (Date.now() - sentAt < 60_000) {
      return { ok: false as const, error: "请 60 秒后再试" };
    }
  }

  const code = String(randomInt(0, 999999)).padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  const { error: saveErr } = await supabase
    .from("profiles")
    .update({
      pin_reset_code: code,
      pin_reset_code_sent_at: now.toISOString(),
      pin_reset_code_expires_at: expiresAt.toISOString(),
      pin_reset_attempts: 0,
    })
    .eq("id", user.id);

  if (saveErr) return { ok: false as const, error: saveErr.message };

  try {
    await sendPinResetCodeEmail(user.email, code);
  } catch {
    return { ok: false as const, error: "验证码发送失败，请检查邮件配置" };
  }

  revalidatePath("/lock");
  return { ok: true as const };
}

export async function verifyPinResetCodeAction(code: string) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_reset_code,pin_reset_code_expires_at,pin_reset_attempts")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!profile?.require_pin) {
    return { ok: false as const, error: "PIN 保护未开启" };
  }

  if (!profile.pin_reset_code || !profile.pin_reset_code_expires_at) {
    return { ok: false as const, error: "未请求验证码，请先发送" };
  }

  // Check expiry
  if (new Date(profile.pin_reset_code_expires_at) < new Date()) {
    return { ok: false as const, error: "验证码已过期，请重新发送" };
  }

  // Check attempts
  const attempts = (profile.pin_reset_attempts ?? 0) + 1;
  if (attempts > 5) {
    return { ok: false as const, error: "验证码错误次数过多，请重新发送" };
  }

  await supabase
    .from("profiles")
    .update({ pin_reset_attempts: attempts })
    .eq("id", user.id);

  if (profile.pin_reset_code !== code) {
    return { ok: false as const, error: `验证码不正确（剩余 ${5 - attempts} 次机会）` };
  }

  // Success: clear PIN and reset code fields
  await supabase
    .from("profiles")
    .update({
      pin_hash: null,
      require_pin: false,
      pin_attempts: 0,
      pin_locked_until: null,
      pin_reset_code: null,
      pin_reset_code_sent_at: null,
      pin_reset_code_expires_at: null,
      pin_reset_attempts: 0,
    })
    .eq("id", user.id);

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  revalidatePath("/lock");
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
