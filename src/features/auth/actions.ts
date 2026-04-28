"use server";

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
    redirect(`/login?error=${encodeURIComponent("邮箱或密码错误")}`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");
  const appUrl = getAppUrl();
  const admin = createSupabaseAdminClient();

  if (password.length < 6) {
    redirect(`/register?error=${encodeURIComponent("密码长度至少为 6 位")}`);
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
            "如果您已有账号，请直接登录"
          )}`
        );
      }
      redirect("/register?error=注册失败，请稍后重试");
    }

    const tokenHash = data?.properties?.hashed_token ?? null;
    if (!tokenHash) {
      redirect(`/register?error=${encodeURIComponent("未生成验证令牌，请稍后重试")}`);
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
    redirect(`/register?error=${encodeURIComponent("注册请求失败，请稍后重试")}`);
  }

  try {
    await sendSignupVerificationEmail(email, confirmationUrl);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(
      `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "账号已创建，但验证邮件发送失败，请检查发件邮箱配置后重试"
      )}`
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}



export async function resendVerificationClientAction(email: string): Promise<{ error?: string; success?: boolean }> {
  if (!email) return { error: "缺少邮箱地址" };
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
  const email = getString(formData, "email").trim();
  if (!email) {
    redirect("/forgot-password?error=请输入邮箱");
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

  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent("密码已更新，请重新登录")}`);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);
  redirect("/login");
}

export async function deleteAccountAction(password: string) {
  const user = await getServerUser();
  if (!user) redirect("/login?error=请重新登录");

  const supabase = await createSupabaseServerClient();

  // Verify password before deleting
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (signInError) {
    return { error: "密码不正确，无法删除账号" };
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
    return { error: "账号删除失败，请稍后重试" };
  }

  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect("/login?message=账号已永久删除");
}
