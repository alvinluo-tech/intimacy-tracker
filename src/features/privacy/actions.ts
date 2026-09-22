"use server";

import { getTranslations } from "next-intl/server";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { randomInt } from "node:crypto";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPin, isValidPin, verifyPin, getHashPrefix, hashResetCode, verifyResetCode } from "@/lib/auth/pin";
import {
  MAX_PIN_ATTEMPTS,
  MAX_RESET_CODE_ATTEMPTS,
  incrementAttemptCounterAtomically,
  lockoutSecondsFor,
} from "@/lib/auth/pin-lockout";
import { PIN_UNLOCK_COOKIE, PIN_UNLOCK_TTL_SECONDS, createPinUnlockToken } from "@/lib/auth/pin-session";
import { sendPinResetCodeEmail } from "@/lib/email/resend";
import { rateLimit } from "@/lib/rate-limit";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

const locationModeSchema = z.enum(["off", "city", "exact"]);

export async function savePrivacySettingsAction(input: {
  timezone: string;
  locationMode: "off" | "city" | "exact";
  requirePin: boolean;
  newPin?: string;
  removePin?: boolean;
  currentPin?: string;
}) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const supabase = await createSupabaseServerClient();
  const locationMode = locationModeSchema.parse(input.locationMode);
  const timezone = input.timezone.trim() || "UTC";

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("pin_hash,require_pin")
    .eq("id", user.id)
    .single();
  if (profileErr) return { ok: false as const, error: profileErr.message };

  let nextPinHash = profile.pin_hash as string | null;
  const previousRequirePin = Boolean(profile.require_pin);
  const normalizedPin = input.newPin?.trim() ?? "";
  const normalizedCurrentPin = input.currentPin?.trim() ?? "";

  if (input.removePin) {
    if (nextPinHash && !verifyPin(normalizedCurrentPin, nextPinHash)) {
      return { ok: false as const, error: t("unauthorized") };
    }
    nextPinHash = null;
  }

  if (!input.removePin && normalizedPin.length > 0) {
    if (!isValidPin(normalizedPin)) {
      return { ok: false as const, error: t("pinLength") };
    }
    nextPinHash = hashPin(normalizedPin);
  }

  if (input.requirePin && !nextPinHash) {
    return { ok: false as const, error: t("pinRequired") };
  }

  // pin_hash is excluded from the authenticated column grants (0050) so the
  // account holder cannot clear their own PIN via the public API — PIN writes
  // always go through the service-role client.
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      timezone,
      location_mode: locationMode,
      require_pin: input.requirePin,
      pin_hash: nextPinHash,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  // Sync require_pin to JWT user_metadata so middleware can read it without a DB query
  const { error: metaError } = await supabase.auth.updateUser({
    data: { require_pin: input.requirePin },
  });
  if (metaError) console.error("Failed to sync require_pin to user_metadata:", metaError);

  // Only PIN-related changes invalidate the prior unlock session — saving a
  // timezone alone must not lock the user out.
  const pinSettingsChanged =
    input.removePin === true ||
    normalizedPin.length > 0 ||
    input.requirePin !== previousRequirePin;
  if (pinSettingsChanged) {
    const cookieStore = await cookies();
    cookieStore.delete(PIN_UNLOCK_COOKIE);
  }

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.layout(user.id), REVALIDATE_PROFILE);

  return { ok: true as const };
}

export async function verifyPinAction(pin: string) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  // A server action is a public POST endpoint. This one had no throttle at all,
  // leaving the attempt counter as the only brake — and it bypassed easily.
  const limited = await rateLimit(`pin-verify:${user.id}`, { windowMs: 60_000, max: 10 });
  if (!limited.allowed) return { ok: false as const, error: t("tryAgain") };

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
    return { ok: false as const, error: `${t("pinRequired")} (${remaining}s)` };
  }

  const hasPin = Boolean(data.pin_hash);
  if (!hasPin) {
    return { ok: true as const };
  }

  const valid = verifyPin(pin, data.pin_hash as string | null);
  if (!valid) {
    // Lockout state is security data — written through the service-role client
    // so the account holder cannot reset it directly via the PostgREST API
    // (profiles column grants exclude pin_attempts/pin_locked_until).
    const admin = createSupabaseAdminClient();
    const attempts = await incrementAttemptCounterAtomically(admin, user.id, "pin_attempts");
    if (attempts === null) {
      // The guess was not recorded; deny rather than hand back a free attempt.
      return { ok: false as const, error: t("tryAgain") };
    }

    if (attempts >= MAX_PIN_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + lockoutSecondsFor(attempts, MAX_PIN_ATTEMPTS) * 1000
      ).toISOString();
      await admin
        .from("profiles")
        .update({ pin_locked_until: lockedUntil })
        .eq("id", user.id);
      return { ok: false as const, error: t("pinRequired") };
    }

    return {
      ok: false as const,
      error: `${t("unauthorized")} (${MAX_PIN_ATTEMPTS - attempts} tries left)`,
    };
  }

  // Reset attempts on success
  const updateFields: Record<string, unknown> = { pin_attempts: 0, pin_locked_until: null };

  // Auto-upgrade v1 HMAC hash to v2 scrypt hash
  if (data.pin_hash && getHashPrefix(data.pin_hash as string) === "v1:") {
    updateFields.pin_hash = hashPin(pin);
  }

  const adminOnSuccess = createSupabaseAdminClient();
  await adminOnSuccess
    .from("profiles")
    .update(updateFields)
    .eq("id", user.id);

  const unlockToken = await createPinUnlockToken(user.id);
  if (!unlockToken) {
    console.error("verifyPinAction: no signing secret for PIN unlock cookie");
    return { ok: false as const, error: t("operationFailed") };
  }

  const cookieStore = await cookies();
  cookieStore.set(PIN_UNLOCK_COOKIE, unlockToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_UNLOCK_TTL_SECONDS, // 24 hours
  });

  return { ok: true as const };
}

export async function lockAppAction() {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);
  const user = await getServerUser();
  if (user) revalidateTag(CACHE_TAGS.layout(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function requestPinResetCodeAction() {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user?.email) return { ok: false as const, error: t("emailRequired") };

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_reset_code_sent_at,pin_reset_code,pin_reset_code_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!profile?.require_pin) {
    return { ok: false as const, error: t("pinNotSet") };
  }

  // Rate limit: 60s between requests
  if (profile.pin_reset_code_sent_at) {
    const sentAt = new Date(profile.pin_reset_code_sent_at).getTime();
    if (Date.now() - sentAt < 60_000) {
      return { ok: false as const, error: t("tryAgain") };
    }
  }

  const code = String(randomInt(0, 999999)).padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  // pin_reset_* columns are excluded from the authenticated column grants
  // (0050) — reset state must be written through the service-role client.
  const admin = createSupabaseAdminClient();
  const { error: saveErr } = await admin
    .from("profiles")
    .update({
      pin_reset_code: hashResetCode(code),
      pin_reset_code_sent_at: now.toISOString(),
      pin_reset_code_expires_at: expiresAt.toISOString(),
      pin_reset_attempts: 0,
    })
    .eq("id", user.id);

  if (saveErr) return { ok: false as const, error: saveErr.message };

  try {
    await sendPinResetCodeEmail(user.email, code);
  } catch {
    return { ok: false as const, error: t("operationFailed") };
  }

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function verifyPinResetCodeAction(code: string) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  // Six digits is 10^6 guesses; the attempt budget is the only brake, so this
  // path gets its own throttle as well.
  const limited = await rateLimit(`pin-reset:${user.id}`, { windowMs: 15 * 60_000, max: 10 });
  if (!limited.allowed) return { ok: false as const, error: t("tryAgain") };

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("require_pin,pin_reset_code,pin_reset_code_expires_at,pin_reset_attempts")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!profile?.require_pin) {
    return { ok: false as const, error: t("pinNotSet") };
  }

  if (!profile.pin_reset_code || !profile.pin_reset_code_expires_at) {
    return { ok: false as const, error: t("tryAgain") };
  }

  // Check expiry
  if (new Date(profile.pin_reset_code_expires_at) < new Date()) {
    return { ok: false as const, error: t("tryAgain") };
  }

  const admin = createSupabaseAdminClient();

  // Counted before the comparison so a correct guess that arrives after the
  // budget is spent is still refused, and so parallel guesses cannot all count
  // as the same attempt.
  const attempts = await incrementAttemptCounterAtomically(
    admin,
    user.id,
    "pin_reset_attempts"
  );
  if (attempts === null) return { ok: false as const, error: t("tryAgain") };
  if (attempts > MAX_RESET_CODE_ATTEMPTS) {
    return { ok: false as const, error: t("tryAgain") };
  }

  if (!verifyResetCode(code, profile.pin_reset_code)) {
    return {
      ok: false as const,
      error: `${t("unauthorized")} (${MAX_RESET_CODE_ATTEMPTS - attempts} tries left)`,
    };
  }

  // Sync require_pin=false to JWT user_metadata
  const { error: metaError } = await supabase.auth.updateUser({
    data: { require_pin: false },
  });
  if (metaError) console.error("Failed to clear require_pin from user_metadata:", metaError);

  // Success: clear PIN and reset code fields (PIN state is service-role-only,
  // see 0050 column grants)
  await admin
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

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.layout(user.id), REVALIDATE_PROFILE);

  return { ok: true as const };
}

export async function saveProfileAction(input: { displayName: string; avatarUrl: string | null }) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false as const, error: t("displayNameLength") };
  }
  if (displayName.length > 32) {
    return { ok: false as const, error: t("displayNameLength") };
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
    return { ok: false as const, error: t("databaseMigrationRequired") };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}

export async function saveTimezoneAction(timezone: string) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: t("notLoggedIn") };

  const tz = timezone.trim() || "UTC";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ timezone: tz })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidateTag(CACHE_TAGS.settings(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.timeline(user.id), REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.dashboard(user.id), REVALIDATE_PROFILE);
  return { ok: true as const };
}
