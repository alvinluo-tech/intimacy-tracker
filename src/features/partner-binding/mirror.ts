import type { SupabaseClient } from "@supabase/supabase-js";

function makeBoundNickname(profile: { display_name: string | null; email: string | null }) {
  return profile.display_name || profile.email || "Bound Partner";
}

function getAvatarUrl(profile: { avatar_url: string | null } | undefined): string | null {
  return profile?.avatar_url ?? null;
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
      .select("id,display_name,email,avatar_url")
      .in("id", boundUserIds);
    if (profileErr) throw profileErr;

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; display_name: string | null; email: string | null; avatar_url: string | null }>).map(
        (p) => [p.id, p]
      )
    );

    // Batch upsert: build all rows, then upsert in one call
    const upsertRows = boundUserIds.map((boundUserId) => {
      const profile = profileMap.get(boundUserId);
      const nickname = makeBoundNickname({
        display_name: profile?.display_name ?? null,
        email: profile?.email ?? null,
      });
      return {
        user_id: userId,
        nickname,
        avatar_url: getAvatarUrl(profile),
        color: null,
        is_active: true,
        status: "active" as const,
        is_default: false,
        source: "bound" as const,
        bound_user_id: boundUserId,
      };
    });

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("partners")
        .upsert(upsertRows, { onConflict: "user_id,bound_user_id" });
      if (upsertErr && upsertErr.code !== "23505") throw upsertErr;
    }
  }

  const boundSet = new Set(boundUserIds);
  const staleIds = (existingRows ?? [])
    .filter((row) => row.bound_user_id && !boundSet.has(row.bound_user_id as string))
    .map((row) => row.id as string);

  if (staleIds.length) {
    await supabase
      .from("partners")
      .update({ status: "archived", is_active: false, is_default: false })
      .in("id", staleIds)
      .eq("user_id", userId);
  }
}
