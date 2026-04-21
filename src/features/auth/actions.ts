"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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
        redirect(
          `/register?error=${encodeURIComponent("该邮箱已注册，请直接登录")}`
        );
      }
      redirect(`/register?error=${encodeURIComponent(error.message)}`);
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      redirect(`/register?error=${encodeURIComponent("未生成验证链接，请稍后重试")}`);
    }

    await sendSignupVerificationEmail(email, actionLink);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(`/register?error=${encodeURIComponent("注册邮件发送失败，请稍后重试")}`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PIN_UNLOCK_COOKIE);

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}

export async function resendVerificationAction(formData: FormData) {
  const email = getString(formData, "email").trim();
  if (!email) redirect("/verify-email?error=缺少邮箱地址");
  const appUrl = getAppUrl();
  const admin = createSupabaseAdminClient();

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      if (/not\s*found|no user|user.*does not exist/i.test(error.message)) {
        redirect(
          `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
            "该邮箱尚未注册，请先注册"
          )}`
        );
      }
      redirect(
        `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
          "验证邮件发送失败，请稍后重试"
        )}`
      );
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      redirect(
        `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
          "未生成验证链接，请稍后重试"
        )}`
      );
    }

    await sendSignupVerificationEmail(email, actionLink);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(
      `/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "验证邮件发送失败，请稍后重试"
      )}`
    );
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
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

    if (error) {
      if (/not\s*found|no user|user.*does not exist/i.test(error.message)) {
        redirect(
          `/forgot-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
            "该邮箱尚未注册"
          )}`
        );
      }
      redirect(
        `/forgot-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
          "重置邮件发送失败，请稍后重试"
        )}`
      );
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      redirect(
        `/forgot-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
          "未生成重置链接，请稍后重试"
        )}`
      );
    }

    await sendPasswordResetEmail(email, actionLink);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(
      `/forgot-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "重置邮件发送失败，请稍后重试"
      )}`
    );
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
