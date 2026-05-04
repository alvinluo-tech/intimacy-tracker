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
      .select("id, nickname, color, is_default")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("nickname", { ascending: true });

    if (error) throw error;

    const partnersWithCount = await Promise.all(
      (partners || []).map(async (partner) => {
        const { count } = await supabase
          .from("encounters")
          .select("id", { count: "exact", head: true })
          .eq("partner_id", partner.id);

        return {
          ...partner,
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
