import type { SupabaseClient } from "@supabase/supabase-js";

function makeBoundNickname(profile: { display_name: string | null; email: string | null }) {
  return profile.display_name || profile.email || "Bound Partner";
}

export async function syncBoundPartnersForCurrentUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: bindings, error: bindErr } = await supabase
    .from("couple_bindings")
    .select("user1_id,user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (bindErr?.code === "42P01") return;
  if (bindErr) throw bindErr;

  const boundUserIds = Array.from(
    new Set(
      (bindings ?? [])
        .map((row: any) => (row.user1_id === userId ? row.user2_id : row.user1_id))
        .filter((id: string | null) => Boolean(id))
    )
  );

  const { data: existingRows, error: existingErr } = await supabase
    .from("partners")
    .select("id,bound_user_id")
    .eq("user_id", userId)
    .eq("source", "bound");

  if (existingErr?.code === "42703") {
    // source/bound_user_id columns are not available before migration 0011.
    return;
  }
  if (existingErr) throw existingErr;

  const existingByBound = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (row.bound_user_id) {
      existingByBound.set(row.bound_user_id as string, row.id as string);
    }
  }

  if (boundUserIds.length) {
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id,display_name,email")
      .in("id", boundUserIds);
    if (profileErr) throw profileErr;

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>).map(
        (p) => [p.id, p]
      )
    );

    for (const boundUserId of boundUserIds) {
      const profile = profileMap.get(boundUserId);
      const nickname = makeBoundNickname({
        display_name: profile?.display_name ?? null,
        email: profile?.email ?? null,
      });

      const existingId = existingByBound.get(boundUserId);
      if (existingId) {
        await supabase
          .from("partners")
          .update({
            nickname,
            is_active: true,
            source: "bound",
            bound_user_id: boundUserId,
          })
          .eq("id", existingId)
          .eq("user_id", userId);
      } else {
        await supabase.from("partners").insert({
          user_id: userId,
          nickname,
          color: null,
          is_active: true,
          is_default: false,
          source: "bound",
          bound_user_id: boundUserId,
        });
      }
    }
  }

  const boundSet = new Set(boundUserIds);
  const staleIds = (existingRows ?? [])
    .filter((row) => row.bound_user_id && !boundSet.has(row.bound_user_id as string))
    .map((row) => row.id as string);

  if (staleIds.length) {
    await supabase
      .from("partners")
      .update({ is_active: false, is_default: false })
      .in("id", staleIds)
      .eq("user_id", userId);
  }
}
