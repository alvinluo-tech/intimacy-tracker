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

    // Verify the user owns this encounter
    const { data: encounter, error: encErr } = await supabase
      .from("encounters")
      .select("user_id")
      .eq("id", encounterId)
      .single();

    if (encErr || !encounter || encounter.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
