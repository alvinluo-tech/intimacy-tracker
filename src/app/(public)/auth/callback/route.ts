import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirect(nextParam: string | null, fallback = "/dashboard") {
  if (!nextParam) return fallback;
  return nextParam.startsWith("/") ? nextParam : fallback;
}

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
  const url = new URL(request.url);
  const baseUrl = getAppBaseUrl(request);
  const code = url.searchParams.get("code");
  const next = getSafeRedirect(url.searchParams.get("next"));
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=缺少认证参数", baseUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
