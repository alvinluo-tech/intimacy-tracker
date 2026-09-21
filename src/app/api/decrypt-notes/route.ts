import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptNotes } from "@/lib/encryption/notes";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimit(`decrypt-notes:${user.id}`, { windowMs: 60_000, max: 20 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Only the encounter id is accepted from the client. The ciphertext is
    // always fetched server-side — accepting client-supplied ciphertext would
    // turn this endpoint into a decryption oracle.
    const { encounterId } = await request.json();

    if (!encounterId || typeof encounterId !== "string") {
      return NextResponse.json({ error: "Missing encounterId" }, { status: 400 });
    }

    const { data: encounter, error: encErr } = await supabase
      .from("encounters")
      .select("user_id, notes_encrypted, share_notes_with_partner")
      .eq("id", encounterId)
      .single();

    if (encErr || !encounter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOwner = encounter.user_id === user.id;

    if (!isOwner) {
      if (encounter.share_notes_with_partner !== true) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Verify the current user is the bound partner
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

    if (!encounter.notes_encrypted) {
      return NextResponse.json({ decrypted: null });
    }

    // Notes are always decrypted with the encounter owner's user id (the key salt)
    let payload: unknown = encounter.notes_encrypted;
    while (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return NextResponse.json({ error: "Invalid encrypted data format" }, { status: 400 });
      }
    }

    let decrypted: string | null = null;
    try {
      decrypted = decryptNotes(payload, encounter.user_id);
    } catch (decryptError) {
      console.error("decryptNotes threw:", decryptError);
      return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
    }
    return NextResponse.json({ decrypted });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
}
