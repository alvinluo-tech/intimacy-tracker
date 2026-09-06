import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

function getAppBaseUrl(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return request.url;
}

export async function GET(request: NextRequest) {
  const t = await getTranslations("errors");
  const url = new URL(request.url);
  const baseUrl = getAppBaseUrl(request);
  const code = url.searchParams.get("code");
  const next = sanitizeRedirectPath(url.searchParams.get("next"));
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const type = url.searchParams.get("type");

  if (authError) {
    // Expired/invalid email links (especially password-recovery links) should
    // land users back on the flow's entry point with a localized message,
    // not dump Supabase's raw English error onto /login.
    const errorCode = url.searchParams.get("error_code");
    const isExpired =
      errorCode === "otp_expired" ||
      authError.toLowerCase().includes("expired") ||
      authError.toLowerCase().includes("invalid");
    const target = type === "recovery" || isExpired ? "/forgot-password" : "/login";
    const message = isExpired ? t("linkExpired") : authError;
    return NextResponse.redirect(new URL(`${target}?error=${encodeURIComponent(message)}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(t("missingAuthParams"))}`, baseUrl));
  }

  // For password reset flow, don't auto-login - redirect to reset-password page
  if (type === "recovery" || next === "/reset-password") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const expired = error.message.toLowerCase().includes("expired");
      const message = expired ? t("linkExpired") : error.message;
      return NextResponse.redirect(
        new URL(`/forgot-password?error=${encodeURIComponent(message)}`, baseUrl)
      );
    }

    return NextResponse.redirect(new URL("/reset-password", baseUrl));
  }

  // For other flows (email verification, magic link), proceed with normal login
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
