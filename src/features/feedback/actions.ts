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
  imageUrl?: string | null;
}): Promise<SubmitFeedbackResult> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { ok: false, error: "You must be logged in to submit feedback" };
    }

    const supabase = await createSupabaseServerClient();

    // Insert feedback record
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      category: params.category,
      content: params.content,
      image_url: params.imageUrl || null,
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
