import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirect(nextParam: string | null, fallback = "/dashboard") {
  if (!nextParam) return fallback;
  return nextParam.startsWith("/") ? nextParam : fallback;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeRedirect(url.searchParams.get("next"));
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=缺少认证参数", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
