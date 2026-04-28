import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptNotes } from "@/lib/encryption/notes";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { encrypted, encounterId } = await request.json();

    if (!encrypted || !encounterId) {
      return NextResponse.json({ error: "Missing encrypted data or encounterId" }, { status: 400 });
    }

    // Verify the user owns this encounter or is the bound partner with share permission
    const { data: encounter, error: encErr } = await supabase
      .from("encounters")
      .select("user_id, share_notes_with_partner")
      .eq("id", encounterId)
      .single();

    if (encErr || !encounter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOwner = encounter.user_id === user.id;
    const isSharedPartner = encounter.share_notes_with_partner === true;

    // Allow if owner, or if notes are shared with partner
    if (!isOwner) {
      if (!isSharedPartner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Check if the current user is the bound partner
      const { data: partnerLink } = await supabase
        .from("partners")
        .select("id")
        .eq("bound_user_id", encounter.user_id)
        .eq("user_id", user.id)
        .eq("source", "bound")
        .maybeSingle();
      if (!partnerLink) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let encryptedPayload = encrypted;
    if (typeof encrypted === 'string') {
      try {
        encryptedPayload = JSON.parse(encrypted);
      } catch {
        return NextResponse.json({ error: "Invalid encrypted data format" }, { status: 400 });
      }
    }

    const decrypted = decryptNotes(encryptedPayload);
    return NextResponse.json({ decrypted });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
}
