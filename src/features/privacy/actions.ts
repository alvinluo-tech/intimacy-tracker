"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";

const locationModeSchema = z.enum(["off", "city", "exact"]);

export async function savePrivacySettingsAction(input: {
  timezone: string;
  locationMode: "off" | "city" | "exact";
  requirePin: boolean;
  newPin?: string;
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

  if (normalizedPin.length > 0) {
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

  if (!data.require_pin) {
    return { ok: true as const };
  }

  const valid = verifyPin(pin, data.pin_hash as string | null);
  if (!valid) return { ok: false as const, error: "PIN 不正确" };

  return { ok: true as const };
}
