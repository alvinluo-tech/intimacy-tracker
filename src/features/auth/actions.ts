"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/resend";

function getString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (/email.*confirm|not.*confirmed/i.test(error.message)) {
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");
  const supabase = await createSupabaseServerClient();
  const appUrl = getAppUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  if (!email) redirect("/verify-email?error=缺少邮箱地址");
  const supabase = await createSupabaseServerClient();
  const appUrl = getAppUrl();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  if (!email) {
    redirect("/forgot-password?error=请输入邮箱");
  }

  const appUrl = getAppUrl();
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
      },
    });
    if (!error && data?.properties?.action_link) {
      await sendPasswordResetEmail(email, data.properties.action_link);
    }
  } catch {
    // Do not leak account existence or transport errors.
  }

  redirect(`/forgot-password?sent=1&email=${encodeURIComponent(email)}`);
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "密码至少 8 位"),
    confirmPassword: z.string().min(8, "请确认密码"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次密码输入不一致",
  });

export async function updatePasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: getString(formData, "password"),
    confirmPassword: getString(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "密码校验失败";
    redirect(`/reset-password?error=${encodeURIComponent(msg)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?error=重置链接已失效，请重新申请");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=密码已更新，请重新登录");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);
  redirect("/login");
}
