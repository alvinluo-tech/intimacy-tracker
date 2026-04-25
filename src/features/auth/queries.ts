import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

