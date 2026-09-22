import { NextResponse } from "next/server";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDynamicRenderingBailout } from "@/lib/utils/dynamic-bailout";

type PartnerWithCount = {
  id: string;
  nickname: string | null;
  color: string | null;
  is_default: boolean | null;
  status?: string | null;
  encounter_count?: number | null;
};

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // Single aggregate RPC (mirrors bound-partner encounter counts onto the
    // caller's partner rows) — replaces the previous 2N+1 per-partner queries.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_manage_partners_rpc",
      { p_user_id: user.id }
    );

    if (!rpcError && Array.isArray(rpcData)) {
      const partners = (rpcData as PartnerWithCount[])
        .filter((p) => p.status !== "archived" && p.status !== "past")
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          color: p.color,
          is_default: p.is_default,
          encounterCount: p.encounter_count ?? 0,
        }));
      return NextResponse.json({ partners });
    }
    if (rpcError) {
      console.error("[Partners API] rpc failed, falling back:", rpcError);
    }

    // Fallback for databases without the RPC: per-partner count queries.
    const { data: partners, error } = await supabase
      .from("partners")
      .select("id, nickname, color, is_default, source, bound_user_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("nickname", { ascending: true });

    if (error) throw error;

    const partnersWithCount = await Promise.all(
      (partners || []).map(async (partner) => {
        const partnerIds = [partner.id];

        if (partner.source === "bound" && partner.bound_user_id) {
          const { data: mirror } = await supabase
            .from("partners")
            .select("id")
            .eq("user_id", partner.bound_user_id)
            .eq("bound_user_id", user.id)
            .eq("source", "bound")
            .maybeSingle();

          if (mirror) {
            partnerIds.push(mirror.id);
          }
        }

        const { count } = await supabase
          .from("encounters")
          .select("id", { count: "exact", head: true })
          .in("partner_id", partnerIds);

        return {
          id: partner.id,
          nickname: partner.nickname,
          color: partner.color,
          is_default: partner.is_default,
          encounterCount: count || 0,
        };
      })
    );

    return NextResponse.json({ partners: partnersWithCount });
  } catch (error) {
    if (isDynamicRenderingBailout(error)) throw error;
    console.error("[Partners API]", error);
    return NextResponse.json(
      { error: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}
