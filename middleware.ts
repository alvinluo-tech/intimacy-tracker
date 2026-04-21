import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/callback")
  );
}

function isGuestOnlyPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

function getSafeNext(pathname: string, search: string) {
  const raw = `${pathname}${search}` || "/dashboard";
  return encodeURIComponent(raw);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isPublic = isPublicPath(pathname);
  const isGuestOnly = isGuestOnlyPath(pathname);
  const isLockPage = pathname === "/lock";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!user && isPublic) {
    return response;
  }

  if (user && isGuestOnly) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("require_pin")
    .eq("id", user!.id)
    .maybeSingle();

  const requirePin = Boolean(profile?.require_pin);
  const unlocked = request.cookies.get(PIN_UNLOCK_COOKIE)?.value === "1";

  if (requirePin && !unlocked && !isLockPage) {
    const lockUrl = new URL("/lock", request.url);
    lockUrl.searchParams.set("next", getSafeNext(pathname, request.nextUrl.search));
    return NextResponse.redirect(lockUrl);
  }

  if (isLockPage && (!requirePin || unlocked)) {
    const next = request.nextUrl.searchParams.get("next");
    const target =
      next && next.startsWith("/")
        ? decodeURIComponent(next)
        : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
