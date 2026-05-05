import { NextResponse } from "next/server";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

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
        let partnerIds = [partner.id];

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
    console.error("[Partners API]", error);
    return NextResponse.json(
      { error: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}
