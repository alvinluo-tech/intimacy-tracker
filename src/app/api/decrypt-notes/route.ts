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

    const { encrypted } = await request.json();

    console.log('API: Received encrypted data:', encrypted);

    if (!encrypted) {
      return NextResponse.json({ error: "Missing encrypted data" }, { status: 400 });
    }

    // Parse encrypted data if it's a string
    let encryptedPayload = encrypted;
    if (typeof encrypted === 'string') {
      try {
        encryptedPayload = JSON.parse(encrypted);
      } catch (e) {
        console.error('Failed to parse encrypted string:', e);
        return NextResponse.json({ error: "Invalid encrypted data format" }, { status: 400 });
      }
    }

    const decrypted = decryptNotes(encryptedPayload);

    console.log('API: Decrypted result:', decrypted);

    return NextResponse.json({ decrypted });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json({ error: "Decryption failed", details: String(error) }, { status: 500 });
  }
}
