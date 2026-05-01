import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit config for API routes
const API_RATE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  "/api/export-csv": { windowMs: 60_000, max: 3 }, // 3 exports per minute
};

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/confirm") ||
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

  request.headers.set("x-pathname", pathname);

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

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const rule = API_RATE_LIMITS[pathname];
    if (rule && user) {
      const key = `api:${pathname}:${user.id}`;
      const result = rateLimit(key, rule);
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }
  }

  // Read from JWT user_metadata — no DB query
  const requirePin = Boolean(user?.user_metadata?.require_pin);
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
