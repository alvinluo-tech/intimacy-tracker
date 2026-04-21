import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set<EmailOtpType>(["signup", "magiclink", "recovery"]);

function getAppBaseUrl(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return request.url;
}

function getSafeNext(nextParam: string | null, fallback: string) {
  if (!nextParam) return fallback;
  return nextParam.startsWith("/") ? nextParam : fallback;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = getAppBaseUrl(request);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNext(
    url.searchParams.get("next"),
    type === "recovery" ? "/reset-password" : "/dashboard"
  );

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.redirect(
      new URL("/login?error=缺少认证参数", baseUrl)
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    const target =
      type === "recovery"
        ? `/forgot-password?error=${encodeURIComponent(error.message)}`
        : `/verify-email?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(new URL(target, baseUrl));
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
