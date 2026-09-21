import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-deduplicated current user. With @supabase/ssr every auth.getUser()
 * is a network round trip, and a single page render used to make 2-5 of them
 * (layout + queries) — React cache() collapses them to one per request.
 */
export const getServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});
