"use server";

import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerUser } from "@/features/auth/queries";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sendPasswordResetEmail,
  sendSignupVerificationEmail,
} from "@/lib/email/resend";

function getString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function buildEmailConfirmUrl(
  appUrl: string,
  tokenHash: string,
  type: "signup" | "magiclink" | "recovery",
  nextPath: string
) {
  const url = new URL("/auth/confirm", appUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

function isUnverifiedEmailError(message: string) {
  return /email.*confirm|not.*confirmed/i.test(message);
}

function isAlreadyRegisteredError(message: string) {
  return /already|exists|registered/i.test(message);
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  const target = email.toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return null;

    const matched = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (matched) return matched;
    if (data.users.length < perPage) break;
  }

  return null;
}

export async function signInAction(formData: FormData) {
  const t = await getTranslations("errors");
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isUnverifiedEmailError(error.message)) {
      redirect(
        `/verify-email?email=${encodeURIComponent(email)}&reason=login_unverified`
      );
    }
    redirect(`/login?error=${encodeURIComponent(t("unauthorized"))}`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const t = await getTranslations("errors");
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");
  const appUrl = getAppUrl();
  const admin = createSupabaseAdminClient();

  if (password.length < 6) {
    redirect(`/register?error=${encodeURIComponent(t("invalidData"))}`);
  }

  let confirmationUrl: string | null = null;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      if (isAlreadyRegisteredError(error.message)) {
        const existingUser = await findAuthUserByEmail(admin, email);
        if (existingUser && !existingUser.email_confirmed_at) {
          redirect(
            `/verify-email?email=${encodeURIComponent(email)}&from=register&unverified=1`
          );
        }
        // Already confirmed — generic message to avoid email enumeration
        redirect(
          `/login?error=${encodeURIComponent(
            t("alreadyRegistered")
          )}`
        );
      }
      redirect(`/register?error=${encodeURIComponent(t("operationFailed"))}`);
    }

    const tokenHash = data?.properties?.hashed_token ?? null;
    if (!tokenHash) {
      redirect(`/register?error=${encodeURIComponent(t("operationFailed"))}`);
    }
    confirmationUrl = buildEmailConfirmUrl(
      appUrl,
      tokenHash,
      "signup",
      "/dashboard"
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(`/register?error=${encodeURIComponent(t("operationFailed"))}`);
  }

  try {
    await sendSignupVerificationEmail(email, confirmationUrl);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(
      `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        t("operationFailed")
      )}`
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}



export async function resendVerificationClientAction(email: string): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations("errors");
  if (!email) return { error: t("emailRequired") };
  const appUrl = getAppUrl();
  const admin = createSupabaseAdminClient();

  try {
    const { data } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    const tokenHash = data?.properties?.hashed_token ?? null;
    if (tokenHash) {
      await sendSignupVerificationEmail(
        email,
        buildEmailConfirmUrl(appUrl, tokenHash, "magiclink", "/dashboard")
            );
    }
  } catch {
    // Swallow errors — never reveal whether email exists
  }

  return { success: true };
}

export async function requestPasswordResetAction(formData: FormData) {
  const t = await getTranslations("errors");
  const email = getString(formData, "email").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent(t("emailRequired"))}`);
  }

  const appUrl = getAppUrl();
  const admin = createSupabaseAdminClient();

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
      },
    });

    const tokenHash = data?.properties?.hashed_token ?? null;
    if (tokenHash) {
      await sendPasswordResetEmail(
        email,
        buildEmailConfirmUrl(appUrl, tokenHash, "recovery", "/reset-password")
              );
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
  }

  redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}`);
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export async function updatePasswordAction(formData: FormData) {
  const t = await getTranslations("errors");
  const parsed = resetPasswordSchema.safeParse({
    password: getString(formData, "password"),
    confirmPassword: getString(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? t("invalidData");
    redirect(`/reset-password?error=${encodeURIComponent(msg)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?error=${encodeURIComponent(t("invalidData"))}`);
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent(t("passwordUpdated"))}`);
}

export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<{ error: string } | { ok: true }> {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) return { error: t("notLoggedIn") };

  if (newPassword.length < 8) {
    return { error: t("invalidData") };
  }

  const supabase = await createSupabaseServerClient();

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });
  if (signInError) {
    return { error: t("unauthorized") };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return { error: updateError.message };
  }

  return { ok: true as const };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);
  redirect("/login");
}

export async function deleteAccountAction(password: string) {
  const t = await getTranslations("errors");
  const user = await getServerUser();
  if (!user) redirect(`/login?error=${encodeURIComponent(t("notLoggedIn"))}`);

  const supabase = await createSupabaseServerClient();

  // Verify password before deleting
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (signInError) {
    return { error: t("unauthorized") };
  }

  const admin = createSupabaseAdminClient();

  // Delete storage objects for user (avatars, partner photos, encounter photos, feedback)
  const storageBuckets = ["avatars", "partner-photos", "encounter-photos", "feedback"];
  for (const bucket of storageBuckets) {
    const { data: files } = await admin.storage.from(bucket).list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await admin.storage.from(bucket).remove(paths);
    }
  }

  // Delete auth user — ON DELETE CASCADE handles all DB records
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: t("operationFailed") };
  }

  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect(`/login?message=${encodeURIComponent(t("accountDeleted"))}`);
}
