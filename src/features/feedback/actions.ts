"use server";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SubmitFeedbackResult {
  ok: boolean;
  error?: string;
}

export async function submitFeedbackAction(params: {
  category: "bug" | "suggestion" | "chat";
  content: string;
  imageData?: string;
}): Promise<SubmitFeedbackResult> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { ok: false, error: "You must be logged in to submit feedback" };
    }

    const supabase = await createSupabaseServerClient();

    let imageUrl: string | null = null;

    // Upload image if provided
    if (params.imageData) {
      const base64Data = params.imageData.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;

      const { error: uploadError } = await supabase.storage
        .from("feedback")
        .upload(fileName, buffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        return { ok: false, error: "Failed to upload image" };
      }

      const { data: publicData } = supabase.storage.from("feedback").getPublicUrl(fileName);
      imageUrl = publicData.publicUrl;
    }

    // Insert feedback record
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      category: params.category,
      content: params.content,
      image_url: imageUrl,
    });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return { ok: false, error: "Failed to submit feedback" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Feedback submission error:", error);
    return { ok: false, error: "An unexpected error occurred" };
  }
}
