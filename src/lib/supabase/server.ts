import { cache } from "react";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { isDynamicRenderingBailout } from "@/lib/utils/dynamic-bailout";

export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (err) {
          // Setting cookies throws during static rendering, which the prerender
          // bailout handles. Anything else is a dropped session refresh that
          // used to disappear silently, surfacing only as the user getting
          // logged out at an arbitrary later moment.
          if (!isDynamicRenderingBailout(err)) {
            console.error("[supabase] failed to persist session cookies:", err);
          }
        }
      },
    },
  });
});

/** Non-cached client — required for OAuth PKCE flow where cookies must be set fresh */
export async function createSupabaseServerClientUncached() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (err) {
          // Setting cookies throws during static rendering, which the prerender
          // bailout handles. Anything else is a dropped session refresh that
          // used to disappear silently, surfacing only as the user getting
          // logged out at an arbitrary later moment.
          if (!isDynamicRenderingBailout(err)) {
            console.error("[supabase] failed to persist session cookies:", err);
          }
        }
      },
    },
  });
}
